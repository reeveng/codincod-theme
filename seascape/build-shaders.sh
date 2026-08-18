#!/bin/bash
# Compile the scene's shaders for Qt's own pipeline.
#
# Qt 6 does not take GLSL at runtime. A `ShaderEffect` is handed a `.qsb`, a
# bundle holding the same shader compiled for every backend the RHI might come up
# on, and `qsb` is what makes one. So the source is `lens.frag`, the bundle is
# `lens.frag.qsb`, and the bundle is committed for the same reason `Ornament.js`
# is: `install.sh` copies this directory onto a desktop and nothing on that
# desktop is going to have Qt's shader tools on it.
#
# Run this after changing a `.frag`, and commit both halves.

set -euo pipefail

cd "$(dirname "$0")"

QSB="${QSB_BIN:-}"
if [[ -z $QSB ]]; then
  for candidate in qsb /usr/lib/qt6/bin/qsb /usr/lib/qt6/libexec/qsb; do
    if command -v "$candidate" >/dev/null 2>&1; then QSB="$candidate"; break; fi
  done
fi

[[ -n $QSB ]] || {
  echo "no qsb on PATH; it ships with Qt's shader tools (qt6-shadertools)" >&2
  exit 1
}

# The same spread of targets Qt's own quick shaders are built for. The desktop
# comes up on OpenGL here and a preview run offscreen may come up on anything, so
# a bundle that held one backend would work until the day it did not.
for source in *.frag; do
  "$QSB" --glsl "100es,120,150" --hlsl 50 --msl 12 -O -o "$source.qsb" "$source"
  echo "$source -> $source.qsb"
done
