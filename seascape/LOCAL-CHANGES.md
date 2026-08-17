# Local changes

A clone of `omarchy.background`, taken from Omarchy's `shell/plugins/background`
at version 1.0.0. The wallpaper, the reveal wipe and the double-click handlers
are upstream's and untouched. What is added is a sea over the top of them.

## The sea is not written here

It is [CodinCod's](https://codincod.com), taken as it stands. `Ornament.js` is
built by `build-ornament.sh` out of `assets/js/ornament/` in the CodinCod
repository, and nothing in that directory is edited on the way through:

| There | Here |
| --- | --- |
| `shoal.ts` | where a fish goes, why, and which of five kinds it is |
| `fish_shape.ts` | one drawing of the animal, per beat of its tail |
| `cephalopods.ts` | squid in the water, octopuses on the stones |
| `seabed.ts`, `flora.ts` | the floor, and what grows out of it |
| `relics.ts` | what lies on the floor, and the plume off the vent |
| `passers.ts` | the boat overhead, and the sonar |
| `drift.ts`, `rays.ts` | the snow, the bubbles, the light |
| `sun.ts` | which hour it is, from the sun's real altitude |
| `perlin.ts` | the field they all wander through |
| `water.ts`, `glass.ts` | the browser's renderers, which `Seascape.qml` answers |

That split is CodinCod's own and it is deliberate: the simulation is kept free
of the DOM so the drawing half stays a drawing half. A second renderer is what
that buys, and this is it. Change the ornament on the website, run
`build-ornament.sh`, and the desktop swims the same way.

```bash
./build-ornament.sh                              # from the default checkout
CODINCOD_DIR=/path/to/codincodv2 ./build-ornament.sh
```

## Changes in `Background.qml`

Four, all of them additive. The scene itself is not in this file: it is
`Seascape.qml`, which knows nothing about wallpapers, compositors or which
workspace you are on, and that is what lets the same component be a desktop
background and an offscreen preview.

- `import "Ornament.js" as Ornament`, and `Quickshell.Hyprland` for the gate.
- `daylight` and `dusk` on the root item, and a five-minute timer that reads
  them off `Ornament.sunNow`. They live on the root rather than on each
  `Seascape` because there is one sun and there may be three monitors.
- A `Seascape` inside the panel, anchored to the panel rather than to either
  wallpaper image, so changing the background wipes across underneath the fish
  and they swim on through it without a break.
- Nothing names a colour: the sea is drawn in `Color.accent` and cut out in
  `Color.background`, so a theme switch recolours the water for free and a theme
  nobody has written yet already works. The sun and the moon are the two
  exceptions, and they have to be; a green moon is not a moon.

### Why it costs nothing while you work

`Seascape.running` is true only while the active workspace on this screen holds
no window at all. Gaps are zero here and no window is see-through, so one window
anywhere means the wallpaper is completely covered and there is nothing to
animate. `Hyprland.toplevels` is fed by the compositor's event socket, so that
binding re-evaluates when a window opens, closes or moves, and at no other time.

Both halves of that are load-bearing. If gaps or window opacity ever come back,
this gate starts freezing a sea you can still see through the gaps, and it
should become a check on full-screen coverage instead.

## Resyncing after an Omarchy update

```bash
diff -u /usr/share/omarchy/shell/plugins/background/Background.qml Background.qml
```

Take upstream's version of everything outside the four additions above.
