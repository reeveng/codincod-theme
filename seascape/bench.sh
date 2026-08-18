#!/bin/bash
# What a frame of the sea costs, on the renderer the desktop uses.
#
#   ./bench.sh
#   ./bench.sh frames=600 width=1920 height=1080
#   ./bench.sh tolerance=0
#
# `look.sh` explains the graphics environment and this shares it. What this adds
# is `QSG_RENDER_TIMING`, which makes Qt report its own half of the frame: the
# sync that walks the changed items into the scene graph, and the render that
# draws it. Those two are the other side of `publish`, and a change that moves
# work out of the JavaScript and into the scene graph would otherwise look like
# a win.
#
# The render loop is forced to `basic`, so a frame is stepped, synced, rendered
# and reported on one thread in that order. The threaded loop overlaps the next
# frame's JavaScript with this frame's render, which is what a desktop wants and
# is unmeasurable: the numbers come back interleaved from two threads and the
# frame time stops being the sum of anything.

set -euo pipefail

cd "$(dirname "$0")"

export QT_QPA_PLATFORM=offscreen
export QT_QUICK_BACKEND=rhi
export QSG_RHI_BACKEND=opengl
export QT_FORCE_STDERR_LOGGING=1
export QSG_RENDER_LOOP=basic
export QSG_RENDER_TIMING=1

# Vsync off, in both places that hold it. Qt asks for a swap interval of 1 by
# default and Mesa honours it even on an offscreen surface, which pins every
# frame at the panel's rate: a scene that could draw in 5ms and one that takes
# 15 both report 16, and the whole point of this is to tell those apart.
export QSG_NO_VSYNC=1
export vblank_mode=0

qml6 bench.qml -- "$@" 2>&1 | awk '
  # Qt reports every frame it draws. Averaging them here rather than printing
  # hundreds of lines: what is wanted is where the frame goes, not a log.
  /syncAndRender: frame rendered/ {
    for (i = 1; i <= NF; i++) {
      gsub(/,$/, "", $i)
      if ($i ~ /^(polish|sync|render|swap)=[0-9]+$/) {
        split($i, part, "=")
        seen[part[1]]++
        held[part[1] "," seen[part[1]]] = part[2] + 0
      }
    }
    frames++
    next
  }
  /^qml:/ {
    sub(/^qml: /, "")
    # The JavaScript half, kept so the two halves can be added up at the end.
    if ($1 == "js") { advance = $3 + 0; publish = $5 + 0 }
    print
    next
  }
  { print }

  # The median of a stage over the run, by the same argument bench.qml makes for
  # taking medians at all. The last frames are the ones to have; the first are
  # the scene being built, and this runs before bench.qml has thrown its own
  # warm-up away, so a third off the front is the same cut by a blunter knife.
  function middle(key,   n, i, cut, list, half) {
    n = seen[key]
    if (n == 0) return 0
    cut = int(n / 3)
    for (i = cut + 1; i <= n; i++) list[i - cut] = held[key "," i]
    half = n - cut
    asort(list)
    return list[int((half + 1) / 2)]
  }

  END {
    if (frames > 0) {
      p = middle("polish"); s = middle("sync"); r = middle("render"); w = middle("swap")
      printf "  qt     polish %.0fms  sync %.0fms  render %.0fms  swap %.0fms\n", p, s, r, w
      cost = advance + publish + p + s + r + w
      printf "  frame  %.0fms over %d frames, which is %.0f a second\n", cost, frames, 1000 / cost
    }
  }
'
