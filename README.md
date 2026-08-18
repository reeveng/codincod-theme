# CodinCod for Omarchy

A dark green desktop, and a sea living in the wallpaper.

![The sea, eight seconds of it](seascape.gif)

The theme is [CodinCod](https://codincod.com)'s own palette, converted out of
oklch so a green here is the same green there. The wallpaper is the website's
own simulation, running on a desktop.

## Installing it

```bash
omarchy theme install https://github.com/reeveng/codincod-theme.git
```

That is the whole of the theme. Omarchy takes `colors.toml` and generates the
rest, so this one file re-colours alacritty, foot, kitty, ghostty, btop, helix,
neovim, vscode, chromium, obsidian, the lock screen, Hyprland's borders, the
bar, and the keyboard's own lights.

The sea is a second step, and the theme is complete without it:

```bash
./install.sh
```

The clip above is the plugin itself, recorded offscreen a frame at a time. It
is slower and darker on a real desktop, which is the point of it.

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

`seascape/` is an Omarchy shell plugin that puts water where the wallpaper was:
a shoal working through it, marine snow falling, bubbles off vents in the floor,
and light through the surface. Hills stand off in the murk, plants root on the
ground at their own distance rather than along one line, and a fish that swims
out of the picture is gone, so nothing loops.

**A different sea every day.** The calendar day decides where the seabed is,
what grows on it, how much of it grew, whether there is a wreck down there and
what happens to be lying on it. A screen takes the new day up the next time a
window covers it, so the ground never rearranges itself while you are looking at
it.

**And almost nothing happens in it.** A boat crosses the surface, sonar goes off
somewhere out there, and once in a while a submarine passes at your own depth,
each at most once a day and the submarine rarely. Turtles, sharks, dolphins and
rays come through on their own clock, minutes apart rather than hours. Nothing
advances while the wallpaper is covered, so a crossing owed at four in the
morning happens the next time you are actually looking at the sea.

**It is the website's own simulation.** Nothing in it is reimplemented here:
`Ornament.js` is built out of `assets/js/ornament/` in the CodinCod repository,
which is kept free of the DOM so that a second renderer can exist at all.
`Seascape.qml` is this repo's answer to the website's `water.ts`, and the
simulations underneath are the same ones the porthole on the site runs.

```bash
CODINCOD_DIR=/path/to/codincodv2 seascape/build-ornament.sh
```

[SEASCAPE.md](SEASCAPE.md) is the long version: what each layer draws, the rules
the whole scene keeps, and where a frame goes.

### Looking at it without a desktop

The background is only visible when nothing is on the workspace, so
screenshotting it would mean throwing yourself onto an empty workspace and back.
The same component mounts offscreen instead:

```bash
cd seascape && ./look.sh preview.qml     # a still; Omarchy's theme picker shows this one
cd seascape && ./look.sh shapes.qml      # every silhouette, large and alone
cd seascape && ./gif.sh                  # eight seconds of it, as a gif
cd seascape && ./bench.sh                # where a frame goes
```

Through `look.sh` rather than `qml6`, and that is not a convenience:
`QT_QPA_PLATFORM=offscreen` by itself loads Qt's software scene graph, which
ignores `preferredRendererType` altogether and answers every question about a
renderer the desktop never runs.

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
