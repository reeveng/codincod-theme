#!/bin/bash
# A clip of the sea, as a gif.
#
#   ./gif.sh
#   ./gif.sh seed=42 seconds=12 wide=900
#   ./gif.sh daylight=0 march=0.2 out=night.gif
#   ./gif.sh keep=/tmp/frames                # leave the frames behind to look at
#
# Two steps, because a gif is two problems.
#
# `record.qml` draws the frames, through `look.sh` so they come off the renderer
# the desktop actually uses, with the scene's own timer off and the clock stepped
# by hand. That is what makes a clip the same water at the same rate whatever the
# machine was doing while it recorded: a grab that takes a second and a grab that
# takes a tenth advance the sea by exactly one frame either way.
#
# ffmpeg then has the harder half. A gif holds 256 colours and this scene is
# nearly all one, so a palette picked per frame shimmers and a palette picked off
# one frame loses whatever swims in later. `palettegen` reads the whole clip
# first and weights what changes in it, `paletteuse` maps every frame through
# that one palette, and the dither is ordered rather than diffused because
# diffusion re-dithers the same still water differently on every frame, which a
# gif then has to store as motion.
#
# Recorded larger than it is written and scaled down, which is the cheapest
# antialiasing there is and the only one the curve renderer has: the bed is fine
# lines, and fine lines drawn at the size they are shown at come out as dashes.

set -euo pipefail

cd "$(dirname "$0")"

# `key fallback "$@"`, and the last one that says `key=` wins.
arg() {
  local key="$1" fallback="$2" one
  shift 2
  for one in "$@"; do
    case "$one" in "$key="*) fallback="${one#*=}" ;; esac
  done
  echo "$fallback"
}

# The clip. `seconds` and `fps` are what anybody actually wants to say; the
# frame count is the two multiplied and is never asked for directly.
seconds=$(arg seconds 8 "$@")
fps=$(arg fps 10 "$@")

# The picture. `width`/`height` are what it is drawn at and `wide` is what it is
# written at, so the scale is where the sharpening happens.
width=$(arg width 1600 "$@")
height=$(arg height 1000 "$@")
wide=$(arg wide 600 "$@")

# The water. Passed through to the scene, and the same keys `look.sh` takes.
daylight=$(arg daylight 1 "$@")
dusk=$(arg dusk 0 "$@")
march=$(arg march 0.5 "$@")
seed=$(arg seed 1956 "$@")
settle=$(arg settle 40 "$@")

# The film, off, and the camera on a tripod. Both for the same reason and it is
# the whole reason a clip of this scene is affordable at all: a gif stores what
# changed between one frame and the next, so anything that touches the whole
# picture every frame costs everything.
#
# The grain is the expensive one. It is re-rolled every frame, which is what
# makes it film rather than dirt on the lens, and it leaves four fifths of the
# pixels in the picture different from the ones before them: measured on the
# same clip, it is 4.7MB with the film and 1.1MB without. The scaling and the
# palette were going to have most of it anyway.
#
# The wander is the cheap one, about a tenth, because the bed below is doing so
# much of the changing already. It is here because a frame that has moved is a
# frame in which every pixel has, and that is worth nothing at all in a file.
#
# `grain=0.03 tripod=0` puts the desktop's own back.
grain=$(arg grain 0 "$@")
tripod=$(arg tripod 1 "$@")

# The file. `colors` is the palette, and this many is plenty for a scene that is
# one colour and its shadow; `dither` is ffmpeg's own spelling of one, and
# `bayer` is the ordered one.
colors=$(arg colors 96 "$@")
dither=$(arg dither bayer:bayer_scale=3 "$@")
out=$(arg out sea.gif "$@")

# Where the frames go. A temporary directory that is removed on the way out,
# unless somebody asked for them somewhere they can look at them.
keep=$(arg keep "" "$@")
frames=$((seconds * fps))

command -v ffmpeg >/dev/null || { echo "no ffmpeg on PATH" >&2; exit 1; }

if [[ -n $keep ]]; then
  shots="$keep"
  mkdir -p "$shots"
else
  shots="$(mktemp -d)"
  trap 'rm -rf "$shots"' EXIT
fi

echo "drawing $frames frames at ${width}x${height}, seed $seed"

./look.sh record.qml \
  "daylight=$daylight" \
  "dusk=$dusk" \
  "fps=$fps" \
  "frames=$frames" \
  "grain=$grain" \
  "height=$height" \
  "march=$march" \
  "out=$shots" \
  "seed=$seed" \
  "settle=$settle" \
  "tripod=$tripod" \
  "width=$width" >/dev/null

drawn=$(find "$shots" -name 'frame-*.png' | wc -l)
[[ $drawn -eq $frames ]] || {
  echo "asked for $frames frames and got $drawn; the recording did not finish" >&2
  exit 1
}

echo "writing $out at ${wide}px wide, $colors colours"

# One pass over the frames, split two ways: the palette is built from the clip
# and used on it in the same graph, so the frames are read once rather than
# twice. `diff_mode=rectangle` keeps the dither off the part of the frame that
# did not move, which is what lets the encoder leave that part out of the file
# altogether: an ordered dither puts the same pixel at the same value twice, so
# what did not change comes out identical and is stored as nothing.
ffmpeg -y -loglevel error \
  -framerate "$fps" -i "$shots/frame-%04d.png" \
  -filter_complex "
    scale=$wide:-1:flags=lanczos,split[a][b];
    [a]palettegen=max_colors=$colors:stats_mode=diff[p];
    [b][p]paletteuse=dither=$dither:diff_mode=rectangle
  " \
  -loop 0 "$out"

echo "wrote $out ($(du -h "$out" | cut -f1), ${seconds}s at ${fps}fps)"
