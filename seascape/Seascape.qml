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

  /** Where the disc sits, as shares of the box, and how big it is drawn. */
  property real discX: 0.79
  property real discY: 0.075
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
  property real discLean: 0.05
  property real discSpread: 0.15

  /**
   * How bright the disc's own shaft is at its mouth, and the night wash over
   * everything.
   *
   * The porthole gets away with a flat fifteen percent because it is two
   * hundred units across and the shaft crosses a coin. Here the same triangle
   * is a quarter of a desktop, and whatever a viewer's eye lands on first is
   * not a background. Three percent at the mouth, and gone by the middle.
   */
  property real discInk: 0.03
  property real duskInk: 0.09
  property real nightInk: 0.3

  /** How far down the box the shaft has faded out, as a share of the height. */
  property real discReach: 0.62

  /** Salt. The same seed gives the same water twice. */
  property int seed: 1956

  /**
   * Skip the wait before the first boat and the first ping.
   *
   * For the preview harness and nothing else. On a desktop these are minutes
   * apart on purpose, and a boat you get for turning the screen on is a boat on
   * a schedule.
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
  property real rayInk: 0.05

  /** How much of a creature's weight is its depth. One in the murk is a hint. */
  property real depthInk: 0.65

  // ------------------------------------------------------------------- density
  //
  // Counted against the box rather than set outright, so the same component
  // fills a laptop panel and a wall without being retuned for either.

  property real pxPerFish: 105000
  property int minFish: 6
  property int maxFish: 22

  property real pxPerMote: 19000
  property int minMotes: 30
  property int maxMotes: 170

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

  property real kelpsPerK: 7.4
  property real grassesPerK: 26
  property real coralsPerK: 5.4
  property real stonesPerK: 15
  property real cliffsPerK: 1.9

  property int leastOfEach: 2
  property int mostKelps: 26
  property int mostGrasses: 64
  property int mostCorals: 14
  property int mostStones: 40
  property int mostCliffs: 7

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

  /** How much darker a cut-out is than the shape it is cut from. */
  property real cutShade: 0.34

  /** How far off the water's own colour the lit top of the column is. */
  property real waterLid: 0.05

  /** How dark the ground and the things rooted in it may be. */
  property real sandInk: 0.13
  property real stoneInk: 0.23
  property real floraInk: 0.26
  property real cliffInk: 0.09

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
   */
  function tint(weight) {
    var w = Math.max(0, Math.min(1, weight))
    return Qt.rgba(surface.r + (ink.r - surface.r) * w,
                   surface.g + (ink.g - surface.g) * w,
                   surface.b + (ink.b - surface.b) * w,
                   1)
  }

  /**
   * The same, for what is cut out of a shape rather than drawn: an eye, the
   * bands on a chest, the shadow under a lid.
   *
   * A hole is not the background colour. Painted in the water's own colour it
   * would be a window through the animal onto the water behind, which is the
   * thing this whole change is getting rid of. It is the same body, darker.
   */
  function shade(weight) {
    return tint(weight * cutShade)
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
      eager: rushed ? 1 : 0,
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
    // or on snow that has not yet had time to spread through the water.
    var steps = Math.round(settle / settleStep)
    for (var i = 0; i < steps; i++) advance(settleStep)
    cutGround()
    publish()
    fitted = Qt.size(width, height)
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
  function cutGround() {
    if (!seabed) return

    sand = polygon(seabed.ridge, true)

    var walls = []
    for (var c = 0; c < seabed.cliffs.length; c++) {
      var cliff = seabed.cliffs[c]
      walls.push({ depth: cliff.depth, points: polygon(cliff.ridge, true) })
    }
    scarp = walls

    var lying = []
    for (var t = 0; t < seabed.stones.length; t++) {
      var stone = seabed.stones[t]
      lying.push({ lean: stone.lean, rise: stone.rise, span: stone.span, x: stone.x, y: stone.y })
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
        heading: one.heading,
        size: one.size,
        tail: one.tail,
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
        heading: squid.heading,
        size: squid.size,
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

    gradient: Gradient {
      GradientStop {
        position: 0
        color: Qt.rgba(root.tint(root.waterLid).r, root.tint(root.waterLid).g,
                       root.tint(root.waterLid).b, root.waterInk)
      }
      GradientStop {
        position: 1
        color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b, root.waterInk)
      }
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
      z: -3

      ShapePath {
        fillColor: root.tint(root.cliffInk * (wall.cliff ? wall.cliff.depth : 0))
        strokeColor: "transparent"

        PathPolyline { path: wall.cliff ? wall.cliff.points : [] }
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
      fillColor: root.tint(root.sandInk)
      strokeColor: "transparent"

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
      color: root.tint(root.stoneInk)
      height: stone ? stone.rise : 0
      radius: height / 2
      rotation: stone ? stone.lean * 180 / Math.PI : 0
      visible: stone !== null
      width: stone ? stone.span : 0
      x: stone ? stone.x - width / 2 : 0
      y: stone ? stone.y - height * 0.62 : 0
      z: -1.8
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
      readonly property real weight: one ? root.floraInk * one.depth : 0

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
          strokeColor: root.tint(sprout.weight)
          strokeWidth: sprout.one ? sprout.one.girth : 0

          PathPolyline { path: sprout.one && sprout.one.kind !== "coral" ? sprout.one.points : [] }
        }
      }

      Repeater {
        model: sprout.one && sprout.one.kind === "kelp" ? sprout.one.blades.length : 0

        delegate: Shape {
          id: leaf
          required property int index

          anchors.fill: parent
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: root.tint(sprout.weight)
            strokeWidth: sprout.one ? sprout.one.girth * 0.7 : 0

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
          model: sprout.one && sprout.one.kind === "coral" ? Ornament.CORAL.length : 0

          delegate: Shape {
            id: branch
            required property int index

            readonly property var twig: Ornament.CORAL[index]

            preferredRendererType: Shape.CurveRenderer
            transform: Scale {
              xScale: sprout.one ? sprout.one.scale : 1
              yScale: sprout.one ? sprout.one.scale : 1
            }

            ShapePath {
              capStyle: ShapePath.RoundCap
              fillColor: "transparent"
              strokeColor: root.tint(sprout.weight)
              strokeWidth: branch.twig.width

              PathSvg { path: branch.twig.d }
            }
          }
        }
      }
    }
  }

  // The disc above the water, and the light coming off it. Behind everything
  // that swims, because it is up there and they are down here.
  Item {
    id: sky

    // Not `x` and `y`: an Item already has both, as its own position, and they
    // are final. The same trap the light shafts hit with `top`.
    readonly property real r: root.height * root.discR
    readonly property real cx: root.width * root.discX
    readonly property real cy: root.height * root.discY

    /** One disc, cross-fading. Two would be a sun sliding aside for a moon. */
    readonly property color hue: Qt.rgba(
      root.moonlight.r + (root.sunlight.r - root.moonlight.r) * root.daylight,
      root.moonlight.g + (root.sunlight.g - root.moonlight.g) * root.daylight,
      root.moonlight.b + (root.sunlight.b - root.moonlight.b) * root.daylight,
      1)

    anchors.fill: parent
    z: -1.2

    // The shaft, its mouth the disc's own diameter at the disc's own centre.
    Shape {
      anchors.fill: parent
      preferredRendererType: Shape.CurveRenderer

      ShapePath {
        // Four stops rather than two, because light in water does not thin out
        // in a straight line. A linear fade holds half its strength at half its
        // depth, which is what made this read as a spotlight on a stage.
        fillGradient: LinearGradient {
          x1: 0
          y1: sky.cy
          x2: 0
          y2: root.height * root.discReach

          GradientStop {
            position: 0
            color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.discInk)
          }
          GradientStop {
            position: 0.35
            color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.discInk * 0.4)
          }
          GradientStop {
            position: 0.7
            color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, root.discInk * 0.1)
          }
          GradientStop {
            position: 1
            color: Qt.rgba(sky.hue.r, sky.hue.g, sky.hue.b, 0)
          }
        }
        strokeColor: "transparent"

        startX: sky.cx - sky.r
        startY: sky.cy

        PathLine { x: sky.cx + sky.r; y: sky.cy }
        PathLine {
          x: sky.cx + root.width * (root.discLean + root.discSpread)
          y: root.height
        }
        PathLine {
          x: sky.cx + root.width * (root.discLean - root.discSpread)
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

    // The craters, and only at night. A sun with three grey spots on it is a
    // moon somebody forgot to finish, so they come and go with the moonlight.
    Repeater {
      // Off-centre and unevenly sized on purpose. Three round spots spaced
      // evenly on a disc is a face, and the moment anybody sees a face there
      // they stop seeing a moon.
      model: [Qt.vector3d(-0.34, -0.22, 0.22),
              Qt.vector3d(0.19, -0.45, 0.1),
              Qt.vector3d(0.31, 0.3, 0.15)]

      delegate: Rectangle {
        required property vector3d modelData

        antialiasing: true
        color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b,
                       0.34 * (1 - root.daylight))
        height: sky.r * modelData.z * 2
        radius: height / 2
        width: height
        x: sky.cx + sky.r * modelData.x - width / 2
        y: sky.cy + sky.r * modelData.y - height / 2
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
                               (root.rayInk / root.shaftPlies) * (shaft.ray ? shaft.ray.glow : 0))
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
      color: root.tint(root.snowInk * (mote ? mote.depth : 0))
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
       * The heading as a tilt, once the fish's fixed facing is taken out of it.
       * No fish ever turns round, so this is only ever the shallow pitch either
       * side of level and nothing here flips, foreshortens or turns over.
       */
      readonly property real pitch: fish
        ? Math.atan2(Math.sin(fish.heading), fish.facing * Math.cos(fish.heading)) * 180 / Math.PI
        : 0

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
          fillColor: root.tint(swimmer.weight)
          // A fish is three closed subpaths in one string: the body, the tail
          // swung off its joint, and the dorsal rooted inside the back. They
          // are meant to overlap, and a canvas fills them into one silhouette
          // because it winds. Shapes count crossings instead unless told
          // otherwise, which cancels every overlap and leaves the animal
          // looking unstitched.
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          PathSvg { path: swimmer.frame ? swimmer.frame.d : "" }
        }

        // The bill, for the one kind that has one. Apart from the body's path
        // rather than joined to it, because the frames are cached and shared by
        // every fish in the water: a bill baked into `d` would be a bill on all
        // of them. Same ink and same winding, so the two read as one animal.
        ShapePath {
          fillColor: root.tint(swimmer.fish && swimmer.fish.bill > 0 ? swimmer.weight : 0)
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          PathSvg {
            path: swimmer.frame && swimmer.fish && swimmer.fish.bill > 0
              ? swimmer.frame.bill
              : ""
          }
        }
      }

      // The eye is punched out in the surface behind it rather than drawn in an
      // ink of its own, which is why a fish reads as a cutout in the water
      // instead of a sticker on it.
      Rectangle {
        color: root.shade(swimmer.weight)
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
          fillColor: root.tint(relic.weight)
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
          strokeColor: root.tint(relic.one && relic.one.kind === "wreck" ? relic.weight : 0)
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
            fillColor: root.shade(relic.weight)
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
              fillColor: root.shade(relic.weight)
              strokeColor: "transparent"

              PathSvg { path: Ornament.CHEST_BANDS[band.index] }
            }
          }
        }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: root.shade(relic.weight)
            strokeColor: "transparent"

            PathSvg { path: Ornament.CHEST_LOCK }
          }

          ShapePath {
            fillColor: root.tint(relic.weight)
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
      required property int index

      readonly property var puff: root.plume[index] || null

      antialiasing: true
      // Opaque, like everything else that is a thing rather than light.
      //
      // Drawn as translucent circles the plume read as smoke: where puffs
      // overlapped their alphas piled up, so it was faintest at the vent and
      // brightest where they bunched at the top, which is the wrong way round
      // and is exactly what a chimney looks like on a windy day. Solid, they
      // merge into one column that is densest where it leaves the rock.
      //
      // The square root, not the age itself. A puff spreads as it climbs, so
      // fading it in step with its age takes the ink out faster than the water
      // is taking it.
      color: root.tint(root.plumeInk * (puff ? Math.sqrt(1 - puff.age) : 0))
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
      readonly property real pitch: one
        ? Math.atan2(Math.sin(one.heading), one.facing * Math.cos(one.heading)) * 180 / Math.PI
        : 0

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
          fillColor: root.tint(cuttle.weight)
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
            strokeColor: root.tint(cuttle.weight)
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
          fillColor: root.tint(pus.weight)
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
            strokeColor: root.tint(pus.weight)
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
            fillColor: root.tint(root.hullInk * (passer.one ? passer.one.weight : 0))
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
            fillColor: root.tint(root.hullInk * (passer.one ? passer.one.weight : 0))
            strokeColor: "transparent"

            PathSvg { path: Ornament.SCREWS }
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
