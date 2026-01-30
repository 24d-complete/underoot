#!/usr/bin/env bash

set -e

# Usage: ./get_texlive.sh <TARGET_DIR> <OS_NAME>

TARGET_DIR="$1"
OS_NAME="$2"

if [[ -z "$TARGET_DIR" || -z "$OS_NAME" ]]; then
  echo "Usage: $0 <TARGET_DIR> <OS_NAME>"
  exit 1
fi

# Detect installer URL
case "$OS_NAME" in
  osx|linux)
    INSTALLER_URL="https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz"
    ;;
  windows)
    # For now, we use the unix tarball for Windows if running under bash (e.g. Git Bash)
    # But Windows native install usually needs install-tl-windows.zip
    # Let's try to stick to unix installer if we are in bash? No, binaries differ.
    # We will assume we are in a unix-like environment (macOS/Linux) for this task first as requested.
    # If generic windows support is needed, we'd need to handle the zip.
    INSTALLER_URL="https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz" 
    ;;
  *)
    echo "Unsupported OS: $OS_NAME"
    exit 1
    ;;
esac

echo ">>> Downloading TeX Live installer..."
mkdir -p texlive_installer
curl -L -o texlive_installer/install-tl.tar.gz "$INSTALLER_URL"

cd texlive_installer
tar -xzf install-tl.tar.gz --strip-components=1

# Create profile for automated install
# We select scheme-basic to keep it small
# We enable portable mode
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
instopt_adjustrepo 1
instopt_letter 0
instopt_portable 1
instopt_write18_restricted 1
tlpdbopt_autobackup 0
tlpdbopt_install_docfiles 0
tlpdbopt_install_srcfiles 0
EOF

echo ">>> Running installer..."
./install-tl -profile texlive.profile

cd ..
rm -rf texlive_installer

echo ">>> TeX Live installed to $TARGET_DIR"

# Find tlmgr to install updates and packages
# The binary path depends on the platform
BIN_DIR=$(find "$TARGET_DIR/bin" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [[ -n "$BIN_DIR" ]]; then
  echo ">>> Installing extra packages using $BIN_DIR/tlmgr..."
  # Update tlmgr first
  # "$BIN_DIR/tlmgr" update --self
  
  # Install requested packages
  "$BIN_DIR/tlmgr" install texliveonfly collection-fontsrecommended latexmk
  
  echo ">>> TeX Live setup complete."
else
  echo "ERROR: Could not find binary directory in $TARGET_DIR/bin"
  exit 1
fi
