#!/bin/bash
# A clip of the sea, off the native renderer.
#
#   ./clip.sh
#   ./clip.sh seconds=12 seed=42 out=night
#   ./clip.sh daylight=0 march=0.2 wide=900
#   ./clip.sh keep=/tmp/clip.rgba          # leave the raw frames to look at
#
# Writes two files, because a clip has two jobs. `$out.mp4` is the one to watch
# and to hand to anybody; `$out.gif` is the one a README can play by itself,
# which is worth the loss of nearly everything else.
#
# `seascape/gif.sh` next door is the same clip off the QML renderer, and the two
# take the same keys on purpose: the clip is how the renderers are held against
# each other at all, since a still cannot show that one of them is smooth.
#
# The recorder streams raw frames rather than writing stills, so this is one
# pass over the water and no thousands of PNGs anywhere. ffmpeg splits that one
# stream three ways: the film, the palette, and the frames the palette is used
# on. Splitting after the scale is what keeps that last branch affordable, since
# it is the only one ffmpeg has to hold all of.
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

# The clip. Recorded at the film's rate; the gif is thinned out of the same
# frames further down rather than recorded again, so both are the same water.
seconds=$(arg seconds 8 "$@")
fps=$(arg fps 30 "$@")
gifps=$(arg gifps 10 "$@")

# The picture. `width`/`height` are what the card draws at, `film` and `wide`
# are what the two files are written at, and the difference between them is the
# antialiasing: the bed is fine lines, and a fine line drawn at the size it is
# shown at comes out as a dashed one.
width=$(arg width 2400 "$@")
height=$(arg height 1350 "$@")
film=$(arg film 1200 "$@")
wide=$(arg wide 600 "$@")

# The water, passed through to the scene. The same keys the still harness takes.
#
# The seed is the one the README's clip was drawn on, and it is a default rather
# than a note in a file somewhere because a clip is worth choosing: most seas are
# a shoal and the snow, and this one has a submarine crossing the whole width of
# it, a turtle, and a wreck on the floor. Anything rare is wound on for a harness
# anyway, so the seed decides what turns up rather than whether anything does.
after=$(arg after 6 "$@")
daylight=$(arg daylight 1 "$@")
dusk=$(arg dusk 0 "$@")
march=$(arg march 0.5 "$@")
seed=$(arg seed 311 "$@")
settle=$(arg settle 40 "$@")
ink=$(arg ink '#35c26d' "$@")
surface=$(arg surface '#0e1712' "$@")

# The gif. This many colours is plenty for a scene that is one colour and its
# shadow, and the dither is the ordered one because a diffused dither re-dithers
# the same still water differently on every frame, which a gif then has to store
# as motion.
#
# Fewer colours than the QML clip next door takes, and the reason is the snow:
# it is re-rolled every frame and leaves most of the picture different from the
# frame before it, so there is no still part of this scene for the encoder to
# leave out. Measured on the same eight seconds, 64 colours is 8.4MB and 32 is
# 6.0MB with nothing visibly lost, which is the whole of why it is 32.
colors=$(arg colors 32 "$@")
dither=$(arg dither bayer:bayer_scale=5 "$@")
out=$(arg out sea "$@")
keep=$(arg keep "" "$@")

command -v ffmpeg >/dev/null || { echo "no ffmpeg on PATH" >&2; exit 1; }

frames=$((seconds * fps))
echo "drawing $frames frames at ${width}x${height}, seed $seed"

cargo build --release --bin clip
recorder=(./target/release/clip
  "after=$after"
  "daylight=$daylight"
  "dusk=$dusk"
  "fps=$fps"
  "height=$height"
  "ink=$ink"
  "march=$march"
  "seconds=$seconds"
  "seed=$seed"
  "settle=$settle"
  "surface=$surface"
  "width=$width")

echo "writing $out.mp4 at ${film}px and $out.gif at ${wide}px, $colors colours"

# `-2` rather than `-1` on the film: h264 wants both sides even, and a scale
# that lands on an odd height fails at the very end of the encode, after the
# whole clip has been drawn.
render() {
  ffmpeg -y -loglevel error \
    -f rawvideo -pix_fmt rgba -s "${width}x${height}" -framerate "$fps" -i - \
    -filter_complex "
      [0:v]split=2[m][g];
      [m]scale=$film:-2:flags=lanczos[film];
      [g]fps=$gifps,scale=$wide:-1:flags=lanczos,split[a][b];
      [a]palettegen=max_colors=$colors:stats_mode=diff[p];
      [b][p]paletteuse=dither=$dither:diff_mode=rectangle[still]
    " \
    -map '[film]' -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 \
    -preset slow -movflags +faststart "$out.mp4" \
    -map '[still]' -loop 0 "$out.gif"
}

if [[ -n $keep ]]; then
  "${recorder[@]}" >"$keep"
  render <"$keep"
else
  "${recorder[@]}" | render
fi

ls -lh "$out.mp4" "$out.gif" | awk '{print $9, $5}'
