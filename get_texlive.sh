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

# For Windows, we need to convert Git Bash paths to Windows paths
# The Perl installer doesn't understand /d/a/... style paths
if [[ "$OS_NAME" == "windows" ]]; then
  # Convert /d/a/... to D:\a\... using cygpath if available, or manual conversion
  if command -v cygpath &> /dev/null; then
    TARGET_DIR_WIN=$(cygpath -w "$TARGET_DIR")
  else
    # Manual conversion: /d/path -> D:/path, then replace / with \
    TARGET_DIR_WIN=$(echo "$TARGET_DIR" | sed 's|^/\([a-zA-Z]\)/|\1:/|' | sed 's|/|\\|g')
  fi
  echo ">>> Windows path conversion: $TARGET_DIR -> $TARGET_DIR_WIN"
  # Use Windows path for the installer profile
  PROFILE_TARGET_DIR="$TARGET_DIR_WIN"
else
  PROFILE_TARGET_DIR="$TARGET_DIR"
fi

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
# Use scheme-basic to get pdflatex (contained in collection-latex)
# This includes babel, but excludes larger font collections
# CRITICAL: instopt_adjustrepo 0 - do NOT update repository, stay on 2024 final
echo ">>> Creating install profile with TEXDIR=$PROFILE_TARGET_DIR..."
cat <<EOF > texlive.profile
selected_scheme scheme-basic
TEXDIR $PROFILE_TARGET_DIR
TEXMFCONFIG $PROFILE_TARGET_DIR/texmf-config
TEXMFHOME $PROFILE_TARGET_DIR/texmf-home
TEXMFLOCAL $PROFILE_TARGET_DIR/texmf-local
TEXMFSYSCONFIG $PROFILE_TARGET_DIR/texmf-config
TEXMFSYSVAR $PROFILE_TARGET_DIR/texmf-var
instopt_adjustpath 0
instopt_adjustrepo 0
instopt_letter 0
instopt_portable 1
instopt_write18_restricted 1
tlpdbopt_autobackup 0
tlpdbopt_install_docfiles 0
tlpdbopt_install_srcfiles 0
EOF

echo ">>> Profile contents:"
cat texlive.profile

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

# Debug: List what's in TARGET_DIR
echo ">>> Contents of $TARGET_DIR:"
ls -la "$TARGET_DIR" || echo ">>> Directory listing failed"

# For Windows, also try listing with Windows-style path exploration
if [[ "$OS_NAME" == "windows" ]]; then
  if [[ ! -d "$TARGET_DIR" ]]; then
    echo ">>> TARGET_DIR not found at Unix path, checking parent..."
    PARENT_DIR=$(dirname "$TARGET_DIR")
    echo ">>> Contents of parent dir $PARENT_DIR:"
    ls -la "$PARENT_DIR" || true
  fi
fi

# Find the binary directory - platform-specific handling
if [[ "$OS_NAME" == "windows" ]]; then
  # Windows: binaries are typically in bin/windows/ or bin/win32/
  if [[ -d "$TARGET_DIR/bin/windows" ]]; then
    BIN_DIR="$TARGET_DIR/bin/windows"
  elif [[ -d "$TARGET_DIR/bin/win32" ]]; then
    BIN_DIR="$TARGET_DIR/bin/win32"
  elif [[ -d "$TARGET_DIR/bin/x86_64-pc-mingw32" ]]; then
    BIN_DIR="$TARGET_DIR/bin/x86_64-pc-mingw32"
  else
    # Fallback: search for any bin subdirectory
    BIN_DIR=$(find "$TARGET_DIR/bin" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -n 1)
  fi

  # [Windows Optimization]
  # 1. Remove bundled Perl (tlpkg/tlperl) to save file count/space. System Perl is used.
  if [[ -d "$TARGET_DIR/tlpkg/tlperl" ]]; then
    echo ">>> Removing bundled Perl (tlpkg/tlperl) to save file count..."
    rm -rf "$TARGET_DIR/tlpkg/tlperl"
    echo ">>> Removed bundled Perl."
  fi
  
else
  # Unix: bin/<arch>/ structure
  # Remove broken symlinks first (they exist even without doc install)
  echo ">>> Cleaning up broken symlinks (man, info)..."
  find "$TARGET_DIR/bin" -type l -name "man" -delete 2>/dev/null || true
  find "$TARGET_DIR/bin" -type l -name "info" -delete 2>/dev/null || true
  
  BIN_DIR=$(find "$TARGET_DIR/bin" -mindepth 1 -maxdepth 1 -type d | head -n 1)
fi

echo ">>> Detected BIN_DIR: $BIN_DIR"

if [[ -n "$BIN_DIR" && -d "$BIN_DIR" ]]; then
  
  # Determine proper tlmgr command
  if [[ "$OS_NAME" == "windows" ]]; then
    if [[ -f "$BIN_DIR/tlmgr.bat" ]]; then
      TLMGR_CMD="$BIN_DIR/tlmgr.bat"
    else
      TLMGR_CMD="$BIN_DIR/tlmgr"
    fi
  else
    TLMGR_CMD="$BIN_DIR/tlmgr"
  fi
  
  echo ">>> Installing extra packages using $TLMGR_CMD..."
  
  # Point tlmgr to the same frozen repository
  "$TLMGR_CMD" option repository "$TL_REPOSITORY"
  
  # Install requested packages
  # We include collection-fontsrecommended for full functionality.
  # On Windows, we'll zip the result to avoid EMFILE.
  "$TLMGR_CMD" install texliveonfly collection-fontsrecommended latexmk
  
  echo ">>> TeX Live setup complete."

  # [Windows Optimization]
  # Zip the entire TeX Live directory to a single file to bypass EMFILE errors during build.
  # The extension logic must unzip this on first run.
  if [[ "$OS_NAME" == "windows" ]]; then
    echo ">>> Zipping TeX Live directory for Windows..."
    
    # We are in the parent of TARGET_DIR usually? 
    # TARGET_DIR is full path. Let's go to its parent.
    PARENT_DIR=$(dirname "$TARGET_DIR")
    BASENAME=$(basename "$TARGET_DIR")
    cd "$PARENT_DIR"
    
    # Use 7z for speed and compression if avail, else tar
    if command -v 7z &> /dev/null; then
       7z a -tzip "${BASENAME}.zip" "$BASENAME"
    elif command -v tar &> /dev/null; then
       tar -cf "${BASENAME}.zip" --format=zip "$BASENAME"
    else 
       echo "ERROR: No zip tool found!"
       exit 1
    fi
    
    echo ">>> Zipping complete. Removing original directory..."
    rm -rf "$BASENAME"
    echo ">>> Original directory removed. Only ${BASENAME}.zip remains."

    # [Windows Optimization] Patch main.js to unzip texlive.zip at runtime
    # This is necessary because main.js is a build artifact (ignored by git)
    EXTENSION_DIR=$(dirname "$TARGET_DIR")
    MAIN_JS="$EXTENSION_DIR/out/src/main.js"
    
    if [[ -f "$MAIN_JS" ]]; then
       echo ">>> Patching $MAIN_JS to support runtime unzipping..."
       node -e "
const fs = require('fs');
const file = process.argv[1];
try {
  let content = fs.readFileSync(file, 'utf8');
  const injection = \`
      // [Windows Optimization] Check for texlive.zip
      if (process.platform === 'win32' && require('fs').existsSync(require('path').join(searchDir, 'texlive.zip'))) {
          // If zip exists but directory doesn't, unzip it
          if (!require('fs').existsSync(require('path').join(searchDir, 'texlive'))) {
              try {
                  console.log('[latex-workshop] Unzipping bundled TeX Live...');
                  const zipPath = require('path').join(searchDir, 'texlive.zip');
                  require('child_process').execSync('tar -xf \"texlive.zip\"', { cwd: searchDir });
                  foundDir = require('path').join(searchDir, 'texlive');
                  if (foundDir) break;
              } catch (e) {
                  console.error('[latex-workshop] Failed to unzip texlive:', e);
              }
          }
      }
  \`;
  
  // Inject before directory traversal
  const anchor = 'const parent = path.dirname(searchDir);';
  if (content.includes(anchor)) {
      content = content.replace(anchor, injection + '\\n      ' + anchor);
      fs.writeFileSync(file, content);
      console.log('Successfully patched main.js');
  } else {
      console.error('ERROR: Could not find anchor in main.js');
      process.exit(1);
  }
} catch (e) {
  console.error('ERROR patching main.js:', e);
  process.exit(1);
}
" "$MAIN_JS"
    else
       echo "WARNING: Could not find main.js at $MAIN_JS"
    fi
  fi

else
  # On Windows, the installation might put everything directly in TEXDIR
  # Check for tlmgr.bat in root
  if [[ "$OS_NAME" == "windows" && -f "$TARGET_DIR/tlmgr.bat" ]]; then
    echo ">>> Found tlmgr.bat directly in TEXDIR, using that..."
    "$TARGET_DIR/tlmgr.bat" option repository "$TL_REPOSITORY"
    "$TARGET_DIR/tlmgr.bat" install texliveonfly collection-fontsrecommended latexmk
    echo ">>> TeX Live setup complete."
    
    # Zip logic for fallback case too
    rm -rf "$TARGET_DIR/tlpkg/tlperl"
    
    PARENT_DIR=$(dirname "$TARGET_DIR")
    BASENAME=$(basename "$TARGET_DIR")
    cd "$PARENT_DIR"
    
    if command -v 7z &> /dev/null; then
       7z a -tzip "${BASENAME}.zip" "$BASENAME"
    elif command -v tar &> /dev/null; then
       tar -cf "${BASENAME}.zip" --format=zip "$BASENAME"
    fi
    rm -rf "$BASENAME"
    
  else
    echo "ERROR: Could not find binary directory"
    echo ">>> Listing TARGET_DIR structure for debugging:"
    find "$TARGET_DIR" -maxdepth 3 -type d 2>/dev/null || true
    exit 1
  fi
fi
