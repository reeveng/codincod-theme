#!/bin/bash
# Bundle the bridge and the ornament it reads into one script for the V8 host.
#
# Nothing like `build-ornament.sh` next door has to be shimmed here: this runs
# in V8 rather than in Qt's engine, so the bundle targets what the ornament is
# actually written in.
set -euo pipefail
cd "$(dirname "$0")"
CODINCOD="${CODINCOD_DIR:-$HOME/Documents/projects/codincodv2}"
ESBUILD="${ESBUILD_BIN:-$CODINCOD/_build/esbuild-linux-x64}"
[[ -x $ESBUILD ]] || { echo "no esbuild at $ESBUILD" >&2; exit 1; }
"$ESBUILD" scene.ts --bundle --format=iife --global-name=Sea --target=es2022 --outfile=scene.js
