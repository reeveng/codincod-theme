#!/bin/bash
# Install the seascape background plugin into the Omarchy shell.
#
# The theme itself needs none of this: `omarchy theme install` on this repo is
# the whole of the theme. What this adds is the water.
#
# The plugin is a clone of Omarchy's own `omarchy.background`, so installing it
# means replacing the built-in with this one. That is Omarchy's supported way of
# customizing a first-party plugin, and `omarchy plugin enable` handles the
# swap; the built-in is disabled rather than removed, so uninstalling is one
# command back.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGINS="$HOME/.config/omarchy/plugins"
ID="${SEASCAPE_ID:-${USER:-$(id -un)}.background}"
TARGET="$PLUGINS/$ID"

command -v omarchy-shell >/dev/null || {
  echo "omarchy-shell is not on PATH; is this an Omarchy system?" >&2
  exit 1
}

mkdir -p "$TARGET"
cp -a "$HERE/seascape/." "$TARGET/"

# The manifest ships with a placeholder id so the repo does not carry one
# person's username. Whoever installs it gets their own.
tmp=$(mktemp)
jq --arg id "$ID" '.id = $id' "$TARGET/manifest.json" >"$tmp"
mv "$tmp" "$TARGET/manifest.json"

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

omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true

for _ in $(seq 40); do
  if omarchy plugin list --json 2>/dev/null | jq -e --arg id "$ID" 'any(.[]; .id == $id)' >/dev/null; then
    omarchy plugin enable "$ID" >/dev/null
    restart_shell
    echo "Installed $ID. The desktop is water now."
    exit 0
  fi
  sleep 0.05
done

echo "Copied to $TARGET, but the shell did not discover it." >&2
echo "Try: omarchy restart shell" >&2
exit 1
