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
| `seabed.ts`, `flora.ts` | the ground at every distance, and what grows out of it |
| `relics.ts` | what lies on the floor, and the plume off the vent |
| `passers.ts` | the boat overhead, the sonar, and the submarine |
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
- `daylight`, `dusk` and `today` on the root item, read off `Ornament.sunNow`
  and `Ornament.daySeed` every time `SystemClock` turns the minute. They live on
  the root rather than on each `Seascape` because there is one sun, one date,
  and there may be three monitors. The clock is the system's rather than a
  `Timer` of ours, because a `Timer` counts the time the machine was awake for:
  a laptop shut at three in the morning and opened at ten came back to the sky
  it was shut on, and put a full moon over somebody's breakfast.
- A `Seascape` inside the panel, anchored to the panel rather than to either
  wallpaper image, so changing the background wipes across underneath the fish
  and they swim on through it without a break.
- Nothing names a colour: the sea is drawn in `Color.accent` and cut out in
  `Color.background`, so a theme switch recolours the water for free and a theme
  nobody has written yet already works. The sun and the moon are the two
  exceptions, and they have to be; a green moon is not a moon.

### Why it does not open on the same picture every time

The bed and everything rooted in it is a pure function of the seed, so the place
is the same place all day, which is what a place is for. The life in it is not:
`Seascape.opening` puts the water at the hour of the actual clock, wrapped at
`cycle`, so a machine that has been off for ten minutes comes back to water that
carried on rather than to water that has been rewound.

It wraps because the only way to know where a fish is after an hour of swimming
is to swim it, at a step per tenth of a second of that hour. `cycle` is set
where the wait at login is the one this scene always had, and a couple of
minutes is long enough that the water is rearranged past recognition anyway.
Nothing is written to disk and nothing is read back: a clock is a clock on every
machine, so two screens open on the same moment of the same water for free.

### Why almost nothing happens

The boat, the sonar and the submarine keep appointments rather than counting
seconds. Each is due at most once a day, at a moment the day's plan decides, and
the submarine is only due on about one day in seven. Once the clock is past that
moment the crossing is owed: it happens the next time the wallpaper is uncovered
for long enough, so a machine that was off at four in the morning still gets its
boat, and a machine nobody looks at all day gets one crossing rather than the
nine it was owed.

That is a change of clock, not of numbers. The scene advances only while the
wallpaper is visible, so a passer that was rare per minute of scene time was a
passer you saw nearly every time you cleared a workspace. Rarity anybody can
feel is rarity in the day. Nothing is written to disk, so restarting the shell
forgets what has already crossed and a day with a restart in it can hold a
second boat.

### What a passer does to the water

A hull leaves churn: puffs of white water off the stern that swell, open into
the V a hull leaves, and thin out where they lie. They belong to the water
rather than to the boat, so they stay where they were made while it goes on, and
they are still dying out after it has left the picture. `frothInk` is the weight
they are drawn at and it is above the hull's own, which is the only weight in
`Seascape.qml` that outranks the thing it belongs to: white water is the
brightest thing on a sea, and at that distance the wake is what somebody picks
out first.

The wake replaced two straight lines off the stern that were supposed to be one.
They read as a beam, which made the boat look like the thing that was pinging
and made the ping itself look like nothing.

The fish answer both. `Passers.startle` is a push out from a point that
`shoal.ts` takes as something to get away from, so the shoal under a hull dives
and scatters and a ping empties the water in front of it. A ping is felt as far
out as its leading ring has got, which is why the water goes on emptying for as
long as the sound is travelling.

### Why the sea is different tomorrow

`root.today` is `Ornament.daySeed`, the local calendar day stirred into a seed,
and everything that does not move comes out of it: the bed, the hills, the
cliffs, the stones, where each plant is rooted and which relics the floor
happens to hold. One fixed seed meant the floor never changed, so whatever that
number held was all anybody ever saw, and the rarest thing down there falls to
about one sea in ten. A fresh seed per boot is the opposite failure:
nowhere to come back to.

A `Seascape` is offered the new day but does not take it while it is on show.
`Seascape.adopt` waits for `running` to go false, which is the mounter saying
the wallpaper is covered, so the ground rearranges itself behind a window and
never under anybody's eyes. A machine left staring at an empty workspace keeps
the sea it has.

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
