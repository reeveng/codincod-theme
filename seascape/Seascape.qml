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

  /** Salt. The same seed gives the same water twice. */
  property int seed: 1956

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

  property real pxPerFish: 260000
  property int minFish: 5
  property int maxFish: 12

  property real pxPerMote: 19000
  property int minMotes: 30
  property int maxMotes: 170

  /** Places on the floor that bubble, and shafts coming through the surface. */
  property int vents: 3
  property int shafts: 5

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

  property int herd: 0
  property int flurry: 0
  property int beams: 0

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

    shoal = Ornament.createShoal({
      count: herd,
      cruise: cruise,
      height: height,
      longest: longest,
      seed: seed,
      shortest: shortest,
      width: width,
    })

    drift = Ornament.createDrift({
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
    publish()
  }

  function refit() {
    if (!shoal) return build()

    herd = fishCount()
    flurry = moteCount()
    shoal.resize(width, height, herd)
    drift.resize(width, height, flurry)
    light.resize(width, height, beams)
    publish()
  }

  function advance(dt) {
    shoal.step(dt, null)
    drift.step(dt)
    light.step(dt)
  }

  function publish() {
    if (!shoal) return

    var swimming = []
    for (var i = 0; i < shoal.fish.length; i++) {
      var one = shoal.fish[i]
      swimming.push({
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

    var shining = []
    for (var r = 0; r < light.rays.length; r++) {
      var ray = light.rays[r]
      shining.push({ glow: ray.glow, reach: ray.reach, span: ray.span, tilt: ray.tilt, x: ray.x })
    }
    rays = shining
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
      color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b, root.snowInk * (mote ? mote.depth : 0))
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
          fillColor: Qt.rgba(root.ink.r, root.ink.g, root.ink.b, swimmer.weight)
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
      }

      // The eye is punched out in the surface behind it rather than drawn in an
      // ink of its own, which is why a fish reads as a cutout in the water
      // instead of a sticker on it.
      Rectangle {
        color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b, swimmer.weight)
        height: swimmer.frame ? swimmer.frame.eye.r * 2 : 0
        radius: height / 2
        visible: swimmer.frame !== null
        width: height
        x: swimmer.frame ? swimmer.frame.eye.x - swimmer.frame.eye.r : 0
        y: swimmer.frame ? swimmer.frame.eye.y - swimmer.frame.eye.r : 0
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
}
