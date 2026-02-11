#!/usr/bin/env bash

sed --version &> /dev/null
IS_GNU_SED_EXIT_CODE=$?

APP_NAME="${APP_NAME:-VSCodium}"
APP_NAME_LC="$( echo "${APP_NAME}" | awk '{print tolower($0)}' )"
ASSETS_REPOSITORY="${ASSETS_REPOSITORY:-VSCodium/vscodium}"
BINARY_NAME="${BINARY_NAME:-codium}"
GH_REPO_PATH="${GH_REPO_PATH:-VSCodium/vscodium}"
ORG_NAME="${ORG_NAME:-VSCodium}"
TUNNEL_APP_NAME="${TUNNEL_APP_NAME:-"${BINARY_NAME}-tunnel"}"

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  GLOBAL_DIRNAME="${GLOBAL_DIRNAME:-"${APP_NAME_LC}"}-insiders"
else
  GLOBAL_DIRNAME="${GLOBAL_DIRNAME:-"${APP_NAME_LC}"}"
fi

# All common functions can be added to this file

apply_patch() {
  if [[ -z "$2" ]]; then
    echo applying patch: "$1";
  fi
  # grep '^+++' "$1"  | sed -e 's#+++ [ab]/#./vscode/#' | while read line; do shasum -a 256 "${line}"; done

  cp $1{,.bak}

  _sed_i \
    -e "s|!!APP_NAME!!|${APP_NAME}|g" \
    -e "s|!!APP_NAME_LC!!|${APP_NAME_LC}|g" \
    -e "s|!!ASSETS_REPOSITORY!!|${ASSETS_REPOSITORY}|g" \
    -e "s|!!BINARY_NAME!!|${BINARY_NAME}|g" \
    -e "s|!!GH_REPO_PATH!!|${GH_REPO_PATH}|g" \
    -e "s|!!GLOBAL_DIRNAME!!|${GLOBAL_DIRNAME}|g" \
    -e "s|!!ORG_NAME!!|${ORG_NAME}|g" \
    -e "s|!!RELEASE_VERSION!!|${RELEASE_VERSION}|g" \
    -e "s|!!TUNNEL_APP_NAME!!|${TUNNEL_APP_NAME}|g" \
    "$1"

  if ! git apply --ignore-whitespace "$1"; then
    echo failed to apply patch "$1" >&2
    exit 1
  fi

  mv -f $1{.bak,}
}

exists() { type -t "$1" &> /dev/null; }

is_gnu_sed() {
  return ${IS_GNU_SED_EXIT_CODE}
}

if is_gnu_sed; then
  _sed_i() {
    sed -i -E "$@"
  }
else
  _sed_i() {
    sed -i '' -E "$@"
  }
fi

if ! exists gsed; then
  gsed() {
    _sed_i "$@"
  }
fi

replace() {
  _sed_i "$@"
}
