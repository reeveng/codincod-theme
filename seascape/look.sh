#!/bin/bash
# Render one of the sheets in this directory, on the renderer the desktop uses.
#
#   ./look.sh preview.qml seed=42 settle=14 out=boat.png
#   ./look.sh shapes.qml
#   ./look.sh record.qml out=/tmp/frames frames=180 fps=15
#
# The env is here rather than in anybody's head because getting it wrong is
# silent and expensive. `QT_QPA_PLATFORM=offscreen` on its own loads Qt's
# software scene graph, which paints with QPainter and ignores
# `preferredRendererType` entirely: every sheet then shows a renderer the
# background never runs on, and the curve renderer's own faults, which is most
# of what there is to look at here, cannot appear. A dolphin torn open along
# its own fins looked perfect in `preview.png` for as long as that was the way
# to look at it.
#
# So the scene graph is forced onto RHI and RHI onto OpenGL, which is what a
# desktop session gets, and the platform stays offscreen so that looking at the
# sea does not mean taking somebody's screen away to do it.

set -euo pipefail

sheet="${1:?which sheet: preview.qml, shapes.qml or record.qml}"
shift

cd "$(dirname "$0")"

[[ -f $sheet ]] || { echo "no sheet at $sheet" >&2; exit 1; }

export QT_QPA_PLATFORM=offscreen
export QT_QUICK_BACKEND=rhi
export QSG_RHI_BACKEND=opengl
export QT_FORCE_STDERR_LOGGING=1

if (($# > 0)); then
  qml6 "$sheet" -- "$@"
else
  qml6 "$sheet"
fi
