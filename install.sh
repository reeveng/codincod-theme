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
# Whichever is installed turns the other one off. Two wallpapers on the
# background layer is a coin toss over which one you see.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGINS="$HOME/.config/omarchy/plugins"
ID="${SEASCAPE_ID:-${USER:-$(id -un)}.background}"
TARGET="$PLUGINS/$ID"
BIN="$HOME/.local/bin/seascape-wall"
UNIT="$HOME/.config/systemd/user/seascape.service"

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

# The plugin off, so that the two of them are never both on the background
# layer. Disabled rather than removed: the way back is one command.
stop_plugin() {
  omarchy plugin list --json 2>/dev/null |
    jq -e --arg id "$ID" 'any(.[]; .id == $id and .state == "enabled")' >/dev/null || return 0
  omarchy plugin disable "$ID" >/dev/null
  restart_shell
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
ExecStart=$BIN ink=${SEASCAPE_INK:-#35c26d} surface=${SEASCAPE_SURFACE:-#0e1712}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=graphical-session.target
UNITFILE

  systemctl --user daemon-reload
  systemctl --user enable --now seascape.service
  echo "Installed. The desktop is water now, and the card is drawing it."
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
