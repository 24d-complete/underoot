#!/bin/bash
# Wrapper script for texliveonfly - adapts latexmk arguments
OPTS=""
FILE=""
SCRIPT_DIR="$(dirname "$0")"
TEXLIVEONFLY="$SCRIPT_DIR/texliveonfly"

for arg in "$@"; do
  if [[ "$arg" == -* ]]; then
    if [[ -z "$OPTS" ]]; then
      OPTS="$arg"
    else
      OPTS="$OPTS $arg"
    fi
  else
    FILE="$arg"
  fi
done

exec "$TEXLIVEONFLY" --arguments="$OPTS" --texlive_bin="$SCRIPT_DIR" "$FILE"
