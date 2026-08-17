# CodinCod for Omarchy

A dark green desktop, and a sea living in the wallpaper.

The theme is [CodinCod](https://codincod.com)'s own palette, converted out of
oklch so a green here is the same green there. The wallpaper is the shoal from
the website, running the website's simulation, on a desktop.

![The theme](preview.png)

## The theme

```bash
omarchy theme install https://github.com/reeveng/codincod-theme.git
```

That is the whole of it. Omarchy takes `colors.toml` and generates the rest, so
this one file re-colours alacritty, foot, kitty, ghostty, btop, helix, neovim,
vscode, chromium, obsidian, the lock screen, Hyprland's borders, the bar, and
the keyboard's own lights.

### Where the colours come from

| Here | There |
| --- | --- |
| `background` | the colour a puzzle is written on, from `editor/themes/forest.ts` |
| `darker_background` | daisyUI's `base-100`, the surface under the whole site |
| `accent` | the site's `primary` |
| `red`, `yellow`, `green`, `cyan`, `blue` | the site's `error`, `warning`, `success`, `secondary`, `info` |

The hues and their chroma are the site's; only the lightness is moved, onto a
ladder a terminal can use. `orange` and `brown` have no counterpart on the
website and were placed on the same ladder to match.

## The sea

`seascape/` is an Omarchy shell plugin that replaces the desktop background
with water: a shoal working through it, marine snow falling, bubbles coming off
vents in the floor, and light through the surface.

```bash
./install.sh
```

It is optional, and the theme is complete without it.

### It runs on the website's own simulation

The shoal is not reimplemented here. `Ornament.js` is built by
`seascape/build-ornament.sh` out of `assets/js/ornament/` in the CodinCod
repository, and nothing in that directory is edited on the way through:

| There | Here |
| --- | --- |
| `shoal.ts` | where a fish goes, and why |
| `drift.ts` | marine snow, and what comes off a vent |
| `rays.ts` | light through the surface |
| `fish_shape.ts` | one drawing of the animal, per beat of its tail |
| `perlin.ts` | the field they all read |
| `water.ts` | the browser's renderer, which `Seascape.qml` replaces |

That split is the website's own and it is deliberate: the simulations are kept
free of the DOM so the drawing half stays a drawing half. A second renderer is
what that buys.

```bash
CODINCOD_DIR=/path/to/codincodv2 seascape/build-ornament.sh
```

### It costs nothing while you work

The scene advances only while the wallpaper is actually visible, which it asks
Hyprland about rather than guesses: if any window is on this screen's active
workspace, nothing moves. `Hyprland.toplevels` is fed by the compositor's event
socket, so that answer is recomputed when a window opens, closes or changes
workspace, and at no other time.

That gate assumes what this theme assumes: no gaps, and no see-through windows.
If you run either, it will park a sea you can still see. `looknfeel.lua` in the
[install notes](#making-windows-opaque) turns opacity off.

### Looking at it without a desktop

Because the background is only visible when nothing is on the workspace,
screenshotting it means throwing yourself onto an empty workspace and back. So
there is a harness that mounts the same component offscreen:

```bash
cd seascape && QT_QPA_PLATFORM=offscreen qml6 preview.qml
```

It writes `preview.png` and exits.

## Making windows opaque

Omarchy fades unfocused windows, and this theme is drawn on the assumption that
nothing is see-through. In `~/.config/hypr/looknfeel.lua`:

```lua
o.window(".*", { opacity = "1 1" })
```

Loaded after Omarchy's defaults, and the last window rule to match is the one
Hyprland keeps.

## Licence

MIT. See [LICENSE](LICENSE).
