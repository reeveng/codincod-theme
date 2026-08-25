#!/bin/bash
# Install the water.
#
# The theme itself needs none of this: `omarchy theme install` on this repo is
# the whole of the theme. What this adds is the sea.
#
#   ./install.sh             the native renderer, which is the one this draws with
#   ./install.sh --qml       the shell plugin, which is the same water on the CPU
#   ./install.sh --uninstall the water gone and the desk's own wallpaper back
#
# There are two renderers and one simulation. `seascape-rs/` draws on the card,
# through a layer surface of its own, and runs as a service of your own session.
# `seascape/` is a clone of Omarchy's own `omarchy.background` plugin and draws
# in QML, which is where this started and what to fall back to on a machine the
# native one will not build on.
#
# Whichever is installed turns the other one off. Two wallpapers on one layer is
# a coin toss over which one you see.
#
# Either way the water is this theme's and stops when the theme does. The native
# renderer draws on the layer above Omarchy's own background rather than in
# place of it, and both renderers ask the desktop what it is wearing and put the
# sea away when the answer is not this. Switch theme and you get that theme's
# wallpaper, which is the whole of what a theme is.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGINS="$HOME/.config/omarchy/plugins"
# The id in the manifest, so that installing the sea from here and installing
# it from the plugin marketplace land on the same plugin rather than on two of
# them drawing over each other.
CANONICAL_ID="codincod.background"
# What this installer called it before that, which is a plugin still sitting
# enabled on any desk that took the water early. Swept along with the rest of
# them, or a second install leaves two seas drawing over each other.
LEGACY_ID="${USER:-$(id -un)}.background"
ID="${SEASCAPE_ID:-$CANONICAL_ID}"
TARGET="$PLUGINS/$ID"
BIN="$HOME/.local/bin/seascape-wall"
UNIT="$HOME/.config/systemd/user/seascape.service"

# Which theme the water belongs to, if any, which is decided by where this is
# sitting rather than by anything written down here.
#
# Under `themes/` means Omarchy cloned it there as somebody's theme, and
# `omarchy theme install` names a theme after its repository, so the water is
# that theme's and stops when that theme comes off. A fork under another name is
# that fork's sea for the same reason.
#
# Anywhere else, it belongs to no theme and draws under all of them. That is the
# right default for a clone of this repository: the sea is not a theme and takes
# its two colours off whichever one you are wearing.
#
# `SEASCAPE_THEME=codincod` ties it to a theme by hand, and `SEASCAPE_THEME=`
# unties it again.
THEME=""
if [[ $(basename "$(dirname "$HERE")") == themes ]]; then
  THEME="$(basename "$HERE")"
fi
THEME="${SEASCAPE_THEME-$THEME}"

# What the desktop says it is wearing, which is the same short file both
# renderers read.
worn() {
  cat "$HOME/.local/state/omarchy/current/theme.name" 2>/dev/null || true
}

command -v omarchy-shell >/dev/null || {
  echo "omarchy-shell is not on PATH; is this an Omarchy system?" >&2
  exit 1
}

# Restart the shell, and not because it is tidy.
#
# Copying the files does nothing on its own. The shell notices the change and
# says so in its log ("Local plugin changed, reloading"), but a plugin of kind
# `service` is built once when the shell starts and that message does not
# rebuild it: the running desktop keeps whatever QML it was started with. So
# every install between two restarts is invisible, and the water carries on
# swimming exactly as it did while you sit there wondering why your change did
# nothing. That cost an evening once.
restart_shell() {
  omarchy restart shell >/dev/null 2>&1 || {
    echo "Installed, but the shell would not restart. Run: omarchy restart shell" >&2
    return 0
  }
}

install_plugin() {
  mkdir -p "$TARGET"
  cp -a "$HERE/seascape/." "$TARGET/"

  if [[ $ID != "$CANONICAL_ID" ]]; then
    tmp=$(mktemp)
    jq --arg id "$ID" '.id = $id' "$TARGET/manifest.json" >"$tmp"
    mv "$tmp" "$TARGET/manifest.json"
  fi

  # Which theme the water belongs to, read by `Background.qml` from beside
  # itself. Written here because here is the only place that knows: the same
  # files fetched by `omarchy plugin add` arrive with no theme anywhere near
  # them, and that water is the desk's and draws under every theme there is.
  if [[ -n $THEME ]]; then
    echo "$THEME" >"$TARGET/mine.theme"
  else
    rm -f "$TARGET/mine.theme"
  fi

  omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true

  for _ in $(seq 40); do
    if omarchy plugin list --json 2>/dev/null | jq -e --arg id "$ID" 'any(.[]; .id == $id)' >/dev/null; then
      omarchy plugin enable "$ID" >/dev/null
      restart_shell
      echo "Installed $ID. The desktop is water now."
      return 0
    fi
    sleep 0.05
  done

  echo "Copied to $TARGET, but the shell did not discover it." >&2
  echo "Try: omarchy restart shell" >&2
  return 1
}

# The QML sea off, since the native renderer draws the same water and two of
# them is one too many. Disabled rather than removed: the way back is one
# command.
#
# Only that one. `omarchy.background` is the shell's own wallpaper and it is
# left running, because the native water is on the layer above it rather than in
# its place: the shell paints the picture the theme names and the sea is what is
# over it. An earlier version of this installer switched that off, which is why
# it is switched back on here, and why a desk that had been through it kept this
# sea as its wallpaper under every theme it went on to wear.
stop_plugin() {
  local off=0

  for id in "$ID" "$CANONICAL_ID" "$LEGACY_ID"; do
    omarchy plugin list --json 2>/dev/null |
      jq -e --arg id "$id" 'any(.[]; .id == $id and .enabled)' >/dev/null || continue
    omarchy plugin disable "$id" >/dev/null
    off=1
  done

  if omarchy plugin list --json 2>/dev/null |
    jq -e 'any(.[]; .id == "omarchy.background" and (.enabled | not))' >/dev/null; then
    omarchy plugin enable omarchy.background >/dev/null
    off=1
  fi

  ((off)) && restart_shell
  return 0
}

stop_wall() {
  systemctl --user is-enabled seascape.service >/dev/null 2>&1 || return 0
  systemctl --user disable --now seascape.service >/dev/null 2>&1 || true
}

# The way out, which until now was a paragraph in the README naming two
# commands. That is the wrong shape for it: somebody looking for the way back is
# somebody who has already stopped reading, and one of the two commands is only
# there because an early version of this installer turned the shell's own
# wallpaper off. A desk that had been through that and then took the sea away
# had no wallpaper renderer at all.
uninstall() {
  local off=0 id

  stop_wall
  rm -f "$UNIT" "$BIN"
  systemctl --user daemon-reload

  for id in "$ID" "$CANONICAL_ID" "$LEGACY_ID"; do
    omarchy plugin list --json 2>/dev/null |
      jq -e --arg id "$id" 'any(.[]; .id == $id and .enabled)' >/dev/null || continue
    omarchy plugin disable "$id" >/dev/null
    off=1
  done

  for id in "$ID" "$CANONICAL_ID" "$LEGACY_ID"; do
    # Only a directory this installer would have written, and only one holding
    # the water: `omarchy plugin add` puts the same id somewhere else, and a
    # plugin somebody else wrote is nobody's to delete on the way past.
    [[ -d $PLUGINS/$id && -f $PLUGINS/$id/Background.qml ]] || continue
    rm -rf "${PLUGINS:?}/$id"
    off=1
  done

  if omarchy plugin list --json 2>/dev/null |
    jq -e 'any(.[]; .id == "omarchy.background" and (.enabled | not))' >/dev/null; then
    omarchy plugin enable omarchy.background >/dev/null
    off=1
  fi

  if ((off)); then
    omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true
    restart_shell
  fi

  echo "The water is gone, and the wallpaper is the desktop's own again."
  return 0
}

install_wall() {
  command -v cargo >/dev/null || {
    echo "The native renderer is built with cargo, which is not on PATH." >&2
    echo "Either install Rust, or take the other renderer: ./install.sh --qml" >&2
    exit 1
  }

  echo "Building the water. The first one takes a few minutes."
  cargo build --release --manifest-path "$HERE/seascape-rs/Cargo.toml" --bin wall

  mkdir -p "$(dirname "$BIN")" "$(dirname "$UNIT")"
  install -m 755 "$HERE/seascape-rs/target/release/wall" "$BIN"

  # Nothing about colour unless somebody asked for one. Left alone, the water
  # reads the two colours off the theme the desktop is wearing and follows it
  # when that changes, which is what the plugin gets by binding to the shell's.
  told=""
  if [[ -n ${SEASCAPE_INK:-} ]]; then told+=" ink=$SEASCAPE_INK"; fi
  if [[ -n ${SEASCAPE_SURFACE:-} ]]; then told+=" surface=$SEASCAPE_SURFACE"; fi

  # A service of the graphical session rather than something Hyprland starts,
  # so that it comes up with the desktop, goes down with it, and says why in
  # the journal when it will not start at all.
  cat >"$UNIT" <<UNITFILE
[Unit]
Description=The CodinCod seascape, on the layer under every window
PartOf=graphical-session.target
After=graphical-session.target

[Service]
Type=simple
ExecStart=$BIN$told${THEME:+ theme=$THEME}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=graphical-session.target
UNITFILE

  systemctl --user daemon-reload
  systemctl --user enable seascape.service >/dev/null
  # Restarted rather than started, since a second install with the same unit
  # already running is the one that goes on drawing with the old binary.
  systemctl --user restart seascape.service

  # Which is running either way. Whether there is anything on the screen is the
  # service's own question, asked of the theme the desk is wearing, and the
  # answer is worth saying out loud: installing the water while wearing
  # something else used to put water on that something else, and now it puts
  # nothing anywhere until you come back.
  if [[ -z $THEME || $THEME == "$(worn)" ]]; then
    echo "Installed. The desktop is water now, and the card is drawing it."
  else
    echo "Installed. Wear the $THEME theme and the card will draw it."
  fi
}

case "${1:-}" in
  --qml)
    stop_wall
    install_plugin
    ;;
  "" | --native)
    stop_plugin
    install_wall
    ;;
  --uninstall)
    uninstall
    ;;
  *)
    echo "usage: ./install.sh [--qml|--uninstall]" >&2
    exit 2
    ;;
esac
