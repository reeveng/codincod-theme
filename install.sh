#!/bin/bash
# Install the water.
#
# The theme itself needs none of this: `omarchy theme install` on this repo is
# the whole of the theme. What this adds is the sea.
#
#   ./install.sh          the native renderer, which is the one this draws with
#   ./install.sh --qml    the shell plugin, which is the same water on the CPU
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
# place of it, and a hook stops its service when you wear something else; the
# QML one is the background plugin and puts the sea away itself. Switch theme
# and you get that theme's wallpaper, which is the whole of what a theme is.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGINS="$HOME/.config/omarchy/plugins"
ID="${SEASCAPE_ID:-${USER:-$(id -un)}.background}"
TARGET="$PLUGINS/$ID"
BIN="$HOME/.local/bin/seascape-wall"
UNIT="$HOME/.config/systemd/user/seascape.service"
HOOK="$HOME/.config/omarchy/hooks/theme-set.d/seascape"

# Which theme the water belongs to, which is the directory Omarchy cloned this
# into rather than anything written down here: `omarchy theme install` names a
# theme after its repository, so a fork under another name is that fork's sea
# and should stop when that fork is taken off. Run from anywhere else and it is
# this one.
THEME="$(basename "$HERE")"
[[ $(basename "$(dirname "$HERE")") == themes ]] || THEME="codincod"

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

  # The manifest ships with a placeholder id so the repo does not carry one
  # person's username. Whoever installs it gets their own.
  tmp=$(mktemp)
  jq --arg id "$ID" '.id = $id' "$TARGET/manifest.json" >"$tmp"
  mv "$tmp" "$TARGET/manifest.json"

  install_hook

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

  if omarchy plugin list --json 2>/dev/null |
    jq -e --arg id "$ID" 'any(.[]; .id == $id and .enabled)' >/dev/null; then
    omarchy plugin disable "$ID" >/dev/null
    off=1
  fi

  if omarchy plugin list --json 2>/dev/null |
    jq -e 'any(.[]; .id == "omarchy.background" and (.enabled | not))' >/dev/null; then
    omarchy plugin enable omarchy.background >/dev/null
    off=1
  fi

  ((off)) && restart_shell
  return 0
}

# The one thing that makes this a theme's background rather than the desk's.
#
# Omarchy runs everything in `theme-set.d` after a theme change and hands it the
# new theme's slug, which is the only moment anybody finds out. Without it the
# service is the session's and outlives the theme by the whole login.
install_hook() {
  mkdir -p "$(dirname "$HOOK")"
  sed "s/@THEME@/$THEME/" "$HERE/hooks/theme-set.d/seascape" >"$HOOK"
  chmod +x "$HOOK"
}

stop_wall() {
  systemctl --user is-enabled seascape.service >/dev/null 2>&1 || return 0
  systemctl --user disable --now seascape.service >/dev/null 2>&1 || true
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
ExecStart=$BIN$told
Restart=on-failure
RestartSec=2

[Install]
WantedBy=graphical-session.target
UNITFILE

  install_hook

  systemctl --user daemon-reload
  systemctl --user enable seascape.service >/dev/null

  # Stopped, and then started by the hook or not at all.
  #
  # Stopped rather than restarted because a second install with the same unit
  # already running is the one that goes on drawing with the old binary. Started
  # by the hook because whether this theme is the one being worn is exactly the
  # hook's question, and installing the water while wearing something else put
  # water on that something else until the next theme change, which is the bug
  # this whole file is here to stop making.
  systemctl --user stop seascape.service
  "$HOOK"

  if systemctl --user is-active seascape.service >/dev/null 2>&1; then
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
  *)
    echo "usage: ./install.sh [--qml]" >&2
    exit 2
    ;;
esac
