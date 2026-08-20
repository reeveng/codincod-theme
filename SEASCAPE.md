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
- [x] **The month**: the moon keeps its own hours and its own shape. It rises
      about fifty minutes later each night, is a different sliver every one of
      them, comes back to the same shape after 29.53, and for the nights it is
      under the ground there is no moon over the water at all. The craters go
      out one at a time as the terminator crosses them. `sun.ts`
- [x] **Weather**, over both of them and under the whole sea: masses that cross
      the sky on headings of their own, some tracking flat across it and some
      rising and falling in place. What they take is the halo they cover and a
      share of the shaft below it, and what they give back is the light they
      took, drawn smaller than the mass that took it. Native renderer only; the
      plugin has a clear sky. `cloud.ts`

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
- [x] **Octopuses**: on the bottom rather than in the water, and the only thing
      in this water with a repertoire rather than a rhythm. It crawls, works its
      arms into the stones without moving, sits, buries itself, walks on the
      back pair, drops over a rock, and once in a while lets go and jets. How
      much of a day goes to each is off a published ethogram rather than
      invented, and jetting is mostly an answer to whatever went over the top of
      the picture. `cephalopods.ts`

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

## Things that are not listed here

There are a couple on the floor and this document does not say what they are. A
surprise with a page describing it is a feature with a whimsical name, and the
whole of one is somebody finding it themselves. They are drawn in `relics.ts`
out of shapes in `Codincod.Social.Marks`, which is where to read if you are the
one maintaining them.

There is one in the water as well, and it keeps an appointment rather than
running on odds: about one day in the month has it and the rest do not. It is in
`visitors.ts` with the animals, and it is left to be found the same way.

- [ ] More, and rarer.

## Between the water and the eye

None of this is in the water. It is what the water is being looked at through,
and it is a separate list because the two are answered differently: everything
above is a simulation drawing itself, and everything here is one pass over the
finished frame. `Lens.qml`, and `lens.frag` beside it.

- [x] **Film grain**, hashed per pixel per frame rather than sampled off a tile,
      because a tile laid over a desktop is a pattern somebody eventually sees.
      It is a dither as much as a look: this scene is a few flat fills in one hue
      over a long gradient, and eight bits of alpha down a whole screen leaves
      too few values to get there without seams. The bands in the water and down
      every shaft of light were real, and grain is what took them out.
- [x] **A vignette**, the corners giving up light they cannot gather. Towards no
      light rather than towards the water's own surface colour, which is the one
      darkening in this scene that may not be a wash of the theme: washed in the
      surface, the near rock at the edge of the frame, the darkest thing in the
      picture, came out as the lightest thing in it.
- [x] **Bloom** on the disc above the water, which is the only thing in the
      picture bright enough to have any: a veil out past the halo where the light
      scattered in the glass instead of landing where it was aimed, and a streak
      across it, which is what a lens does with a light it cannot quite hold. All
      three are the same `Glow.qml` with different amounts left in them, and one
      of them is the halo that was already there. Drawn as gradients rather than
      as a blur of the frame, which is the only version of bloom a wallpaper can
      afford. The white water off a hull is brighter still and gets none: it is a
      dozen puffs at once, each of which would want a gradient of its own, for a
      crossing that happens once a day.
- [x] **Depth of field**: the far wall soft, the near rock soft by how far
      forward each mass of it stands, everything between them as sharp as it was.
      Neither group moves, so the plugin renders each to a texture once and blurs
      it once, however long the sea is left on show; a blur of the fish would be
      that work again on every frame, which is the whole reason those two and
      nothing else. The native renderer draws and blurs them every frame instead,
      because it can: a quarter-size picture and two passes of nine taps over the
      rock alone measured inside the noise of a frame.
      The near rock takes less of it than it wants to. It is nearly black on dark
      water, so past about a quarter the blur does not defocus the branches on it,
      it deletes them.
- [ ] **Bokeh on the near snow**: a mote a hand from the glass as a soft disc
      rather than a hard dot. Held back rather than skipped: a mote is a couple of
      px across, so a soft edge on one is nothing, and it only becomes bokeh if the
      near ones are drawn several times the size they are now. That is a change to
      what the snow is rather than to how it is drawn, and it belongs in
      `drift.ts` with the rest of that argument.
- [x] **A handheld camera**: a few px of wander over the better part of a minute,
      and a fraction of a degree of roll, so the frame is held by somebody rather
      than bolted to a tripod. Two sines per axis whose periods do not divide each
      other, because one alone is a pendulum. The scene is drawn a little larger
      than its box to pay for it, which is what overscan is for: a frame that has
      wandered must never be a frame with the wallpaper showing along one edge.

Not on this list and deliberately: motion blur, chromatic aberration, lens dirt,
letterboxing, colour grading and a LUT. The first two are a blur and a fringe
that both need the finished frame read back as a texture, which is a screen's
worth of memory and a screen's worth of copy every frame for something nobody
would find. The rest fight the theme: this scene draws in the accent and cuts out
in the background so that a theme switch recolours the water, and a grade is a
second opinion about colour laid over the first.

## What each surface draws

Four renderers, one set of simulations. They do not all draw all of it, and that
is the point rather than a gap:

| | desktop | desktop, as it shipped | porthole | water behind a hero |
| --- | --- | --- | --- | --- |
| renderer | `seascape-rs/` | `Seascape.qml` | `glass.ts` + HEEx | `water.ts` |
| the shoal, all five kinds | yes | yes | yes | yes |
| the lens: grain, vignette | yes | yes | no | no |
| cephalopods, relics, passers | yes | yes | no | no |
| floor, flora, rays | yes | yes | hand-composed art | no |
| the hour | yes | yes | yes | no |
| every screen on the desk | no | yes | n/a | n/a |

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
  one meant whatever that number held was all anybody ever saw, and the rarest
  thing down there falls to about one sea in ten. A screen takes the new day up only once it is
  covered, so the ground never moves while somebody is looking at it.
- The day decides how much grew as well as where. Every count of a living thing
  goes through one multiplier off the same seed, weighted so that most water is
  ordinary and the bed you cannot see the floor through is something you wait
  for. The rock does not go through it: a cliff is not thicker on a good year.
  What a renderer can afford stays its own, and the caps here are the QML
  renderer's honest answer, which is why a rich day shows as thicker rather than
  as twice as thick.
- The shoal follows the light. Reef fish shelter after dark and the water over
  the sand thins out, so the count is a share of the day's, and the shoal is
  told the number rather than made to be it: it is worked towards from the edges
  over the minutes dawn takes anyway, because a fish appearing in the middle of
  the picture is the one thing the water promises never to do.
- The scene opens at the hour of the actual clock, wound forward and wrapped, so
  a machine that has been off comes back to water that carried on rather than to
  water that has been rewound.
- Nothing advances while the wallpaper is covered.
- It is ornament, so it is allowed to do nothing. Every branch that cannot get
  what it needs returns quietly.

## The native renderer

`seascape-rs/` is the water again, on the card, and it is what `install.sh`
installs. The same simulations decide the same scene: the ornament is bundled
into `js/scene.js` and hosted in V8, so what a fish is doing is settled by the
same TypeScript the site runs and nothing about the animals is written twice.
What is written twice is the drawing, and only the drawing.

Three things cross from the simulation to the renderer, and nothing else does.

**The bed, once.** The ground, the reef and every plant as a tree of limbs. It
is tessellated once, uploaded once, and then bent on the card: a limb carries
where it is rooted and which limb it grows off, a plant carries how far it is
leaning this frame, and the vertex shader walks the tree. So a bed of two
hundred plants costs two numbers a plant a frame rather than a recut.

**Everything else, every frame,** as drawings. A drawing is a shape, a colour to
mix it from, how heavy it is, how it gives out and how far back it stands. There
is no fish in the renderer and no moon either: `js/` says what a thing looks
like and the ornament stays the one place any of it is decided. They are cut
with lyon and drawn in two passes, one sorted by depth for anything solid and
one painted in order for anything the water is seen through, since two lights
over one another are a painting rather than a stack of depths.

**The rock the lens gave up on,** as a picture of its own. See the depth of
field above.

Colour is a fragment's own business rather than a vertex's. Every shape carries
a weight and which of the theme's colours to mix from, and the shader reads the
water at the height the fragment is at, which is how a thing that fades to
nothing fades into the water it is actually in rather than into a hole.

### Knowing when nobody is looking

Wayland has no way to tell a surface that nothing can see it, and the frames
keep being offered to a wallpaper behind a full screen of windows: measured, a
third of a core spent on a picture nobody is looking at. So the compositor is
asked instead, once a second, on Hyprland's own socket, and a single window
anywhere on the active workspace means the water is covered. `Background.qml`
asks the same question of the same compositor through Quickshell and settles it
the same way. Covered, the frame is still asked for and nothing else happens, so
the moment a window closes the water is there rather than a second behind.

One frame is drawn however covered it is. A layer surface with no buffer on it
was never mapped, and a rule about not advancing is a rule about the water
waiting rather than about the wallpaper being a black rectangle. That one cost a
black desktop for a minute.

### Held against the plugin

The QML plugin is the reference. Neither renderer is right by construction, so
the way a difference gets found is a still of the same sea at the same hour off
both of them:

```bash
cd seascape    && ./look.sh preview.qml width=1600 height=1000 seed=7 daylight=1 march=0.3 out=/tmp/qml.png
cd seascape-rs && cargo run --release -- width=1600 height=1000 seed=7 daylight=1 march=0.3 out=/tmp/rs.png
```

Both harnesses take the same arguments and both mean the same thing by them.
`daylight`, `dusk`, `march` and `lit` ask for an hour rather than reading one
off the clock, which two stills taken in different minutes cannot be compared
without. Both wind the rare things on, so a boat and a shark are in the picture
rather than waiting for an evening. Both hold the water for three seconds before
the grab, because a manta covers a couple of hundred px in three seconds.

What that turned up, in order: a moon clipped by the island because the body was
drawn about the origin and moved afterwards, a hairline down the moon's lit limb
where the curve renderer split the arc, grain as full-height vertical streaks
because a `vec2` in a uniform is laid out aligned by the shader and packed by
the host, and the sea being drawn without a boat in it because `eager` was not
passed on.

### What a frame costs there

At 2560x1440 on the same AMD 780M, with the water `rushed`, averaged over 200
frames: about 20ms, against the plugin's 54ms. The simulation is 1.4ms of it,
publishing is under a tenth of a millisecond, cutting what moved is 8ms, and the
card is the rest. The tick is 33ms, so the plugin never made it and this clears
it with the frame to spare.

The simulation is the same JavaScript in both, and it is fifteen times cheaper
here. That is the boundary rather than the engine: QML's V4 copies values across
into QML types, and V8 writes floats into a buffer the renderer reads straight
out of.

### What it reads off the desktop

Four things, and none of them are in the water. Which sea today is, out of the
same ornament the plugin asks. Whether anybody can see it, above. The picture
the machine is wearing, out of `omarchy/current/background`, which is hung
behind the water and cropped to each screen: the sea is drawn at most of an
alpha and has been since the plugin, so what is under it is somebody's
wallpaper rather than a flat fill. And the two colours it draws in, which are the accent and the background of the theme the
desktop is wearing, read off `omarchy/current/theme/colors.toml` and re-read
when that file changes, so a theme switch recolours the sea rather than leaving
one theme's water on another theme's desktop. `ink=` and `surface=` on the
command line take it out of that arrangement, since an argument is somebody
having decided.

Every screen gets its own surface, its own sea and its own weather, and they
share one card. Two panels are two beds rather than one stretched over both:
they are different sizes, a bed is cut to fit the box it grew in, and a fish
that swam off one towards the other could never arrive. Whether anybody is
looking is asked screen by screen, since a desk can hold a full screen of code
and an empty desktop beside it.

A screen that changes size is fitted again from nothing rather than stretched:
the bed is cut to fit the box it grew in, and every texture the card holds is
that size. A screen that changes how dense it is gets the same water out of a
different number of pixels: the sea is laid out in the units a desktop is laid
out in, and the buffer is as many pixels as the screen actually has.

### What it does not do

Two things the plugin has, both of them about the picture rather than the water.
A wallpaper that changes wipes across underneath the fish on the plugin, because
the shell owns two images and a mask; here it is swapped between frames. And a
screen set to a fraction of a scale is drawn at the whole number above it and
handed to the compositor to bring down, since nothing here speaks
`wp_fractional_scale_v1` yet.

## Looking at it

Neither renderer can be judged at the weight it ships at, which is the lesson
that cost the most time here: at four percent opacity in dark green, a wreck
that is upside down and a wreck that is working look identical.

```bash
# One still of the whole scene, offscreen, without taking over a desktop.
./look.sh preview.qml seed=28 daylight=0 dusk=0 settle=40 out=sea.png

# Every silhouette, large and alone, on a sheet. This is the one that finds
# drawing bugs.
./look.sh shapes.qml

# A clip, as frames. The scene's own timer is off and the water is stepped by
# hand, so the rate is the one asked for however long each grab takes.
./look.sh record.qml out=/tmp/frames frames=240 fps=20 width=1280 height=800

# A clip, as a gif. The same frames, scaled down and through one palette.
./gif.sh seed=28 seconds=8 wide=600 out=sea.gif
```

Through `look.sh` rather than `qml6`, and that is not tidiness: the offscreen
platform on its own loads Qt's software scene graph, which paints with QPainter
and ignores `preferredRendererType`, so every sheet would answer for a renderer
the desktop never runs.

`seed` picks which water: most of what lies on the floor is placed by a roll of
the dice, so the only way to see the rare things is to ask for a sea that has
one.
`settle` winds the scene on before the grab, and it is the only way to catch a
boat.

## What the plugin costs

Everything under this heading is the QML plugin, which is where all of this was
worked out and is still the reference. What the native renderer costs is a
section of its own, above.

```bash
# Where a frame goes, at a desktop's size, on Qt's curve renderer.
./bench.sh frames=120 width=2560 height=1440

# The same water with a layer left out, which is the only way to price one.
./bench.sh zero=specks

# The same water before anything was allowed to hold a drawing.
./bench.sh tolerance=0
```

A frame is the JavaScript and the scene graph added together, and `bench.sh`
reports both halves and the rate they allow. The JavaScript is one `advance` and
one `publish`; the scene graph is Qt's own polish, sync, render and swap, which
it reports when asked in the environment and which no amount of moving work out
of `publish` can hide.

Two things about the numbers. They are medians, because a machine being worked on
has a browser and an indexer on it and one stalled frame is worth a third of a
mean. And the water is `rushed`, which is the harness setting that forces the
rare things, so what is measured is a sea with a flock crossing it and a boat
overhead rather than the quiet one most seconds hold.

`render` is not the cost of drawing the scene. A still frame of it draws in about
a millisecond. It is the cost Qt pays per `Shape` node whenever anything in the
window has changed, and it is linear in how many nodes there are: measured across
a bed sown at a tenth of its density and at full, about 13 microseconds each.

Three things fall out of that, and the third is the one that costs time to learn.

The curve renderer charges per path rather than per item. Three thousand lines
cost the same whether they are three thousand shapes or two hundred, so putting
several lines in one `ShapePath` is what saves anything, and putting them in one
`Shape` is not.

There is a knee. The same three thousand lines cost 39ms as a path each, 13ms as
fifty paths of sixty, and 22ms as one path holding all of them. One giant path is
worse than the thing it replaced.

Merging pays only where it removes many nodes. A plant's leaves were a path each
and the bed lost 1671 shapes, which took the frame from 114ms to 60ms. The same
change on a crab's legs and an octopus's arms removes about 150 shapes and makes
the frame 20ms worse, repeatably, on a quiet machine: a `PathSvg` rebuilt every
frame costs more than the nodes it saves. It was tried, measured and taken out.
Rounding the numbers written into those paths costs more than the digits it
saves, too.

### Where a frame went, and where it goes now

At 2560x1440, on an AMD 780M, with the water `rushed` so a flock is crossing it
and a boat is overhead.

| | before | now |
| --- | --- | --- |
| `advance` | 15ms | 5ms |
| `publish` | 44ms | 19ms |
| polish and sync | 26ms | 8ms |
| render | 86ms | 19ms |
| swap | 5ms | 4ms |
| **a frame** | **150ms, or 6.6 a second** | **54ms, or 19 a second** |

Three changes account for nearly all of it, and none of them cost a quality
argument. A speck became a rectangle, because a round-capped line is a stadium
and the flock was two fifths of the entire render for a straight line. A plant's
leaves became one path, because the curve renderer charges by the path and they
are all one weight in one ink. And a plant is now cut as finely as it is seen and
no finer, which is the level of detail the bed always wanted.

The first two are the same picture to the pixel. The third is a different bed of
the same density, because thinning a count changes what the seed spends its
draws on.

### What the bed costs now

The bed above was measured before it was thickened and before the front of the
picture reached the bottom edge of the box. It stopped a tenth of the way up it,
which is where the nearest rooted thing stood, so the bottom of the screen was
the face of the sand seen from above with nothing on it and nothing able to be on
it. Both ends of the ground read as bare: the front because nothing could stand
there, the back because a plant scaled by distance outright is a hair the haze
takes first. So there is more ground to fill now as well as more in every square
of it.

At 2560x1440, on the same machine, at the density above and at the one the scene
sows now:

| | the bed as it was | as it is now |
| --- | --- | --- |
| plants | 317 | 622 |
| `publish` | 26ms | 43ms |
| render | 20ms | 43ms |
| **a frame** | **65ms** | **121ms** |

Two things were bought back on the way, and both are the rule the bed already had
about how finely a line is cut, applied to what a line costs.

A leaf stroked a fifth finer than a strand two px wide is a leaf four tenths of a
px finer, and nothing sees that. Under `bladeSplit` those leaves go in the
strand's own path and the plant costs one path rather than two, which is worth
about a fifth of the frame: the curve renderer charges by the path and the bed is
most of the paths in the scene. A near kelp is over the line and keeps its finer
leaf.

And a drawing made of tapering strokes wants stroking once per width in it rather
than once per stroke. `gathered` in `flora.ts` puts every stroke of one width
into one `d`, which draws identically, so a boulder coral is one path instead of
four. A handful of tables serve every coral in the bed, every reef head and every
sprig on a wall, and each is gathered once and held.

What is left is the frame itself. It is over the tick and it was over the tick
before this; the renderer is still the whole of what is left to win, and that
argument is above.

### What the bench cannot see

The render loop is forced to `basic`, so a frame is stepped, synced, rendered and
reported in that order on one thread. A desktop runs the threaded loop, which
overlaps this frame's render with the next frame's JavaScript. So the real
background is somewhere between the sum reported here and the larger of its two
halves, and the numbers above are the pessimistic end of that. Nobody has
measured the optimistic end, because measuring it means taking somebody's screen
away for as long as it takes.

Every number here is also one machine's. The per-shape cost is a driver's and a
GPU's as much as Qt's.

### The ceiling

The JavaScript is 24ms of the 54, and it is not going to fall much further.
`advance` is 5ms and is the simulation actually simulating. `publish` is 19ms, of
which 11 is spent with the tolerance set to infinity: that is, with nothing
recut and no simulation work at all. It is the cost of handing arrays across the
JavaScript and QML boundary, and a boundary does not get cheaper by making one
side of it faster.

Which is the answer to every version of "run it in something quicker". QML's
JavaScript engine is Qt's V4 and cannot be swapped while the code stays JS.
WebAssembly is not an option at all: `WebAssembly` is undefined in that engine,
as is `Worker`. Hosting either means a compiled QML plugin embedding a runtime,
which is the same shipping problem as writing the thing in Rust or C++ outright,
and it would still be copying values out of linear memory for QML to read.

A compiled type that hands the scene graph its geometry directly would break the
boundary properly. That is `seascape-rs/`, and it did not end the arrangement
where the site and the desktop run the same TypeScript: it hosts the same
TypeScript in V8 and hands triangles to the card. See below.

So a frame of this scene at this size will not go under about 25ms, and 200
frames a second is 5ms. The number worth aiming at is the tick, which is 33ms.

### Two things that sound right and are not

**One giant SVG.** Measured, on three thousand lines: 39ms as a path each, 13ms
as fifty paths of sixty, 22ms as one path holding all of them. Past about a
hundred lines the cost per path turns back upwards. A single path would also
force every plant in it to share one stroke width and one colour, which is the
objection decision 27 already makes to batching the bed.

**One giant image.** Caching the scene into a texture, with `layer.enabled` and
multisampling on the scene root, costs 8ms of render and makes the picture worse:
the sway then resamples a texture instead of the geometry, and the distance from
the reference goes from 46.6dB to 41.1dB. The bed genuinely changes every frame
as well, so the texture would be rebuilt anyway.

### The renderer is the rest of it

Everything above leaves the curve renderer where it is. It is now the whole of
what the scene graph costs: 19ms of render and 6ms of polish, against 3ms and
2ms for the geometry renderer drawing the same scene. Qt's own documentation is
where this stops being a surprise. The curve renderer "performs a certain amount
of preprocessing of the input path on the CPU during the polishing phase, and
this is potentially expensive", and the geometry renderer "does not support
antialiasing, so you will typically want to enable multi-sampling".

Both halves of that were measured here. The geometry renderer alone takes the
frame to 31ms and breaks the fine grass into dashes, which is visible at 1:1 and
would shimmer as the bed sways. With `QSG_SAMPLES=4` it takes the frame to 28ms
and the dashes go: over the bed alone, the geometry renderer differs from the
curve reference in 1702 px and the geometry renderer with multisampling in 733.

What it wants is an environment variable on the shell rather than a line in this
repository, which is why it is a decision and not a commit. Todo 531 in the
CodinCod repository holds it.
