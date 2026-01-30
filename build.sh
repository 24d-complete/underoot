#!/usr/bin/env bash
# shellcheck disable=SC1091

set -ex

. version.sh

if [[ "${SHOULD_BUILD}" == "yes" ]]; then
  echo "MS_COMMIT=\"${MS_COMMIT}\""

  . prepare_vscode.sh

  cd vscode || { echo "'vscode' dir not found"; exit 1; }

  export NODE_OPTIONS="--max-old-space-size=8192"

  npm run monaco-compile-check
  npm run valid-layers-check

  npm run gulp compile-build-without-mangling
  npm run gulp compile-extension-media
  npm run gulp compile-extensions-build
  npm run gulp minify-vscode

  if [[ "${OS_NAME}" == "osx" ]]; then
    # remove win32 node modules
    rm -f .build/extensions/ms-vscode.js-debug/src/win32-app-container-tokens.*.node

    # generate Group Policy definitions
    npm run copy-policy-dto --prefix build
    node build/lib/policies/policyGenerator.ts build/lib/policies/policyData.jsonc darwin

    npm run gulp "vscode-darwin-${VSCODE_ARCH}-min-ci"

    # BUNDLE TEX LIVE
    echo "Bundling TeX Live..."
    TEX_SRC="$HOME/.underoot/tools/texlive"
    # App name might vary (VSCodium or Underoot), check what was built
    # Based on prepare_vscode.sh, it seems to be VSCodium-Insiders or Underoot
    # But the output folder usually contains the .app
    APP_PATH="../VSCode-darwin-${VSCODE_ARCH}/VSCodium.app"
    if [ ! -d "$APP_PATH" ]; then
        # fallback for Insiders or different naming
        APP_PATH=$(find "../VSCode-darwin-${VSCODE_ARCH}" -name "*.app" | head -n 1)
    fi

    TEX_DEST="$APP_PATH/Contents/Resources/texlive"
    
    if [ -d "$TEX_SRC" ] && [ ! -z "$APP_PATH" ]; then
        echo "Copying from $TEX_SRC to $TEX_DEST"
        mkdir -p "$(dirname "$TEX_DEST")"
        cp -R "$TEX_SRC" "$TEX_DEST"
        echo "TeX Live bundled successfully."
    else
        echo "Warning: TeX Live source not found at $TEX_SRC or App not found. Skipping bundling."
    fi

    find "../VSCode-darwin-${VSCODE_ARCH}" -print0 | xargs -0 touch -c

    . ../build_cli.sh

    VSCODE_PLATFORM="darwin"
  elif [[ "${OS_NAME}" == "windows" ]]; then
    # in CI, packaging will be done by a different job
    if [[ "${CI_BUILD}" == "no" ]]; then
      . ../build/windows/rtf/make.sh

      # generate Group Policy definitions
      npm run copy-policy-dto --prefix build
      node build/lib/policies/policyGenerator.ts build/lib/policies/policyData.jsonc win32

      npm run gulp "vscode-win32-${VSCODE_ARCH}-min-ci"

      if [[ "${VSCODE_ARCH}" != "x64" ]]; then
        SHOULD_BUILD_REH="no"
        SHOULD_BUILD_REH_WEB="no"
      fi

      . ../build_cli.sh
    fi

    VSCODE_PLATFORM="win32"
  else # linux
    # remove win32 node modules
    rm -f .build/extensions/ms-vscode.js-debug/src/win32-app-container-tokens.*.node

    # in CI, packaging will be done by a different job
    if [[ "${CI_BUILD}" == "no" ]]; then
      # generate Group Policy definitions
      npm run copy-policy-dto --prefix build
      node build/lib/policies/policyGenerator.ts build/lib/policies/policyData.jsonc linux

      npm run gulp "vscode-linux-${VSCODE_ARCH}-min-ci"

      find "../VSCode-linux-${VSCODE_ARCH}" -print0 | xargs -0 touch -c

      . ../build_cli.sh
    fi

    VSCODE_PLATFORM="linux"
  fi

  if [[ "${SHOULD_BUILD_REH}" != "no" ]]; then
    npm run gulp minify-vscode-reh
    npm run gulp "vscode-reh-${VSCODE_PLATFORM}-${VSCODE_ARCH}-min-ci"
  fi

  if [[ "${SHOULD_BUILD_REH_WEB}" != "no" ]]; then
    npm run gulp minify-vscode-reh-web
    npm run gulp "vscode-reh-web-${VSCODE_PLATFORM}-${VSCODE_ARCH}-min-ci"
  fi

  cd ..
fi
