#!/bin/bash
# Bundle the bridge and the ornament it reads into one script for the V8 host.
#
# Nothing like `build-ornament.sh` next door has to be shimmed here: this runs
# in V8 rather than in Qt's engine, so the bundle targets what the ornament is
# actually written in.
set -euo pipefail
cd "$(dirname "$0")"
CODINCOD="${CODINCOD_DIR:-$HOME/Documents/projects/codincodv2}"
ORNAMENT="$CODINCOD/assets/js/ornament"
ESBUILD="${ESBUILD_BIN:-$CODINCOD/_build/esbuild-linux-x64}"
[[ -d $ORNAMENT ]] || { echo "no ornament sources at $ORNAMENT" >&2; exit 1; }
[[ -x $ESBUILD ]] || { echo "no esbuild at $ESBUILD" >&2; exit 1; }

# `scene.ts` imports the ornament through here rather than by a path of its own,
# so that `CODINCOD_DIR=` is obeyed by the thing that actually reads the sources
# instead of only by the thing that looks for esbuild. It used to be a relative
# path up out of this repository, which quietly meant one checkout beside
# another and nothing else: set the variable to somewhere else and the build
# succeeded, off the wrong sources.
ln -sfn "$ORNAMENT" .ornament

"$ESBUILD" scene.ts --bundle --format=iife --global-name=Sea --target=es2022 --outfile=scene.js
