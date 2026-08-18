import QtQuick
import QtQuick.Shapes
import "Ornament.js" as Ornament

/**
 * A body of water, drawn.
 *
 * The desktop's answer to CodinCod's `water.ts`: the simulations live in
 * `Ornament.js`, built from `assets/js/ornament/` in the CodinCod repository,
 * and what is here is only the part that has to touch a scene graph. Sizing a
 * box, a tick, and how dark a thing is allowed to be.
 *
 * It knows nothing about wallpapers, compositors or which workspace you are on.
 * `running` is handed in by whoever mounts it, which is what lets the same
 * component be a desktop background and an offscreen preview.
 *
 * Nothing here names a colour. Everything is drawn in `ink` and cut out in
 * `surface`, both supplied, so the water is whatever the theme is in.
 */
Item {
  id: root

  /** The hue everything alive is drawn in, and the surface behind it. */
  property color ink: "#35c26d"
  property color surface: "#0e1712"

  /** Whether to advance. False parks the scene exactly where it stands. */
  property bool running: true

  /**
   * How light it is above the water, 0 at night and 1 in the day.
   *
   * The site's `--daylight`, and this is the throughline: the porthole on
   * codincod.com darkens at the reader's own hour and puts a moon in the top
   * right when it does, so a desktop drawn from the same ornament had better do
   * the same thing at the same time. Whoever mounts this decides it, because
   * this component knows nothing about clocks.
   */
  property real daylight: 1

  /**
   * How near the water is to a sunset, 0 most of the day and 1 at the turn.
   *
   * A separate number from `daylight` and not derivable from it, because dusk
   * is not half a day. It rises and falls twice, once at each end, and the
   * light it puts in the water is warm where the night's is only less.
   */
  property real dusk: 0

  /**
   * The disc above the water, and the light off it.
   *
   * The two colours in the entire component that are not the theme's. They have
   * to be: `ink` is whatever green, blue or grey the theme is in, and a green
   * moon is not a moon. The site states the same pair once in `app.css` for the
   * same reason, and these are its values.
   *
   * The sun is the warmer and slightly brighter of the two, and that is the
   * whole difference between them. They are the same size in the same place,
   * because they are the same light at a different hour.
   */
  property color dusklight: "#e8a34d"
  property color moonlight: "#f2ebd9"
  property color sunlight: "#ffeec2"

  /**
   * Where each body has got to in its own crossing, and how big both are drawn.
   *
   * `sun` and `moon` are `Ornament.sunNow`'s, handed in by whoever mounts this
   * for the same reason `daylight` is: the component knows nothing about
   * clocks. Each is `{ arc, march }`, 0 to 1 from one horizon to the other.
   */
  property var sun: ({ arc: 0.8, march: 0.5 })
  property var moon: ({ arc: 0.8, march: 0.5 })

  /** The ends of a crossing, and the top and bottom of the arc between them. */
  property real discEast: 0.12
  property real discWest: 0.88
  property real discHigh: 0.055
  property real discLow: 0.17
  property real discR: 0.028

  /**
   * How far the shaft under it has drifted and opened by the bottom of the box,
   * as shares of the box's width.
   *
   * Its mouth is not a knob: it is the disc's own diameter, taken at the disc's
   * own centre line, so the two edges are tangent to it and the lower half of
   * the disc sits inside its own light. Started anywhere below that line the
   * mouth is wider than the disc is at that height, and the light appears to
   * come out of the moon's sides. That was a real bug on the site, found by
   * somebody looking at a window rather than at a path.
   */
  /**
   * How far the shaft's foot swings either side of the body over a crossing.
   *
   * A body low in the east throws its light down and away to the west; one
   * overhead throws it straight down. Half of this each way, so a shaft stands
   * upright at the middle of a passage and leans hardest at the horizons.
   */
  property real discSwing: 0.34
  property real discSpread: 0.085

  /**
   * How bright the disc's own shaft is at its mouth, and the night wash over
   * everything.
   *
   * The porthole gets away with a flat fifteen percent because it is two
   * hundred units across and the shaft crosses a coin. Here the same triangle
   * is a quarter of a desktop, and whatever a viewer's eye lands on first is
   * not a background. Three percent at the mouth, and gone by the middle.
   */
  /**
   * How much of a shaft's light is left, a share of the way down it.
   *
   * Light in water does not thin out in a straight line, and the exponent is
   * the whole difference between a beam and a stage light: at 1 the shaft holds
   * half its strength halfway down and ends in a hard hem, and past about 3 it
   * is gone before it has left the body it came from.
   */
  function beam(hue, through) {
    return Qt.rgba(hue.r, hue.g, hue.b, discInk * Math.pow(1 - through, 2.6))
  }

  /**
   * How far down a shaft off a disc goes, and how wide the glow around it is.
   *
   * The shaft is short because it is faint, and a faint gradient over a long
   * run is a stack of flat bands: eight bits of alpha over a third of a
   * screen leaves a handful of distinct values, and each place two of them
   * meet is a hard line across the beam. The same light over a shorter run
   * has the same handful of values with the seams too close together to read
   * as lines.
   *
   * Most of the light is the halo instead, which does not have that problem.
   * Its bands are rings around a disc rather than lines across a cone, and a
   * ring around a light is what a light in water actually has.
   */
  property real discFall: 0.34

  property real haloReach: 4.2

  property real haloInk: 0.07

  property real discInk: 0.012
  property real duskInk: 0.09
  property real nightInk: 0.3

  /** How far down the box the shaft has faded out, as a share of the height. */
  property real discReach: 0.62

  /**
   * Salt. The same seed gives the same water twice.
   *
   * Everything that does not move is a pure function of it: the bed, the hills,
   * the cliffs, every stone, where each plant is rooted, and which relics the
   * floor happens to hold. So handing over a new one is not a setting being
   * changed, it is a different place. See `adopt` for when that is allowed to
   * happen.
   */
  property int seed: 1956

  /** The seed the water currently on show was built from; see `adopt`. */
  property int sown: 0

  /**
   * Skip the wait before the first boat and the first ping, and open the water
   * at a stated age rather than at the hour of the clock.
   *
   * For the preview harness and nothing else, and both halves are the same
   * wish: a still that can be taken twice and compared. On a desktop the
   * passers are minutes apart on purpose, and a boat you get for turning the
   * screen on is a boat on a schedule; `opening` is the other half.
   */
  property bool rushed: false

  // ------------------------------------------------------------------- weights
  //
  // How dark each layer may be, as a share of full ink. The order is the order
  // of importance: an animal may be seen, texture may be felt, and light is
  // nearly nothing at all.

  property real openWater: 0.22
  property real snowInk: 0.15
  property real bubbleInk: 0.3
  property real rayInk: 0.07

  /**
   * How much of the light gets through, which is mostly a question of the hour.
   *
   * Shafts are a daytime thing: what makes one is a bright small source and a
   * surface to break it up, and at midnight there is no bright small source.
   * They do not go out altogether, because a moon over calm water throws the
   * same beams and weaker ones are the whole of the difference.
   */
  readonly property real overcast: root.moonRays + (1 - root.moonRays) * root.daylight

  property real moonRays: 0.28

  /** How much of a creature's weight is its depth. One in the murk is a hint. */
  property real depthInk: 0.65

  // ------------------------------------------------------------------- density
  //
  // Counted against the box rather than set outright, so the same component
  // fills a laptop panel and a wall without being retuned for either.

  property real pxPerFish: 105000
  property int minFish: 6
  property int maxFish: 22

  property real pxPerMote: 12500
  property int minMotes: 40
  property int maxMotes: 280

  /** Places on the floor that bubble, and shafts coming through the surface. */
  property int vents: 3
  property int shafts: 5

  /**
   * How the shoal is made up, by kind.
   *
   * `Ornament.WILD`, which is what the porthole and the water behind the site's
   * hero are both built from. It was written out here as its own table until
   * the site grew the same two renderers, at which point three copies of one
   * mix was three places for it to drift. The shares are shares rather than
   * numbers; see `ShoalOptions.species`.
   */
  property var species: Ornament.WILD

  /** Cephalopods. Few: they are the thing you notice, so there is little of it. */
  property int squids: 2
  property int octopuses: 2

  /**
   * How dark an octopus may be.
   *
   * Its own, and heavier than the open water's, because it is the one animal in
   * the scene drawn against the sand rather than against the water. A creature
   * at the open water's weight sitting on ground drawn at `sandInk` is a
   * creature nobody can see: the number that matters is not how dark it is, it
   * is how much darker than what is behind it.
   */
  property real crawlerInk: 0.42

  // ------------------------------------------------------------------ the bed
  //
  // What the water sits on, and what grows out of it.
  //
  // Per thousand px of width rather than outright. A floor is a line and not an
  // area, so its width is what decides how much of it there is to fill, and a
  // flat count is a count tuned for one screen: nine kelp across a laptop is a
  // bed, and the same nine across a wall is a bed with most of it missing. The
  // numbers are what looked right at 1600 wide, over 1.6.
  //
  // The ceilings are what keep a place from becoming a texture. One kelp too
  // many turns a seabed into a lawn, and that is still true on a big screen.

  /** How thick a blade is drawn against the strand it belongs to. */
  property real bladeGirth: 0.8

  property real kelpsPerK: 12
  property real grassesPerK: 62
  property real coralsPerK: 22
  property real stonesPerK: 25
  property real cliffsPerK: 5.5

  property int leastOfEach: 2
  property int mostKelps: 38
  property int mostGrasses: 155
  property int mostCorals: 52
  property int mostStones: 64
  property int mostCliffs: 16

  /**
   * How many bands of ground stand between the sand and the horizon.
   *
   * A count rather than a density, because these run the whole width of the box
   * whatever it is: what a wider screen wants is not more of them, it is the
   * same ones drawn longer. Four is what it takes for the eye to read a slope
   * going away rather than a wall with a step in it.
   *
   * The ceiling on it used to be six, and it moved with the water rather than
   * with taste. The bands were drawn against a column that was one colour from
   * top to bottom, so the fourth came out the same green as the third and there
   * was nothing to be had by cutting a fifth. Light that runs out with depth
   * gives each of them a different water to stand against, and the ceiling is
   * whatever the ramp from the haze to the sand can be cut into and still be
   * counted: six steps of it are about four levels of green apiece, and four
   * levels is the least the eye reads as one hill being in front of another.
   * Seven was one too many and the far half of the bed came out as a single
   * mass with lines drawn on it.
   */
  property int ranges: 6

  /**
   * How much of the wallpaper the water hides.
   *
   * The one alpha in the scene that is not light. Everything else is painted
   * opaque, and this is what that costs: for a near fish to hide a far one,
   * there has to be something for them both to be in front of.
   *
   * Not the whole way, because the wallpaper underneath is somebody's picture
   * and this is water over it rather than a replacement for it. What is left of
   * it reads as the murk having texture, which is more than the flat fill it
   * would otherwise be.
   */
  property real waterInk: 0.88

  /**
   * How much darker a cut-out is than the shape it is cut from: an eye, the
   * bands on a chest, the shadow under a lid.
   *
   * A hole is not the background colour. Painted in the water's own colour it
   * would be a window through the animal onto the water behind, which is the
   * thing everything here is drawn opaque to avoid. It is the same body at a
   * third of its weight, which is the same body, darker.
   */
  property real cutShade: 0.34

  /**
   * How far off the water's own colour the lit top of the column is, at noon.
   *
   * The one number that makes the water a volume rather than a backdrop. Every
   * other weight in the scene is measured against `surface`, which is the water
   * at the very bottom of the box, so a column that ran flat from top to bottom
   * left every distance to be carried by the shapes alone: the far ground came
   * out the same colour as the water it stood in, arithmetically the same, and
   * the top half of the picture was one field of green with fish in it.
   *
   * Light from above is what a body of water has instead of a horizon. Put it
   * back and the bottom of the box is deep because it is dark, and the hills at
   * the back are hills because they are darker than the water behind them.
   */
  property real waterLid: 0.13

  /**
   * How much of that light is still about at midnight.
   *
   * Not none. A night sea is not a black rectangle: there is a moon on it for
   * half the month and a sky behind that, and what reaches this far down is
   * little rather than nothing. What it must not do is stay at the day's
   * strength, because then the two hours look the same and the clock the whole
   * sun is read off buys nothing anybody can see.
   */
  property real lidNight: 0.24

  /**
   * How fast the light runs out on the way down.
   *
   * Light in water falls off a curve and not a ramp, which is the difference
   * between a sea and a printed gradient: the first fathom takes most of it and
   * the rest is spent slowly. At 1 the column is a straight fade and the eye
   * reads a wall that has been shaded; past about 3 the light is gone before it
   * has left the surface and the box is flat again a few hundred px lower.
   */
  property real sinkage: 2.1

  /** The lit top of the column at the hour it actually is. */
  readonly property real lit:
    root.waterLid * (root.lidNight + (1 - root.lidNight) * root.daylight)

  /** How dark the ground and the things rooted in it may be, at the front. */
  property real sandInk: 0.19
  property real stoneInk: 0.25
  property real floraInk: 0.33

  /**
   * What anything down there weighs at the back of the water.
   *
   * The one number that makes the bottom a distance rather than a shelf. A
   * weight is what it is worth at the front of the picture, and everything
   * rooted, lying or standing is drawn somewhere between that and this,
   * according to how far back it is; see `farInk`.
   *
   * Low, because there is no such thing as a far thing that is nearly as dark
   * as a near one. Water is what is between you and it, and there is a lot of
   * water. It is not zero either: a band that reached the colour of the water
   * would be a band nobody could find, and then the distance would be gone
   * again for the opposite reason.
   */
  property real hazeInk: 0.016

  /**
   * The light along the top edge of ground, and how wide that edge is drawn.
   *
   * The one line of every band that is not facing away from the surface. Fills
   * alone gave four bands within a few hundredths of each other, which is what
   * distance actually does to them and also what makes them one grey mass: the
   * boundaries were there in the arithmetic and under the eye's own threshold.
   * A lit crest puts the boundary back without brightening the mass behind it,
   * and it is what a slope in water looks like from below anyway.
   *
   * It goes back with everything else, so the near sand has a bright lip and
   * the furthest hills have almost none, which is the second time the same
   * statement is made and the reason it reads at a glance.
   */
  property real crestInk: 0.2

  /**
   * What a cliff's own edge is worth, however far back it stands.
   *
   * A cliff is drawn where there is no light left to model it with: its fill
   * goes to the haze with everything else, and a mass the colour of the water
   * it is in is not a mountain, it is nothing. So its edge is held above the
   * haze and the shape comes back as an outline, which is all a silhouette
   * ever was.
   *
   * The ground bands are deliberately not given this. They are stacked a few
   * dozen px apart across the whole width, and a line along the top of each is
   * a contour map rather than a country: what tells two of them apart is that
   * one is in front of the other, and that is a mass and not an edge.
   */
  property real hazeCrest: 0.085

  property real crestWidth: 1.5

  /**
   * How dark what is lying on the bottom may be, and what is coming off it.
   *
   * A relic is faint, because it is scenery and because the murk is what sells
   * it: a wreck at the weight of a fish would be the subject of the picture, and
   * this picture is about the water.
   */
  property real relicInk: 0.24
  property real plumeInk: 0.2

  /**
   * The last of a puff's life, over which it lets go of its own body.
   *
   * A quarter. It has to be enough that nobody catches the moment a puff stops
   * being there, and little enough that the plume is a solid column for the
   * part of its life anybody is looking at, which is the part near the rock.
   */
  property real plumeLetGo: 0.25

  /**
   * The one exception in the whole scene.
   *
   * The laptop screen on the chest is drawn at full ink, brighter than anything
   * alive. That is the joke: down in the dark, under a hundred faint animals,
   * there is a lit rectangle the size of a fingernail. Nothing else is allowed
   * to be that bright, which is the only reason it can be found at all.
   */
  property real screenInk: 1

  /** How dark a boat and a ping may be. Both are far off, so barely at all. */
  property real hullInk: 0.16
  property real pingInk: 0.22

  /**
   * How many wedges one shaft is drawn from.
   *
   * A shaft has to fade along its length and across its width at once, and a
   * fill takes one gradient. The length is the one worth having as a real
   * gradient, since that is where the light runs out; the width is faked by
   * stacking narrowing wedges, each adding its share, so the edge falls off in
   * steps too small and too faint to count. Drawn as a single wedge it reads as
   * a tinted polygon laid on the water, which is the one thing it must not.
   */
  property int shaftPlies: 4

  /**
   * Bubbles are made and destroyed as the vents fire, and a Repeater handed a
   * changing count rebuilds every delegate it owns. So the pool is fixed and
   * deep enough for bursts to overlap, and the slots past the live ones sit
   * empty. A vent firing into a full pool loses that bubble, which is a cheaper
   * failure than a stutter every time one reaches the surface.
   */
  property int bubblePool: 96

  // --------------------------------------------------------------------- pace

  /** Body lengths a second. Slower than the site's: this is behind your work. */
  property real cruise: 0.8

  /** Nose to tail, in px. Larger than the site's, because this box is a screen. */
  property real shortest: 52
  property real longest: 92

  /** How far the scene is wound on before it is first shown, in seconds. */
  property real settle: 40
  property real settleStep: 1 / 20

  /**
   * The step a wind is taken in, which is the largest step there is.
   *
   * Every sim clamps its own step at a tenth of a second, because a frame that
   * stalled for a second must not teleport a fish across the picture. That
   * clamp is also the floor on what winding costs: ask for a bigger step and
   * the water advances by a tenth anyway, so the scene comes out younger than
   * it was asked to be. This is that ceiling, stated once, and it is twice
   * `settleStep` because nothing is being watched while it runs.
   */
  property real windStep: 1 / 10

  /**
   * How long the water's own day is, in seconds, before its clock comes round.
   *
   * The scene used to open on the same picture every single time: same seed,
   * same forty seconds of winding, so a fish was in the same place at every
   * login and after every reboot. The place is meant to be the same, since it
   * is a place; the life in it is not.
   *
   * So the water is opened at the hour of the actual clock rather than at zero,
   * and a machine that has been off for ten minutes comes back to water that
   * has moved on rather than to water that has been rewound. What it cannot do
   * is follow the clock for ever: the only way to know where a fish is after an
   * hour of swimming is to swim it, which is a step per fiftieth of a second of
   * that hour. So the clock wraps, and this is where. Anything past a couple of
   * minutes is rearranged past recognition anyway, which is why a short day
   * costs nothing that could be noticed and a long one costs a wait at login.
   *
   * See `windOn` for what a second of it costs, and `opening` for the arithmetic.
   */
  property int cycle: 150

  /** Frames a second. Nobody looks straight at a background. */
  property int tick: 33

  // ------------------------------------------------------------------ the sims

  property var shoal: null
  property var drift: null
  property var light: null
  property var seabed: null
  property var flora: null
  property var inklings: null
  property var wreckage: null
  property var passers: null

  property int herd: 0
  property int flurry: 0
  property int beams: 0

  /** The box the scene was last built or refitted at; see `refit`. */
  property size fitted: Qt.size(0, 0)

  /**
   * How many delegates the rare layers keep standing.
   *
   * A Repeater handed a changing count rebuilds every delegate it owns, and the
   * relics and the passers are exactly the layers whose count changes: a boat
   * arrives, a ping goes out, a plume grows and retires. So these are ceilings
   * rather than counts, the slots past the live ones sit empty, and nothing is
   * ever built or destroyed while somebody is looking at it.
   */
  property int relicSlots: 4

  /**
   * Enough for every puff a vent has in the water at once.
   *
   * `PUFF_LIFE / PUFF_GAP` in `relics.ts`, and a margin. Set under that, the
   * slots run out at the young end of the list, which is the end nearest the
   * rock: the plume then floated a hand's width above the chimney with clear
   * water in between, venting from nothing.
   */
  property int plumeSlots: 76
  property int passerSlots: 4

  /**
   * Flat copies of the simulations' records, republished once a tick.
   *
   * The simulations mutate their creatures in place, so handing the same
   * objects back every frame would leave every binding on them looking at a
   * value QML has already decided has not changed. These are throwaway copies,
   * and they are what makes the picture move.
   */
  property var fishes: []
  property var motes: []
  property var bubbles: []
  property var rays: []

  /** The ground, published once when it is cut rather than every tick. */
  property var sand: []
  /** The height the sand's own edge sits at; see `seatOf`. */
  property real shore: 0
  property var hills: []
  property var scarp: []
  property var rocks: []
  /** The plants, republished every tick, because they lean. */
  property var growth: []

  /** The cephalopods, and what is on the bottom or going over the top of it. */
  property var jetters: []
  property var crawlers: []
  property var sunken: []
  property var plume: []
  property var crossing: []

  /**
   * A weight as a colour, opaque, rather than as an alpha.
   *
   * The scene used to hand every weight straight to an alpha channel, and the
   * result was an X-ray: two fish crossing showed through each other, a wreck
   * showed through the sand it was half buried in, and nothing ever occluded
   * anything. Depth was there in the arithmetic and absent from the picture.
   *
   * Distance in water is not transparency, it is colour: a far thing is not a
   * thing you can see through, it is a thing the water between you has already
   * turned its own colour. So a weight picks a point between the water and the
   * ink and the shape is painted solid in it. Near things are bright green,
   * far things are all but the water, and a near one drawn over a far one hides
   * it, which is the whole of what was missing.
   *
   * Light is the exception and stays an alpha, because a shaft really is
   * something you see through.
   *
   * The catch is what a weight of nothing comes to. It is the surface colour,
   * which is the water at the very bottom of the box and nowhere else, so
   * anything drawn opaque and faded to nothing is a hole rather than an
   * absence. Everything that fades that far has to fade towards the water it is
   * actually in; see `waterAt` and what the plume does with it.
   */
  function tint(weight) {
    var w = Math.max(0, Math.min(1, weight))
    return Qt.rgba(surface.r + (ink.r - surface.r) * w,
                   surface.g + (ink.g - surface.g) * w,
                   surface.b + (ink.b - surface.b) * w,
                   1)
  }

  /**
   * The colour of the water itself at a height in the box.
   *
   * The water is lit from above and it is a gradient, so there is no single
   * water colour to fade into: what is water at the top of the box is a hole in
   * it at the bottom. This is the one statement of that, and the column below
   * is painted from it as well, so the two can never drift apart.
   *
   * It is what anything dissolving rather than swimming away has to become. A
   * puff of a vent's smoke used to end its life as the surface colour, which is
   * water only along the very bottom edge: what a reader saw was the plume turn
   * into a stack of dark discs a few feet above the rock, hold there, and then
   * blink out one at a time as each reached its age.
   */
  function waterAt(y) {
    var t = height > 0 ? Math.max(0, Math.min(1, y / height)) : 0
    var glow = Math.pow(1 - t, sinkage)
    var lid = tint(lit)

    return Qt.rgba(surface.r + (lid.r - surface.r) * glow,
                   surface.g + (lid.g - surface.g) * glow,
                   surface.b + (lid.b - surface.b) * glow,
                   1)
  }

  /** The water at a share of the way down the box, as the gradient wants it. */
  function column(at) {
    var hue = waterAt(at * height)
    return Qt.rgba(hue.r, hue.g, hue.b, waterInk)
  }

  /**
   * A weight against the water at a height, rather than against the surface.
   *
   * What anything in the water is drawn in, and it is a different question from
   * what anything on the bottom is drawn in. `tint` measures against `surface`,
   * which is the water at the very bottom of the box: fine for a hill, which is
   * a mass the water is in front of, and wrong for a fish, which is in the
   * water and has to stay a step off whatever the water is where it is
   * swimming. With the column lit from above, a fish drawn by `tint` came out
   * the exact colour of the water at one particular height and vanished as it
   * swam through it.
   *
   * At the bottom of the box the two agree, because there the water is the
   * surface colour. Everywhere above it this keeps the contrast the weight was
   * asking for.
   */
  function afloat(y, weight) {
    var w = Math.max(0, Math.min(1, weight))
    var base = waterAt(y)

    return Qt.rgba(base.r + (ink.r - base.r) * w,
                   base.g + (ink.g - base.g) * w,
                   base.b + (ink.b - base.b) * w,
                   1)
  }

  /**
   * What a weight is worth at a distance, for anything standing on the bottom.
   *
   * The bed used to scale its weights by depth outright, which sounds like the
   * same thing and is not: a multiply drives a far thing to nothing, so the
   * hills at the back were painted at a hundredth of full ink and the whole
   * distance was invisible. The scene had cliffs in it that nobody had ever
   * seen. This runs between the haze and the thing's own weight instead, so the
   * furthest ground is faint and still there.
   *
   * Not for anything swimming. A fish is in the water rather than on the
   * bottom, and `depthInk` is that: it keeps a share of its weight whatever the
   * distance, because an animal that faded into the murk as far as the ground
   * does would be an animal the eye loses in the middle of a stroke.
   */
  function farInk(full, depth, floor) {
    var low = floor === undefined ? hazeInk : floor
    return low + (full - low) * Math.max(0, Math.min(1, depth))
  }

  /** A per-thousand-px-of-width density as a count this box can hold. */
  function spread(perThousand, most) {
    return Math.max(leastOfEach, Math.min(most, Math.round(width * perThousand / 1000)))
  }

  function fishCount() {
    return Math.max(minFish, Math.min(maxFish, Math.round(width * height / pxPerFish)))
  }

  function moteCount() {
    return Math.max(minMotes, Math.min(maxMotes, Math.round(width * height / pxPerMote)))
  }

  function build() {
    if (width < 2 || height < 2) return

    herd = fishCount()
    flurry = moteCount()
    beams = shafts

    seabed = Ornament.createSeabed({
      cliffs: spread(cliffsPerK, mostCliffs),
      height: height,
      ranges: ranges,
      seed: seed,
      stones: spread(stonesPerK, mostStones),
      width: width,
    })

    flora = Ornament.createFlora({
      corals: spread(coralsPerK, mostCorals),
      floor: seabed.floorAt,
      grasses: spread(grassesPerK, mostGrasses),
      height: height,
      kelps: spread(kelpsPerK, mostKelps),
      seed: seed,
      width: width,
    })

    shoal = Ornament.createShoal({
      count: herd,
      cruise: cruise,
      height: height,
      longest: longest,
      seed: seed,
      shortest: shortest,
      species: species,
      width: width,
    })

    inklings = Ornament.createCephalopods({
      floor: seabed.floorAt,
      height: height,
      octopuses: octopuses,
      seed: seed,
      squids: squids,
      width: width,
    })

    wreckage = Ornament.createRelics({
      floor: seabed.floorAt,
      height: height,
      seed: seed,
      width: width,
    })

    passers = Ornament.createPassers({
      eager: rushed,
      height: height,
      seed: seed,
      width: width,
    })

    drift = Ornament.createDrift({
      floor: seabed.floorAt,
      height: height,
      motes: flurry,
      seed: seed,
      vents: vents,
      width: width,
    })

    light = Ornament.createRays({ count: beams, height: height, seed: seed, width: width })

    // Wound on before anybody sees it, the way the site winds its own still
    // frame, so nothing opens on a row of fish abreast on their starting line
    // or on snow that has not yet had time to spread through the water. How far
    // on is the clock's business rather than this line's; see `opening`.
    windOn(opening())
    cutGround()
    publish()
    fitted = Qt.size(width, height)
    sown = seed
    report()
  }

  /**
   * What this water turned out to hold, for the preview harness.
   *
   * Worth having a line for, because nearly everything added last is placed by
   * a roll of the dice: a preview showing no wreck is either a sea without one
   * or a wreck that will not draw, and there is no way to tell those apart by
   * looking. It runs after the scene is wound on rather than before, which is
   * the difference between reporting what is in the water and reporting what
   * had not happened yet.
   */
  function report() {
    // Only under `rushed`, which is the preview harness. A desktop background
    // that wrote a line to the shell's log every time a monitor woke up would
    // be a background nobody could leave running.
    if (!rushed) return

    var found = []
    for (var r = 0; r < wreckage.relics.length; r++) {
      found.push(wreckage.relics[r].kind + "@" + Math.round(wreckage.relics[r].x))
    }

    var over = []
    for (var c = 0; c < passers.passing.length; c++) {
      over.push(passers.passing[c].kind + "@" + Math.round(passers.passing[c].x) +
                " along " + passers.passing[c].along.toFixed(2))
    }

    console.log("seascape " + Math.round(width) + "x" + Math.round(height) +
                ", relics: " + (found.join(", ") || "none") +
                ", passing: " + (over.join(", ") || "none"))
  }

  /**
   * Re-fit to a box that has actually changed.
   *
   * The guard is not an optimisation. A Seascape anchored to fill its parent
   * gets its width and its height in two separate steps, so a build is followed
   * by up to two refits at the size it was already built at, and a refit is not
   * free of consequence: it re-seats the bed, thins or grows the shoal, and
   * throws away whatever was crossing the surface. A boat that launched during
   * the first frame was being dropped before anybody could see it.
   */
  function refit() {
    if (!shoal) return build()
    if (fitted.width === width && fitted.height === height) return

    fitted = Qt.size(width, height)
    herd = fishCount()
    flurry = moteCount()
    seabed.resize(width, height)
    flora.resize(width, height, seabed.floorAt)
    shoal.resize(width, height, herd)
    drift.resize(width, height, flurry)
    light.resize(width, height, beams)
    inklings.resize(width, height, seabed.floorAt)
    wreckage.resize(width, height, seabed.floorAt)
    passers.resize(width, height)
    cutGround()
    publish()
    report()
  }

  function advance(dt) {
    shoal.step(dt, null)
    drift.step(dt)
    light.step(dt)
    flora.step(dt)
    inklings.step(dt)
    wreckage.step(dt)
    passers.step(dt)
  }

  /**
   * Where the water is in its own day when this scene opens, in seconds.
   *
   * The wall clock, wrapped at `cycle`, on top of the settling every scene owes
   * itself. Nothing is written down and nothing is read back: a clock is a
   * clock on every machine and after every reboot, so two screens opening
   * together open on the same moment of the same water for free, and a screen
   * that opens an hour later does not open on the same picture.
   *
   * The preview harness is the exception. It asks for a stated number of
   * seconds because its whole job is to hand back the same still twice.
   */
  function opening() {
    if (rushed) return settle
    return settle + Math.floor(Date.now() / 1000) % Math.max(1, cycle)
  }

  /**
   * Carry the whole water forward by a stretch of time, as cheaply as it can be
   * carried.
   *
   * Everything that swims has to be swum: where a fish is after a minute is the
   * minute it spent getting there, and the sims clamp their own step so that a
   * stalled frame cannot teleport anything. That fixes the price of a wind at a
   * step per fiftieth of a second of it.
   *
   * The bed is the exception and it used to be three quarters of the bill. A
   * plant has no memory, so a stretch of time is an addition to its clock and
   * one recut at the end; see `Flora.wind`. What it cost before was two hundred
   * plants recut at every intermediate moment, all of them pictures of a past
   * nobody was ever going to see.
   *
   * The passers are the other exception, and for the opposite reason. They keep
   * appointments on the wall clock rather than a stopwatch, and each of them
   * happens at most once in a day; winding them here would spend the day's boat
   * on the two minutes of water that exist to be skipped. So they are left
   * where they are, which is waiting.
   */
  function windOn(seconds) {
    var steps = Math.round(Math.max(0, seconds) / windStep)

    for (var i = 0; i < steps; i++) {
      shoal.step(windStep, null)
      drift.step(windStep)
      light.step(windStep)
      inklings.step(windStep)
      wreckage.step(windStep)

      // The preview harness only. It exists to catch the rare things and it is
      // the one caller allowed to spend them; see the note above.
      if (rushed) passers.step(windStep)
    }

    flora.wind(steps * windStep)
  }

  /** Points as QML wants them, with the box's floor closed off underneath. */
  function polygon(points, closed) {
    var out = []
    for (var i = 0; i < points.length; i++) out.push(Qt.point(points[i].x, points[i].y))
    if (closed && points.length) {
      out.push(Qt.point(points[points.length - 1].x, height + 2))
      out.push(Qt.point(points[0].x, height + 2))
    }
    return out
  }

  /**
   * The ground, cut once.
   *
   * Sand, stones and cliffs are pure functions of the seed and the box, so they
   * are published when they change rather than every tick. A seabed republished
   * at thirty frames a second is thirty rebuilds of a shape that did not move.
   */
  /**
   * The height a band of ground is seen at, which is the height of its own top
   * edge.
   *
   * A band is closed off under the box, so most of it is behind the bands in
   * front of it and the only part anybody sees is the strip between its crest
   * and the next crest along. That strip is where its colour has to work, so
   * that is the water it is weighed against; see `afloat`.
   */
  function seatOf(ridge) {
    if (!ridge.length) return height

    var sum = 0
    for (var i = 0; i < ridge.length; i++) sum += ridge[i].y
    return sum / ridge.length
  }

  function cutGround() {
    if (!seabed) return

    sand = polygon(seabed.ridge, true)
    shore = seatOf(seabed.ridge)

    var country = []
    for (var b = 0; b < seabed.ranges.length; b++) {
      var band = seabed.ranges[b]
      country.push({
        depth: band.depth,
        points: polygon(band.ridge, true),
        seat: seatOf(band.ridge),
      })
    }
    hills = country

    var walls = []
    for (var c = 0; c < seabed.cliffs.length; c++) {
      var cliff = seabed.cliffs[c]
      walls.push({
        depth: cliff.depth,
        points: polygon(cliff.ridge, true),
        seat: seatOf(cliff.ridge),
      })
    }
    scarp = walls

    var lying = []
    for (var t = 0; t < seabed.stones.length; t++) {
      var stone = seabed.stones[t]
      lying.push({
        depth: stone.depth,
        lean: stone.lean,
        rise: stone.rise,
        span: stone.span,
        x: stone.x,
        y: stone.y,
      })
    }
    rocks = lying
  }

  function publish() {
    if (!shoal) return

    var swimming = []
    for (var i = 0; i < shoal.fish.length; i++) {
      var one = shoal.fish[i]
      swimming.push({
        bill: Ornament.SPECIES[one.kind].bill,
        depth: one.depth,
        facing: one.facing,
        size: one.size,
        tail: one.tail,
        tilt: one.tilt,
        x: one.x,
        y: one.y,
      })
    }
    fishes = swimming

    var falling = []
    for (var m = 0; m < drift.motes.length; m++) {
      var mote = drift.motes[m]
      falling.push({ depth: mote.depth, r: mote.r, x: mote.x, y: mote.y })
    }
    motes = falling

    var rising = []
    for (var b = 0; b < drift.bubbles.length && b < bubblePool; b++) {
      var bubble = drift.bubbles[b]
      rising.push({ depth: bubble.depth, r: bubble.r, x: bubble.x, y: bubble.y })
    }
    bubbles = rising

    var growing = []
    for (var g = 0; g < flora.plants.length; g++) {
      var one = flora.plants[g]
      var blades = []
      for (var bl = 0; bl < one.blades.length; bl++) blades.push(polygon(one.blades[bl], false))
      growing.push({
        blades: blades,
        depth: one.depth,
        girth: one.girth,
        kind: one.kind,
        points: polygon(one.points, false),
        scale: one.scale,
        twigs: one.twigs,
        x: one.x,
        y: one.y,
      })
    }
    growth = growing

    var shining = []
    for (var r = 0; r < light.rays.length; r++) {
      var ray = light.rays[r]
      shining.push({ glow: ray.glow, reach: ray.reach, span: ray.span, tilt: ray.tilt, x: ray.x })
    }
    rays = shining

    // A squid's body and arms are rebuilt from its squeeze here rather than in
    // a binding, because the squeeze is the one number both are read off and
    // splitting them would have the drawing and the arms a frame apart.
    var jetting = []
    for (var s = 0; s < inklings.squids.length; s++) {
      var squid = inklings.squids[s]
      var limbs = []
      var drawn = Ornament.squidArms(squid.squeeze)
      for (var a = 0; a < drawn.length; a++) limbs.push(polygon(drawn[a], false))
      jetting.push({
        arms: limbs,
        body: Ornament.squidBody(squid.squeeze),
        depth: squid.depth,
        facing: squid.facing,
        size: squid.size,
        tilt: squid.tilt,
        x: squid.x,
        y: squid.y,
      })
    }
    jetters = jetting

    var crawling = []
    for (var o = 0; o < inklings.octopuses.length; o++) {
      var octopus = inklings.octopuses[o]
      var arms = []
      var reaching = Ornament.octopusArms(octopus.crawl, octopus.facing, octopus.haul)
      for (var q = 0; q < reaching.length; q++) arms.push(polygon(reaching[q], false))
      crawling.push({
        arms: arms,
        depth: octopus.depth,
        facing: octopus.facing,
        haul: octopus.haul,
        jetting: octopus.jetting,
        lift: octopus.lift,
        size: octopus.size,
        x: octopus.x,
        y: octopus.y,
      })
    }
    crawlers = crawling

    var lying = []
    for (var w = 0; w < wreckage.relics.length && w < relicSlots; w++) {
      var relic = wreckage.relics[w]
      lying.push({
        depth: relic.depth,
        kind: relic.kind,
        lean: relic.lean,
        scale: relic.scale,
        x: relic.x,
        y: relic.y,
      })
    }
    sunken = lying

    var pouring = []
    for (var p = 0; p < wreckage.plume.length && p < plumeSlots; p++) {
      var puff = wreckage.plume[p]
      pouring.push({ age: puff.age, r: puff.r, x: puff.x, y: puff.y })
    }
    plume = pouring

    var going = []
    for (var v = 0; v < passers.passing.length && v < passerSlots; v++) {
      var passer = passers.passing[v]
      going.push({
        along: passer.along,
        facing: passer.facing,
        kind: passer.kind,
        scale: passer.scale,
        weight: passer.weight,
        x: passer.x,
        y: passer.y,
      })
    }
    crossing = going
  }

  /**
   * Take up a new seed, once there is nobody it could take it from.
   *
   * A seed is a place, so adopting one is the seabed rearranging itself, and a
   * seabed that rearranged itself under somebody's eyes would be the one moment
   * this whole scene admitted to being a program. `running` is already the
   * answer to whether anybody can see this: whoever mounts it sets it false
   * when the wallpaper is covered. So the day's water is taken up the next time
   * a window is opened over yesterday's, which on a desktop is within minutes
   * of the day turning and is never once witnessed.
   *
   * A machine left staring at an empty workspace keeps the sea it has, and that
   * is the right way round: the alternative is the ground moving in front of
   * the only person in a position to watch it.
   */
  function adopt() {
    if (shoal && !running && seed !== sown) build()
  }

  onSeedChanged: adopt()
  onRunningChanged: adopt()
  onWidthChanged: refit()
  onHeightChanged: refit()
  Component.onCompleted: build()

  Timer {
    interval: root.tick
    repeat: true
    running: root.running && root.shoal !== null
    onTriggered: {
      root.advance(root.tick / 1000)
      root.publish()
    }
  }

  // The water itself, behind everything, and the only thing here you can see
  // through. Everything drawn over it is opaque, so this is what a far fish
  // fades into and what a near one hides it against; see `tint`.
  //
  // Darker with depth, because light comes from one direction and it is up.
  Rectangle {
    anchors.fill: parent
    z: -4

    // A stop every eighth of the way down rather than one at each end. The
    // column is a curve now, and a gradient with two stops on it is the chord
    // of that curve: the same two ends, none of the falloff between them, and
    // the light spread evenly down a box it is meant to run out of near the
    // top. Eight is where the seams stop being findable.
    gradient: Gradient {
      GradientStop { position: 0; color: root.column(0) }
      GradientStop { position: 0.125; color: root.column(0.125) }
      GradientStop { position: 0.25; color: root.column(0.25) }
      GradientStop { position: 0.375; color: root.column(0.375) }
      GradientStop { position: 0.5; color: root.column(0.5) }
      GradientStop { position: 0.625; color: root.column(0.625) }
      GradientStop { position: 0.75; color: root.column(0.75) }
      GradientStop { position: 0.875; color: root.column(0.875) }
      GradientStop { position: 1; color: root.column(1) }
    }
  }

  // Cliffs, standing further out than anything else in the water. Nothing roots
  // to them and nothing collides with them: a silhouette at the back is the
  // cheapest statement that the sea carries on past the edge of the picture,
  // and without one the scene is a tank.
  Repeater {
    model: root.scarp.length

    delegate: Shape {
      id: wall
      required property int index

      readonly property var cliff: root.scarp[index] || null

      anchors.fill: parent
      preferredRendererType: Shape.CurveRenderer
      visible: cliff !== null
      z: cliff ? -3.4 + cliff.depth : -3.4

      ShapePath {
        fillColor: root.afloat(wall.cliff ? wall.cliff.seat : 0,
                               root.farInk(root.sandInk, wall.cliff ? wall.cliff.depth : 0))
        strokeColor: root.afloat(wall.cliff ? wall.cliff.seat : 0,
                                 root.farInk(root.crestInk, wall.cliff ? wall.cliff.depth : 0,
                                             root.hazeCrest))
        strokeWidth: root.crestWidth

        PathPolyline { path: wall.cliff ? wall.cliff.points : [] }
      }
    }
  }

  // The ground between the sand and the horizon, cut at four distances.
  //
  // Each band is the whole floor as it stands that far back, closed off under
  // the box, so what the eye reads is one slope going away rather than four
  // shapes. Where two of them overlap is a hill in front of a hill, and the dip
  // between two crests is a valley, both for nothing: they are the same field
  // read at different distances, so they never agree and never contradict.
  //
  // Furthest first, and each a little heavier than the one behind it. That
  // ordering is the whole illusion; see `farInk`.
  Repeater {
    model: root.hills.length

    delegate: Shape {
      id: bank
      required property int index

      readonly property var band: root.hills[index] || null

      anchors.fill: parent
      preferredRendererType: Shape.CurveRenderer
      visible: band !== null
      z: band ? -3 + band.depth : -3

      ShapePath {
        fillColor: root.afloat(bank.band ? bank.band.seat : 0,
                               root.farInk(root.sandInk, bank.band ? bank.band.depth : 0))
        strokeColor: root.afloat(bank.band ? bank.band.seat : 0,
                                 root.farInk(root.crestInk, bank.band ? bank.band.depth : 0))
        strokeWidth: root.crestWidth

        PathPolyline { path: bank.band ? bank.band.points : [] }
      }
    }
  }

  // The sand.
  Shape {
    anchors.fill: parent
    preferredRendererType: Shape.CurveRenderer
    visible: root.sand.length > 0
    z: -2

    ShapePath {
      fillColor: root.afloat(root.shore, root.sandInk)
      strokeColor: root.afloat(root.shore, root.crestInk)
      strokeWidth: root.crestWidth

      PathPolyline { path: root.sand }
    }
  }

  // Stones, lying where they fell. Rounded rather than drawn: at this weight a
  // stone is a mass with a lean on it, and an outline would make it a pebble
  // somebody had illustrated.
  Repeater {
    model: root.rocks.length

    delegate: Rectangle {
      required property int index

      readonly property var stone: root.rocks[index] || null

      antialiasing: true
      color: root.afloat(stone ? stone.y : 0,
                         root.farInk(root.stoneInk, stone ? stone.depth : 1))
      height: stone ? stone.rise : 0
      radius: height / 2
      rotation: stone ? stone.lean * 180 / Math.PI : 0
      visible: stone !== null
      width: stone ? stone.span : 0
      x: stone ? stone.x - width / 2 : 0
      y: stone ? stone.y - height * 0.62 : 0
      z: stone ? -2 + stone.depth * 0.3 : -1.8
    }
  }

  // Kelp, grass and coral. Sorted into the water by depth like everything else,
  // so a fish passes behind a near plant and in front of a far one.
  Repeater {
    model: root.growth.length

    delegate: Item {
      id: sprout
      required property int index

      readonly property var one: root.growth[index] || null
      readonly property real weight: one ? root.farInk(root.floraInk, one.depth) : 0

      anchors.fill: parent
      visible: one !== null
      z: one ? one.depth : 0

      // A strand is stroked rather than filled: it is a line with a thickness,
      // and giving it an outline to fill would double every plant.
      Shape {
        anchors.fill: parent
        preferredRendererType: Shape.CurveRenderer
        visible: sprout.one !== null && sprout.one.kind !== "coral"

        ShapePath {
          capStyle: ShapePath.RoundCap
          fillColor: "transparent"
          strokeColor: root.afloat(sprout.one ? sprout.one.y : 0, sprout.weight)
          strokeWidth: sprout.one ? sprout.one.girth : 0

          PathPolyline { path: sprout.one && sprout.one.kind !== "coral" ? sprout.one.points : [] }
        }
      }

      // Whatever else the plant is made of: leaves for kelp, the rest of the
      // clump for grass. Which of those it is drawing is the plant's business
      // and not this Repeater's; all it knows is that a blade is a line to be
      // stroked a little finer than the strand it came with.
      Repeater {
        model: sprout.one ? sprout.one.blades.length : 0

        delegate: Shape {
          id: leaf
          required property int index

          anchors.fill: parent
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: root.afloat(sprout.one ? sprout.one.y : 0, sprout.weight)
            strokeWidth: sprout.one ? sprout.one.girth * root.bladeGirth : 0

            PathPolyline { path: sprout.one ? sprout.one.blades[leaf.index] : [] }
          }
        }
      }

      // Coral is the site's own drawing, and it does not sway: it is a
      // skeleton, and with everything else moving it is what the movement is
      // measured against.
      Item {
        visible: sprout.one !== null && sprout.one.kind === "coral"
        x: sprout.one ? sprout.one.x : 0
        y: sprout.one ? sprout.one.y : 0

        Repeater {
          model: sprout.one ? sprout.one.twigs.length : 0

          delegate: Shape {
            id: branch
            required property int index

            readonly property var twig: sprout.one.twigs[index]

            preferredRendererType: Shape.CurveRenderer
            transform: Scale {
              xScale: sprout.one ? sprout.one.scale : 1
              yScale: sprout.one ? sprout.one.scale : 1
            }

            ShapePath {
              capStyle: ShapePath.RoundCap
              fillColor: "transparent"
              strokeColor: root.afloat(sprout.one ? sprout.one.y : 0, sprout.weight)
              strokeWidth: branch.twig.width

              PathSvg { path: branch.twig.d }
            }
          }
        }
      }
    }
  }

  /**
   * The two bodies above the water, in the order they are drawn.
   *
   * The sun first and the moon over it, which only matters at the two moments
   * of the day when both are up and near each other, and then only because one
   * of them has to be.
   */
  readonly property var bodies: [
    { cratered: 0, hue: root.sunlight, passage: root.sun, show: root.daylight },
    { cratered: 1, hue: root.moonlight, passage: root.moon, show: 1 - root.daylight },
  ]

  // The disc above the water, and the light coming off it. Behind everything
  // that swims, because it is up there and they are down here.
  // The two bodies above the water, and the light off whichever is up.
  //
  // Two rather than one that changes its mind. A single disc swapping identity
  // at dusk would set in the west and reappear a moment later in the east, and
  // a sky that jumps is worse than a sky with nothing in it. These cross the
  // picture on their own clocks, one fading as the other rises, which is what
  // the sky does.
  Repeater {
    // A count rather than the list itself, and the delegate reads the list by
    // index, which is what every other Repeater here does. A Repeater handed a
    // JS array throws away every delegate it owns and builds them again each
    // time that array is rebuilt, and this one is rebuilt on the minute now
    // that the sky is read off the wall clock. Two Shapes, a radial gradient
    // and ten gradient stops, torn down and stood up again every sixty seconds
    // to show a disc that has moved by a hair.
    model: 2

    delegate: Item {
      id: sky
      required property int index

      readonly property var modelData: root.bodies[index]

      // Not `x` and `y`: an Item already has both, as its own position, and
      // they are final. The same trap the light shafts hit with `top`.
      readonly property real r: root.height * root.discR
      readonly property real cx: root.width *
        (root.discEast + modelData.passage.march * (root.discWest - root.discEast))
      /** Highest in the middle of its crossing, low at either end. */
      readonly property real cy: root.height *
        (root.discLow + modelData.passage.arc * (root.discHigh - root.discLow))
      readonly property color hue: modelData.hue

      /**
       * Which way its light leans, and it is away from the body.
       *
       * A body over on the left throws its shaft down and to the right, and
       * one directly overhead throws it straight down. Both fall out of the
       * same line: the lean is how far off the middle of its crossing it is.
       */
      readonly property real lean: (0.5 - modelData.passage.march) * root.discSwing

      anchors.fill: parent
      opacity: modelData.show
      visible: opacity > 0.004
      z: -1.2

      // The glow around it, which is most of the light there is.
      Shape {
        anchors.fill: parent
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          fillGradient: RadialGradient {
            centerX: sky.cx
            centerY: sky.cy
            centerRadius: sky.r * root.haloReach
            focalX: sky.cx
            focalY: sky.cy

            GradientStop {
              position: 0
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.haloInk)
            }
            GradientStop {
              position: 0.22
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.haloInk * 0.72)
            }
            GradientStop {
              position: 0.42
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.haloInk * 0.42)
            }
            GradientStop {
              position: 0.64
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.haloInk * 0.18)
            }
            GradientStop {
              position: 0.82
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.haloInk * 0.06)
            }
            GradientStop {
              position: 1
              color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, 0)
            }
          }
          strokeColor: "transparent"

          PathSvg {
            path: "M " + (sky.cx - sky.r * root.haloReach) + " " + sky.cy +
              " a " + sky.r * root.haloReach + " " + sky.r * root.haloReach +
              " 0 1 0 " + sky.r * root.haloReach * 2 + " 0" +
              " a " + sky.r * root.haloReach + " " + sky.r * root.haloReach +
              " 0 1 0 " + -sky.r * root.haloReach * 2 + " 0"
          }
        }
      }

      // The shaft, its mouth the disc's own diameter at the disc's own centre.
      Shape {
        anchors.fill: parent
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          // A stop every tenth rather than a handful, because a gradient stop
          // is a corner: between two of them the alpha runs dead straight, and
          // where two straight runs meet at different slopes the eye reads a
          // line across the beam. Three stops on a curve this steep drew three
          // horizontal bands down the shaft. Ten of them on the same curve is
          // the same light with nowhere for a corner to show.
          fillGradient: LinearGradient {
            x1: 0
            y1: sky.cy
            x2: 0
            y2: root.height * root.discFall

            GradientStop { position: 0; color: root.beam(sky.hue, 0) }
            GradientStop { position: 0.1; color: root.beam(sky.hue, 0.1) }
            GradientStop { position: 0.2; color: root.beam(sky.hue, 0.2) }
            GradientStop { position: 0.3; color: root.beam(sky.hue, 0.3) }
            GradientStop { position: 0.4; color: root.beam(sky.hue, 0.4) }
            GradientStop { position: 0.5; color: root.beam(sky.hue, 0.5) }
            GradientStop { position: 0.62; color: root.beam(sky.hue, 0.62) }
            GradientStop { position: 0.75; color: root.beam(sky.hue, 0.75) }
            GradientStop { position: 0.88; color: root.beam(sky.hue, 0.88) }
            GradientStop { position: 1; color: root.beam(sky.hue, 1) }
          }
          strokeColor: "transparent"

          startX: sky.cx - sky.r
          startY: sky.cy

          PathLine { x: sky.cx + sky.r; y: sky.cy }
          PathLine {
            x: sky.cx + root.width * (sky.lean + root.discSpread)
            y: root.height
          }
          PathLine {
            x: sky.cx + root.width * (sky.lean - root.discSpread)
            y: root.height
          }
        }
      }

      Rectangle {
        antialiasing: true
        color: sky.hue
        height: sky.r * 2
        radius: sky.r
        width: height
        x: sky.cx - sky.r
        y: sky.cy - sky.r
      }

      // The craters, and only on the one that has them. A sun with three grey
      // spots on it is a moon somebody forgot to finish.
      Repeater {
        // Off-centre and unevenly sized on purpose. Three round spots spaced
        // evenly on a disc is a face, and the moment anybody sees a face
        // there they stop seeing a moon.
        model: sky.modelData.cratered
          ? [Qt.vector3d(-0.34, -0.22, 0.22),
             Qt.vector3d(0.19, -0.45, 0.1),
             Qt.vector3d(0.31, 0.3, 0.15)]
          : []

        delegate: Rectangle {
          required property vector3d modelData

          antialiasing: true
          color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b, 0.34)
          height: sky.r * modelData.z * 2
          radius: height / 2
          width: height
          x: sky.cx + sky.r * modelData.x - width / 2
          y: sky.cy + sky.r * modelData.y - height / 2
        }
      }
    }
  }

  // The light, behind everything and pinned there. A shaft is not an object
  // anything can swim in front of; it is the water being lit.
  Repeater {
    model: root.beams

    delegate: Item {
      id: shaft
      required property int index

      readonly property var ray: root.rays[index] || null
      readonly property real lean: ray ? ray.reach * Math.tan(ray.tilt) : 0
      // Not `top`: an Item already has one, as an anchor line, and it is final.
      readonly property real mouth: ray ? ray.span / 2 : 0
      readonly property real hem: ray ? (ray.span * Ornament.SPREAD) / 2 : 0

      anchors.fill: parent
      visible: ray !== null
      z: -1

      Repeater {
        model: root.shaftPlies

        delegate: Shape {
          id: ply
          required property int index

          /** The outermost ply is full width; each one inside it is narrower. */
          readonly property real inset: 1 - index / root.shaftPlies

          anchors.fill: parent
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillGradient: LinearGradient {
              x1: 0
              y1: 0
              x2: 0
              y2: shaft.ray ? shaft.ray.reach : 0

              GradientStop {
                position: 0
                color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b,
                               (root.rayInk / root.shaftPlies) * root.overcast *
                               (shaft.ray ? shaft.ray.glow : 0))
              }
              GradientStop {
                position: 1
                color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b, 0)
              }
            }
            strokeColor: "transparent"

            startX: shaft.ray ? shaft.ray.x - shaft.mouth * ply.inset : 0
            startY: 0

            PathLine { x: shaft.ray ? shaft.ray.x + shaft.mouth * ply.inset : 0; y: 0 }
            PathLine {
              x: shaft.ray ? shaft.ray.x + shaft.hem * ply.inset + shaft.lean : 0
              y: shaft.ray ? shaft.ray.reach : 0
            }
            PathLine {
              x: shaft.ray ? shaft.ray.x - shaft.hem * ply.inset + shaft.lean : 0
              y: shaft.ray ? shaft.ray.reach : 0
            }
          }
        }
      }
    }
  }

  // Marine snow, sorted into the fish by depth rather than laid over them, so a
  // near mote passes in front of a far animal and the water gets a thickness
  // the fish alone cannot give it.
  Repeater {
    model: root.flurry

    delegate: Rectangle {
      required property int index

      readonly property var mote: root.motes[index] || null

      antialiasing: true
      color: root.afloat(mote ? mote.y : 0, root.snowInk * (mote ? mote.depth : 0))
      height: mote ? mote.r * 2 : 0
      radius: height / 2
      visible: mote !== null
      width: height
      x: mote ? mote.x - mote.r : 0
      y: mote ? mote.y - mote.r : 0
      z: mote ? mote.depth : 0
    }
  }

  Repeater {
    model: root.herd

    delegate: Item {
      id: swimmer
      required property int index

      readonly property var fish: root.fishes[index] || null
      readonly property var frame: fish ? Ornament.frameAt(fish.tail) : null
      readonly property real span: fish ? fish.size / Ornament.SPAN : 1

      readonly property real weight: fish
        ? root.openWater * (1 - root.depthInk + root.depthInk * fish.depth)
        : 0

      /**
       * The angle to turn the drawing by, in degrees, and the animal's own.
       *
       * Never worked out here, and never adjusted here either. It is the whole
       * turn already, mirror and all; see `drawnTilt`. Every renderer used to
       * derive it from the heading and every one of them got it backwards for a
       * leftward animal, and then every one of them multiplied the fixed
       * version by `facing` a second time and got it backwards again.
       */
      readonly property real pitch: fish ? fish.tilt * 180 / Math.PI : 0

      visible: fish !== null && weight > 0.002
      x: fish ? fish.x : 0
      y: fish ? fish.y : 0
      z: fish ? fish.depth : 0

      transform: [
        Scale { xScale: swimmer.span * (swimmer.fish ? swimmer.fish.facing : 1); yScale: swimmer.span },
        Rotation { angle: swimmer.pitch },
      ]

      Shape {
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          fillColor: root.afloat(swimmer.fish ? swimmer.fish.y : 0, swimmer.weight)
          // A fish is three closed subpaths in one string: the body, the tail
          // swung off its joint, and the dorsal rooted inside the back. They
          // are meant to overlap, and a canvas fills them into one silhouette
          // because it winds. Shapes count crossings instead unless told
          // otherwise, which cancels every overlap and leaves the animal
          // looking unstitched.
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          // The billed kinds are a whole drawing of their own rather than this
          // one with a bill laid over it. Two fills would put a seam across the
          // swordfish's face wherever the bill's buried root crossed the head,
          // which is what it used to do on the website; see `Frame.billed`.
          PathSvg {
            path: swimmer.frame
              ? (swimmer.fish && swimmer.fish.bill > 0 ? swimmer.frame.billed : swimmer.frame.d)
              : ""
          }
        }
      }

      // The eye is punched out in the surface behind it rather than drawn in an
      // ink of its own, which is why a fish reads as a cutout in the water
      // instead of a sticker on it.
      Rectangle {
        color: root.afloat(swimmer.fish ? swimmer.fish.y : 0, swimmer.weight * root.cutShade)
        height: swimmer.frame ? swimmer.frame.eye.r * 2 : 0
        radius: height / 2
        visible: swimmer.frame !== null
        width: height
        x: swimmer.frame ? swimmer.frame.eye.x - swimmer.frame.eye.r : 0
        y: swimmer.frame ? swimmer.frame.eye.y - swimmer.frame.eye.r : 0
      }
    }
  }

  // What is lying on the bottom, and what is coming out of it. Most seas hold
  // one or two of these and some hold none, which is the point of them: a wreck
  // in every sea is set dressing, and a wreck in one sea out of three is
  // something you found.
  Repeater {
    model: root.relicSlots

    delegate: Item {
      id: relic
      required property int index

      readonly property var one: root.sunken[index] || null
      readonly property real weight: one ? root.relicInk * one.depth : 0

      rotation: one ? one.lean * 180 / Math.PI : 0
      visible: one !== null
      x: one ? one.x : 0
      y: one ? one.y : 0
      // Behind the sand, not in front of it. A wreck lies half buried, and
      // the sand is what buries it: drawn over the floor the whole hull shows
      // and the thing reads as a boat sitting on top of the sea bed with its
      // keel visible through it. Everything relics have to be seen above is
      // above the floor line anyway, so the sand hides exactly the part that
      // should be under it and nothing else.
      z: one ? -2.5 + one.depth * 0.4 : 0

      transform: Scale {
        xScale: relic.one ? relic.one.scale : 1
        yScale: relic.one ? relic.one.scale : 1
      }

      Shape {
        preferredRendererType: Shape.CurveRenderer

        // Every relic is one filled silhouette in the same ink, so the layer
        // needs one path and a lookup rather than a Shape per kind. What is
        // drawn on top of that silhouette is each kind's own business, below.
        ShapePath {
          fillColor: root.afloat(relic.one ? relic.one.y : 0, relic.weight)
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          PathSvg {
            path: !relic.one ? ""
              : relic.one.kind === "wreck" ? Ornament.WRECK
              : relic.one.kind === "smoker" ? Ornament.SMOKER
              : relic.one.kind === "chest" ? Ornament.CHEST_BODY
              : Ornament.BLOCK_CARD
          }
        }

        // The wreck's spar, which is what stops a pair of leaning verticals
        // reading as two dead trees.
        ShapePath {
          capStyle: ShapePath.RoundCap
          fillColor: "transparent"
          strokeColor: root.afloat(relic.one ? relic.one.y : 0,
                                     relic.one && relic.one.kind === "wreck" ? relic.weight : 0)
          strokeWidth: 0.03

          PathPolyline {
            path: relic.one && relic.one.kind === "wreck"
              ? [Qt.point(Ornament.WRECK_SPAR[0].x, Ornament.WRECK_SPAR[0].y),
                 Qt.point(Ornament.WRECK_SPAR[1].x, Ornament.WRECK_SPAR[1].y)]
              : []
          }
        }
      }

      // The code block's three lines, cut out of the card in the surface rather
      // than drawn in ink, the way a fish's eye is. A snippet is a card with
      // light coming through it, not a card with marks on it.
      Repeater {
        model: relic.one && relic.one.kind === "block" ? Ornament.BLOCK_LINES.length : 0

        delegate: Shape {
          id: line
          required property int index

          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: root.afloat(relic.one ? relic.one.y : 0, relic.weight * root.cutShade)
            strokeColor: "transparent"

            PathSvg { path: Ornament.BLOCK_LINES[line.index] }
          }
        }
      }

      // The chest, and the laptop still open on its lid. The straps and the
      // lock are cut out in the surface; the screen is the one thing in the
      // whole sea drawn at full ink.
      Item {
        visible: relic.one !== null && relic.one.kind === "chest"

        Repeater {
          model: relic.one && relic.one.kind === "chest" ? Ornament.CHEST_BANDS.length : 0

          delegate: Shape {
            id: band
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              fillColor: root.afloat(relic.one ? relic.one.y : 0, relic.weight * root.cutShade)
              strokeColor: "transparent"

              PathSvg { path: Ornament.CHEST_BANDS[band.index] }
            }
          }
        }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: root.afloat(relic.one ? relic.one.y : 0, relic.weight * root.cutShade)
            strokeColor: "transparent"

            PathSvg { path: Ornament.CHEST_LOCK }
          }

          ShapePath {
            fillColor: root.afloat(relic.one ? relic.one.y : 0, relic.weight)
            strokeColor: "transparent"

            PathSvg { path: Ornament.LAPTOP_BASE }
          }

          ShapePath {
            fillColor: root.tint(root.screenInk)
            strokeColor: "transparent"

            PathSvg { path: Ornament.LAPTOP_SCREEN }
          }
        }

        // The three lines still on it, cut out of the lit screen.
        Repeater {
          model: relic.one && relic.one.kind === "chest" ? Ornament.LAPTOP_LINES.length : 0

          delegate: Shape {
            id: row
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              fillColor: root.surface
              strokeColor: "transparent"

              PathSvg { path: Ornament.LAPTOP_LINES[row.index] }
            }
          }
        }
      }
    }
  }

  // What the smoker is pouring. The only thing on the bottom that moves under
  // its own steam rather than the water's, which is what makes a vent read as
  // hot: everything else down there leans when the current leans, and this goes
  // straight up regardless and then gets bent.
  Repeater {
    model: root.plumeSlots

    delegate: Rectangle {
      id: smoke
      required property int index

      readonly property var puff: root.plume[index] || null

      /** What is left of a puff's own body, over the last of its life. */
      readonly property real body: puff ? Math.min(1, (1 - puff.age) / root.plumeLetGo) : 0

      readonly property color hue: root.afloat(puff ? puff.y : 0,
                                             root.plumeInk * (puff ? Math.sqrt(1 - puff.age) : 0))

      antialiasing: true
      // Opaque for most of its life, like everything else that is a thing
      // rather than light.
      //
      // Drawn as translucent circles the plume read as smoke: where puffs
      // overlapped their alphas piled up, so it was faintest at the vent and
      // brightest where they bunched at the top, which is the wrong way round
      // and is exactly what a chimney looks like on a windy day. Solid, they
      // merge into one column that is densest where it leaves the rock.
      //
      // Against the water at its own height rather than against the surface,
      // because a puff really does end as nothing, and a weight of nothing in
      // `tint` is the colour of the water along the bottom edge of the box. A
      // plume rises well clear of that, so what it used to turn into was a
      // stack of dark discs holding a few feet above the rock, each blinking
      // out on its own as it reached its age. That is the glitch, and it was
      // never the vent: it was the last frame of every puff it ever made.
      //
      // Letting go of the last of the alpha as well, because water-coloured and
      // opaque still holds out the wallpaper underneath. By then the puff is
      // the colour of what is behind it, so nothing piles up where two overlap.
      //
      // The square root, not the age itself. A puff spreads as it climbs, so
      // fading it in step with its age takes the ink out faster than the water
      // is taking it.
      color: Qt.rgba(smoke.hue.r, smoke.hue.g, smoke.hue.b, smoke.body)
      height: puff ? puff.r * 2 : 0
      radius: height / 2
      visible: puff !== null
      width: height
      x: puff ? puff.x - puff.r : 0
      y: puff ? puff.y - puff.r : 0
      z: -1.6
    }
  }

  // Squid: jet and drift, which is the opposite rhythm to a tail. Mirrored by
  // its facing and pitched by its heading exactly as a fish is, for the same
  // reason: nothing here ever turns round.
  Repeater {
    model: root.squids

    delegate: Item {
      id: cuttle
      required property int index

      readonly property var one: root.jetters[index] || null
      readonly property real weight: one
        ? root.openWater * (1 - root.depthInk + root.depthInk * one.depth)
        : 0
      /** The animal's own, in degrees; see `Squid.tilt`. Never derived here, and
       *  never multiplied by `facing`: it is the whole turn already. */
      readonly property real pitch: one ? one.tilt * 180 / Math.PI : 0

      visible: one !== null && weight > 0.002
      x: one ? one.x : 0
      y: one ? one.y : 0
      z: one ? one.depth : 0

      transform: [
        Scale { xScale: (cuttle.one ? cuttle.one.size * cuttle.one.facing : 1); yScale: cuttle.one ? cuttle.one.size : 1 },
        Rotation { angle: cuttle.pitch },
      ]

      Shape {
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          fillColor: root.afloat(cuttle.one ? cuttle.one.y : 0, cuttle.weight)
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          PathSvg { path: cuttle.one ? cuttle.one.body : "" }
        }
      }

      Repeater {
        model: cuttle.one ? cuttle.one.arms.length : 0

        delegate: Shape {
          id: tentacle
          required property int index

          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: root.afloat(cuttle.one ? cuttle.one.y : 0, cuttle.weight)
            strokeWidth: 0.035

            PathPolyline { path: cuttle.one ? cuttle.one.arms[tentacle.index] : [] }
          }
        }
      }
    }
  }

  // Octopuses, working the stones. On the bottom rather than in the water,
  // except for the once in a long while when one lets go.
  Repeater {
    model: root.octopuses

    delegate: Item {
      id: pus
      required property int index

      readonly property var one: root.crawlers[index] || null
      readonly property real weight: one
        ? root.crawlerInk * (1 - root.depthInk + root.depthInk * one.depth)
        : 0

      visible: one !== null && weight > 0.002
      x: one ? one.x : 0
      y: one ? one.y : 0
      z: one ? one.depth : 0

      transform: Scale {
        xScale: pus.one ? pus.one.size : 1
        yScale: pus.one ? pus.one.size : 1
      }

      // The head, which is a dome rather than a drawing: at this weight what
      // says octopus is eight arms leaving one blob, and the blob's own outline
      // is the least of it.
      Shape {
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          fillColor: root.afloat(pus.one ? pus.one.y : 0, pus.weight)
          strokeColor: "transparent"

          PathSvg { path: Ornament.OCTOPUS_HEAD }
        }
      }

      Repeater {
        model: pus.one ? pus.one.arms.length : 0

        delegate: Shape {
          id: limb
          required property int index

          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: root.afloat(pus.one ? pus.one.y : 0, pus.weight)
            strokeWidth: 0.075

            PathPolyline { path: pus.one ? pus.one.arms[limb.index] : [] }
          }
        }
      }
    }
  }

  // What goes past overhead, and what is looking for you. Minutes apart rather
  // than seconds, and most sittings will hold neither: a scene you can watch
  // the whole vocabulary of in a minute is wallpaper.
  Repeater {
    model: root.passerSlots

    delegate: Item {
      id: passer
      required property int index

      readonly property var one: root.crossing[index] || null

      visible: one !== null
      z: 1.2

      // A boat: a hull seen from underneath, which is the only view this water
      // has, with a wake opening astern of it.
      Item {
        visible: passer.one !== null && passer.one.kind === "boat"
        x: passer.one ? passer.one.x : 0
        y: passer.one ? passer.one.y : 0

        transform: Scale {
          xScale: passer.one ? passer.one.scale * passer.one.facing : 1
          yScale: passer.one ? passer.one.scale : 1
        }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: root.afloat(passer.one ? passer.one.y : 0,
                                   root.hullInk * (passer.one ? passer.one.weight : 0))
            strokeColor: "transparent"

            PathSvg { path: Ornament.HULL }
          }

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: Qt.rgba(root.ink.r, root.ink.g, root.ink.b,
                                 root.hullInk * 0.5 * (passer.one ? passer.one.weight : 0))
            strokeWidth: 0.012

            PathMove { x: Ornament.WAKE[0].from[0]; y: Ornament.WAKE[0].from[1] }
            PathLine { x: Ornament.WAKE[0].to[0]; y: Ornament.WAKE[0].to[1] }
            PathMove { x: Ornament.WAKE[1].from[0]; y: Ornament.WAKE[1].from[1] }
            PathLine { x: Ornament.WAKE[1].to[0]; y: Ornament.WAKE[1].to[1] }
          }

          ShapePath {
            fillColor: root.afloat(passer.one ? passer.one.y : 0,
                                   root.hullInk * (passer.one ? passer.one.weight : 0))
            strokeColor: "transparent"

            PathSvg { path: Ornament.SCREWS }
          }
        }
      }

      // A submarine, seen from the side because it is down here in the water
      // rather than on top of it. One fill for the whole silhouette, wound
      // rather than odd-even: the sail sits on the hull, and under odd-even an
      // overlap is a hole.
      Item {
        visible: passer.one !== null && passer.one.kind === "submarine"
        x: passer.one ? passer.one.x : 0
        y: passer.one ? passer.one.y : 0

        transform: Scale {
          xScale: passer.one ? passer.one.scale * passer.one.facing : 1
          yScale: passer.one ? passer.one.scale : 1
        }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: root.afloat(passer.one ? passer.one.y : 0,
                                   root.hullInk * (passer.one ? passer.one.weight : 0))
            fillRule: ShapePath.WindingFill
            strokeColor: "transparent"

            PathSvg { path: Ornament.SUBMARINE }
          }

          ShapePath {
            fillColor: root.afloat(passer.one ? passer.one.y : 0,
                                   root.hullInk * (passer.one ? passer.one.weight : 0))
            strokeColor: "transparent"

            PathSvg { path: Ornament.SUB_SCREW }
          }
        }
      }

      // Sonar: three rings, staggered, going out and losing themselves in the
      // water. One ring would be a bubble.
      Repeater {
        model: passer.one && passer.one.kind === "sonar" ? Ornament.PING_RINGS.length : 0

        delegate: Rectangle {
          required property int index

          readonly property var ring: passer.one
            ? Ornament.ringAt(passer.one.along, Ornament.PING_RINGS[index])
            : null
          readonly property real reach: ring && passer.one ? ring.reach * passer.one.scale : 0

          antialiasing: true
          border.color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b,
                                root.pingInk * (ring ? ring.weight : 0) *
                                (passer.one ? passer.one.weight : 0))
          border.width: 1
          color: "transparent"
          height: reach * 2
          radius: reach
          visible: ring !== null
          width: height
          x: (passer.one ? passer.one.x : 0) - reach
          y: (passer.one ? passer.one.y : 0) - reach
        }
      }
    }
  }

  // Bubbles, drawn as rings rather than discs. A filled circle at this size is
  // a dot, and a dot going up is a dot going up; an outline with the water
  // showing through it is a bubble.
  Repeater {
    model: root.bubblePool

    delegate: Rectangle {
      required property int index

      readonly property var bubble: root.bubbles[index] || null

      antialiasing: true
      border.color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b,
                            root.bubbleInk * (bubble ? bubble.depth : 0))
      border.width: 1
      color: "transparent"
      height: bubble ? bubble.r * 2 : 0
      radius: height / 2
      visible: bubble !== null
      width: height
      x: bubble ? bubble.x - bubble.r : 0
      y: bubble ? bubble.y - bubble.r : 0
      z: bubble ? bubble.depth : 0
    }
  }

  // The hour, over the top of everything.
  //
  // Over the top because that is what an hour is: the water does not become a
  // different water at night, it is the same water with less light reaching it,
  // and a wash under the fish would be a fog they swim through instead. The
  // porthole on the site lays its two washes over the whole disc for the same
  // reason. Both are transparent at their own noon and cost nothing then.
  // Dusk falls off with depth and night does not, which is the difference
  // between the two. A sunset is a colour arriving through the surface, and it
  // gets no further down than the light it came in on; laid flat over the whole
  // box it lifted the floor off black and the water went to one olive haze.
  Rectangle {
    anchors.fill: parent
    visible: root.dusk > 0
    z: 3

    gradient: Gradient {
      GradientStop {
        position: 0
        color: Qt.rgba(root.dusklight.r, root.dusklight.g, root.dusklight.b,
                       root.duskInk * root.dusk)
      }
      GradientStop {
        position: root.discReach
        color: Qt.rgba(root.dusklight.r, root.dusklight.g, root.dusklight.b, 0)
      }
      GradientStop {
        position: 1
        color: Qt.rgba(root.dusklight.r, root.dusklight.g, root.dusklight.b, 0)
      }
    }
  }

  Rectangle {
    anchors.fill: parent
    color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b,
                   root.nightInk * (1 - root.daylight))
    visible: root.daylight < 1
    z: 3.1
  }
}
