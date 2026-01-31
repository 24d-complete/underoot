#!/usr/bin/env bash

set -e

# Usage: ./get_texlive.sh <TARGET_DIR> <OS_NAME>

TARGET_DIR="$1"
OS_NAME="$2"

if [[ -z "$TARGET_DIR" || -z "$OS_NAME" ]]; then
  echo "Usage: $0 <TARGET_DIR> <OS_NAME>"
  exit 1
fi

# Use TeX Live 2024 final release - a frozen, stable version
# This avoids version mismatches between installer and repository
TL_REPOSITORY="https://ftp.tu-chemnitz.de/pub/tug/historic/systems/texlive/2024/tlnet-final"

# Detect installer filename
case "$OS_NAME" in
  osx|linux)
    INSTALLER_FILE="install-tl-unx.tar.gz"
    ;;
  windows)
    # Windows needs the zip package with Windows Perl bundled
    INSTALLER_FILE="install-tl.zip"
    ;;
  *)
    echo "Unsupported OS: $OS_NAME"
    exit 1
    ;;
esac

INSTALLER_URL="${TL_REPOSITORY}/${INSTALLER_FILE}"

echo ">>> Downloading TeX Live installer for $OS_NAME from $INSTALLER_URL..."
mkdir -p texlive_installer
cd texlive_installer

if ! curl -fsSL --connect-timeout 60 --max-time 600 -o "$INSTALLER_FILE" "$INSTALLER_URL"; then
  echo "ERROR: Failed to download TeX Live installer"
  exit 1
fi

echo ">>> Download successful"

# Extract the installer
if [[ "$OS_NAME" == "windows" ]]; then
  # Windows: use unzip
  unzip -q "$INSTALLER_FILE"
  # Find the extracted directory (install-tl-YYYYMMDD)
  INSTALL_DIR=$(find . -maxdepth 1 -type d -name "install-tl-*" | head -n 1)
  if [[ -z "$INSTALL_DIR" ]]; then
    echo "ERROR: Could not find extracted install-tl directory"
    exit 1
  fi
  cd "$INSTALL_DIR"
else
  # Unix: use tar
  tar -xzf "$INSTALLER_FILE" --strip-components=1
fi

# Create profile for automated install
# We select scheme-basic to keep it small
# We enable portable mode
# CRITICAL: instopt_adjustrepo 0 - do NOT update repository, stay on 2024 final
echo ">>> Creating install profile..."
cat <<EOF > texlive.profile
selected_scheme scheme-basic
TEXDIR $TARGET_DIR
TEXMFCONFIG $TARGET_DIR/texmf-config
TEXMFHOME $TARGET_DIR/texmf-home
TEXMFLOCAL $TARGET_DIR/texmf-local
TEXMFSYSCONFIG $TARGET_DIR/texmf-config
TEXMFSYSVAR $TARGET_DIR/texmf-var
instopt_adjustpath 0
instopt_adjustrepo 0
instopt_letter 0
instopt_portable 1
instopt_write18_restricted 1
tlpdbopt_autobackup 0
tlpdbopt_install_docfiles 0
tlpdbopt_install_srcfiles 0
EOF

echo ">>> Running installer..."
if [[ "$OS_NAME" == "windows" ]]; then
  # Windows: The zip includes its own Perl, so we use install-tl-windows.bat
  # But we are in Git Bash, so we can call the Perl script directly with the bundled Perl
  # The bundled Perl is in tlpkg/tlperl/bin/perl.exe
  if [[ -f "tlpkg/tlperl/bin/perl.exe" ]]; then
    echo ">>> Using bundled Perl for Windows..."
    ./tlpkg/tlperl/bin/perl.exe ./install-tl -profile texlive.profile -repository "$TL_REPOSITORY"
  else
    # Fallback: try install-tl-windows.bat (runs in cmd)
    echo ">>> Falling back to install-tl-windows.bat..."
    cmd //c "install-tl-windows.bat -profile texlive.profile -repository $TL_REPOSITORY"
  fi
else
  ./install-tl -profile texlive.profile -repository "$TL_REPOSITORY"
fi

cd ..
rm -rf texlive_installer

echo ">>> TeX Live installed to $TARGET_DIR"

# [FIX] Remove broken symlinks causing build failures
# The installer creates man/info symlinks in bin/ pointing to non-existent doc folders
echo ">>> Cleaning up broken symlinks (man, info)..."
find "$TARGET_DIR/bin" -type l -name "man" -delete 2>/dev/null || true
find "$TARGET_DIR/bin" -type l -name "info" -delete 2>/dev/null || true

# Find tlmgr to install updates and packages
# The binary path depends on the platform
BIN_DIR=$(find "$TARGET_DIR/bin" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [[ -n "$BIN_DIR" ]]; then
  echo ">>> Installing extra packages using $BIN_DIR/tlmgr..."
  
  # Point tlmgr to the same frozen repository
  "$BIN_DIR/tlmgr" option repository "$TL_REPOSITORY"
  
  # Install requested packages
  "$BIN_DIR/tlmgr" install texliveonfly collection-fontsrecommended latexmk
  
  echo ">>> TeX Live setup complete."
else
  echo "ERROR: Could not find binary directory in $TARGET_DIR/bin"
  exit 1
fi
