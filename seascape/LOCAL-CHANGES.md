# Local changes

A clone of `omarchy.background`, taken from Omarchy's `shell/plugins/background`
at version 1.0.0. The wallpaper, the reveal wipe and the double-click handlers
are upstream's and untouched. What is added is a shoal of fish swimming over
the top of them.

## The shoal is not written here

It is [CodinCod's](https://codincod.com), taken as it stands. `Ornament.js` is
built by `build-ornament.sh` out of `assets/js/ornament/` in the CodinCod
repository, and nothing in that directory is edited on the way through:

| There | Here |
| --- | --- |
| `shoal.ts` | where a fish goes, and why |
| `fish_shape.ts` | one drawing of the animal, per beat of its tail |
| `perlin.ts` | the field they wander through |
| `water.ts` | the browser's renderer, which this file replaces |

That split is CodinCod's own and it is deliberate: the simulation is kept free
of the DOM so the drawing half stays a drawing half. A second renderer is what
that buys, and this is it. Change the ornament on the website, run
`build-ornament.sh`, and the desktop swims the same way.

```bash
./build-ornament.sh                              # from the default checkout
CODINCOD_DIR=/path/to/codincodv2 ./build-ornament.sh
```

## Changes in `Background.qml`

Three, all of them additive:

- `import "Ornament.js" as Ornament`, and `Quickshell.Hyprland` for the gate.
- A block of tuning properties on the root item. Every number there is either
  read off the theme or explained where it sits. Nothing names a colour: the
  fish are drawn in `Color.accent` and their eyes punched out in
  `Color.background`, so a theme switch recolours the water for free and a
  theme nobody has written yet already works.
- A `water` item inside the panel, holding the simulation, a tick timer and a
  `Repeater` of `Shape` delegates.

### Why it costs nothing while you work

The timer runs only while `water.shown` is true, which asks Hyprland whether
the active workspace on this screen holds any window at all. Gaps are zero here
and no window is see-through, so one window anywhere means the wallpaper is
completely covered and there is nothing to animate. `Hyprland.toplevels` is fed
by the compositor's event socket, so that binding re-evaluates when a window
opens, closes or moves, and at no other time.

Both halves of that are load-bearing. If gaps or window opacity ever come back,
this gate starts freezing a shoal you can still see through the gaps, and it
should become a check on full-screen coverage instead.

## Resyncing after an Omarchy update

```bash
diff -u /usr/share/omarchy/shell/plugins/background/Background.qml Background.qml
```

Take upstream's version of everything outside the three additions above.
