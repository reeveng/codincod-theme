# The seascape, and everything still owed

Everything asked for, in one place, so nothing is lost between sessions. The
simulations live in `assets/js/ornament/` in the CodinCod repository; this repo
renders them. Both the website and the desktop get all of it.

## In the water

- [x] **Marine snow** falling through the whole column, reading the same field
      the fish read, so it is the water becoming visible rather than dust.
      `drift.ts`
- [x] **Bubbles**, in bursts off a vent and then a long rest, swelling and
      wobbling as they rise. `drift.ts`
- [x] **Light rays** through the surface, each on its own slow breath, drawn as
      stacked wedges so they fade across their width as well as down their
      length. `rays.ts`
- [x] **The hour**: a sun by day and a moon by night, in the same place with the
      same shaft of light under it, from the sun's real altitude at the reader's
      own longitude. Dusk is warm and falls off with depth; night is a wash over
      everything. `sun.ts`

## The bottom

- [x] **Sand**, as a rolling profile rather than a line, and the thing every
      other layer roots to. `seabed.ts`
- [x] **Stones** lying on it. `seabed.ts`
- [x] **Cliffs** standing further out in the murk, and **hills** behind those:
      the ground is a function of distance as well as of position, so a far bed
      sits higher, rolls flatter and is painted in the water's own colour rather
      than being the near one shifted up. `seabed.ts`
- [x] **Kelp**, at its own distance and rooted on the ground there, leaning on the shared current, blades trailing.
      `flora.ts`
- [x] **Grass**, in clumps of a handful of blades that barely lean. `flora.ts`
- [x] **Coral**, four of them: a boulder, a bush, a staghorn and the site's
      own. None of them sway, because they are skeletons. `flora.ts`
- [x] **Volcanic vents**: a chimney on the floor with a plume coming off it,
      shearing on the same current everything else reads. `relics.ts`

## The animals

- [x] **Five fish species**, each with its own way of moving: the cruiser that
      was here first, a darter that bursts and stops, a drifter crossing the
      murk on one heading, escorts that hold station in pairs, and a swordfish
      with a bill on it. `shoal.ts`
- [x] **No animal comes back around.** A fish that leaves the picture is gone
      and its place is refilled with one drawn fresh, so a shoal of six is not
      six animals on a belt. `shoal.ts`
- [x] **Squid**: jet and drift, the opposite rhythm to a fish. A hard pulse,
      then a long passive glide with the tentacles trailing. `cephalopods.ts`
- [x] **Octopuses**: on the bottom rather than in the water, arms working over
      the stones. `cephalopods.ts`

## Once in a great while

- [x] **Shipwrecks**, lying on the floor in the murk. `relics.ts`
- [x] **A diving boat** crossing the surface with a wake astern. `passers.ts`
- [x] **Sonar blips**, three rings staggered, never from the middle of the
      picture. `passers.ts`
- [x] **A submarine**, seen from the side because it is at your own depth
      rather than on the surface, on about one day in seven. `passers.ts`
- [x] **Appointments rather than intervals.** Each of the three happens at most
      once in a day, at a moment the day's plan decides, and then waits for
      somebody to be there: the water only advances while the wallpaper is
      uncovered, so a thing that is rare per minute of that is a thing you see
      every time you clear a workspace. `passers.ts`

## Easter eggs

- [x] **The chest with a laptop open on its lid, screen still lit.** The site's
      own, from `Marks.chest/1`: "the joke the site is named after, said once
      and quietly". `relics.ts`
- [x] **A sunken code block**, from `Marks.code_block/1`. `relics.ts`
- [ ] More, and rarer.

## What each surface draws

Three renderers, one set of simulations. They do not all draw all of it, and
that is the point rather than a gap:

| | desktop | porthole | water behind a hero |
| --- | --- | --- | --- |
| renderer | `Seascape.qml` | `glass.ts` + HEEx | `water.ts` |
| the shoal, all five kinds | yes | yes | yes |
| cephalopods, relics, passers | yes | no | no |
| floor, flora, rays | yes | hand-composed art | no |
| the hour | yes | yes | no |

The porthole's floor is authored scenes rather than simulation, and the water
behind a hero is a band of open water with a page's own words in it. A
shipwreck under a heading would be a picture asking to be looked at, which is
the one thing that surface may not be.

## Rules the whole scene keeps

- Nothing names a colour. Everything is drawn in the theme's accent and cut out
  in its background, so a theme switch recolours the sea.
- Everything reads the same Perlin field, so the plants, the snow and the fish
  agree about which way the water is moving. That agreement is what makes it a
  sea rather than several animations sharing a rectangle.
- Everything is seeded. The same seed gives the same water twice, which is why
  the place is the same place all day and the life in it is not.
- The desktop's seed is the calendar day, so tomorrow is somewhere else: a fixed
  one meant whatever that number held was all anybody ever saw, and the chest
  falls to about one sea in ten. A screen takes the new day up only once it is
  covered, so the ground never moves while somebody is looking at it.
- The scene opens at the hour of the actual clock, wound forward and wrapped, so
  a machine that has been off comes back to water that carried on rather than to
  water that has been rewound.
- Nothing advances while the wallpaper is covered.
- It is ornament, so it is allowed to do nothing. Every branch that cannot get
  what it needs returns quietly.

## Looking at it

Neither renderer can be judged at the weight it ships at, which is the lesson
that cost the most time here: at four percent opacity in dark green, a wreck
that is upside down and a wreck that is working look identical.

```bash
# One still of the whole scene, offscreen, without taking over a desktop.
QT_ASSUME_STDERR_HAS_CONSOLE=1 QT_QPA_PLATFORM=offscreen \
  qml6 preview.qml -- seed=28 daylight=0 dusk=0 settle=40 out=sea.png

# Every silhouette, large and alone, on a sheet. This is the one that finds
# drawing bugs.
QT_ASSUME_STDERR_HAS_CONSOLE=1 QT_QPA_PLATFORM=offscreen qml6 shapes.qml

# A clip. The scene's own timer is off and the water is stepped by hand, so the
# rate is the one asked for however long each grab takes.
QT_QPA_PLATFORM=offscreen qml6 record.qml -- \
  out=/tmp/frames frames=240 fps=20 width=1280 height=800 settle=90
```

`seed` picks which water: most of what lies on the floor is placed by a roll of
the dice, so the only way to see the chest is to ask for a sea that has one.
`settle` winds the scene on before the grab, and it is the only way to catch a
boat.
