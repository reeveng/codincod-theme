// What a frame of the sea costs, measured offscreen.
//
//   ./bench.sh
//   ./bench.sh frames=600 width=2560 height=1440
//   ./bench.sh tolerance=0        # the same water before anything held a drawing
//
// Through `bench.sh` rather than `qml6` or `look.sh`, because the render side of
// the bill is Qt's own to report and it only reports it when asked in the
// environment.
//
// The scene's own timer is off and each frame is stepped by hand, so what is
// measured is one advance and one publish per drawn frame, which is what the
// desktop does. `FrameAnimation` is the clock: it fires once per drawn frame
// and hands back how long the last one took, which is the only sub-millisecond
// number available here. Qt's JavaScript engine has no `performance.now`, so
// the split between the simulation and the publish is summed from millisecond
// deltas over hundreds of frames and reported against the total, which is
// measured properly. Two numbers that do not add up mean the split is noise.
import QtQuick

Window {
  id: win
  width: Number(win.arg("width", "2560"))
  height: Number(win.arg("height", "1440"))
  visible: true

  function arg(key, fallback) {
    var all = Qt.application.arguments
    for (var i = 0; i < all.length; i++) {
      if (all[i].indexOf(key + "=") === 0) return all[i].substring(key.length + 1)
    }
    return fallback
  }

  readonly property color ink: "#35c26d"
  readonly property color surface: "#0e1712"

  /** Frames measured, and frames thrown away first. */
  readonly property int frames: Number(win.arg("frames", "400"))

  /**
   * The first frames are not the scene's steady state and never will be.
   * Every shape in the bed is tessellated once on the frame it first appears
   * on, so a run that counted those would be reporting the cost of opening the
   * scene rather than the cost of keeping it.
   */
  readonly property int warm: Number(win.arg("warm", "60"))

  readonly property real step: 1 / Number(win.arg("fps", "30"))
  readonly property real tolerance: Number(win.arg("tolerance", "0.25"))

  /** `drive=0` renders the same scene without stepping it, which is the floor. */
  readonly property bool drive: win.arg("drive", "1") !== "0"

  /**
   * Layers to empty before measuring, as `zero=herd,specks`.
   *
   * Attribution, by leaving one out. Qt reports what a frame cost and not what
   * any layer in it cost, and there is no way to ask: the scene graph is one
   * graph by the time it is drawn. So a layer's bill is the difference between
   * a run with it and a run without, which is the only number here anybody can
   * actually collect.
   *
   * Each name is a count the scene already keeps, so emptying one is the same
   * arithmetic the scene does on a smaller screen rather than a special case
   * cut into it for the bench.
   */
  readonly property string zero: win.arg("zero", "")

  /**
   * How dense to sow the bed, as a share of what it sows itself.
   *
   * The bed is nearly every `Shape` in the scene, so this is the knob that says
   * whether a frame costs what it draws or how much of it there is. `dense=0.5`
   * is the same water with half the plants in it.
   */
  readonly property real dense: Number(win.arg("dense", "1"))

  /** A grab is finished by the render loop, so `Qt.exit` is not immediate. */
  property bool done: false

  property int seen: 0
  property var advanceMs: []
  property var publishMs: []
  property var frameMs: []

  Rectangle {
    anchors.fill: parent
    gradient: Gradient {
      GradientStop { position: 0; color: "#101c15" }
      GradientStop { position: 1; color: "#030705" }
    }
  }

  Seascape {
    id: sea
    anchors.fill: parent
    daylight: 1
    dusk: 0
    ink: win.ink
    moon: ({ arc: 1, march: 0.5 })
    running: false
    rushed: true
    seed: Number(win.arg("seed", "1956"))
    settle: Number(win.arg("settle", "40"))
    sun: ({ arc: 1, march: 0.5 })
    surface: win.surface
    tolerance: win.tolerance
  }

  readonly property var pools: ({
    blur: ["farBlur", "nearBlur"],
    bubbles: ["bubblePool"],
    anemones: ["anemonesPerK"],
    cliffs: ["cliffsPerK"],
    corals: ["coralsPerK"],
    fans: ["fansPerK"],
    grass: ["grassesPerK"],
    kelp: ["kelpsPerK"],
    flora: ["anemonesPerK", "coralsPerK", "fansPerK", "grassesPerK", "kelpsPerK"],
    froth: ["frothSlots"],
    glow: ["bloomInk"],
    herd: ["herd"],
    inklings: ["octopuses", "squids"],
    lens: ["grainInk", "vignetteInk"],
    motes: ["flurry"],
    plume: ["plumeSlots"],
    reef: ["reefHeads"],
    relics: ["relicSlots"],
    shafts: ["beams"],
    specks: ["speckPool"],
    stones: ["stonesPerK"],
    visitors: ["visitorSlots"],
    walkers: ["crabsPerK", "starfishPerK"],
  })

  /**
   * Some of these are read when the water is sown and some when it is drawn, and
   * the bench cannot know which. So they are set, the water is sown again, and
   * they are set a second time: `build` recomputes the two counts that come off
   * the size of the box, and a layer asked for nothing must stay at nothing.
   */
  readonly property var sown: ["anemonesPerK", "coralsPerK", "fansPerK", "grassesPerK", "kelpsPerK"]

  function thin() {
    if (win.dense === 1) return

    for (var i = 0; i < win.sown.length; i++) sea[win.sown[i]] = sea[win.sown[i]] * win.dense
  }

  function empty() {
    win.thin()
    if (!win.zero) return sea.build()

    win.set()
    sea.build()
    win.set()
  }

  function set() {
    var names = win.zero.split(",")
    for (var i = 0; i < names.length; i++) {
      var pool = win.pools[names[i].trim()]
      if (!pool) {
        console.log("bench: no layer called " + names[i])
        continue
      }
      for (var p = 0; p < pool.length; p++) sea[pool[p]] = 0
    }
  }

  /**
   * Medians, not averages, and the reason is the machine rather than the scene.
   * A desktop being worked on has a browser and an indexer on it, and one frame
   * that waited for those is worth a third of the mean over a hundred. What is
   * wanted is the frame this scene costs when it is the thing running.
   */
  /**
   * How many items are in the scene and how many of them are `Shape`s, by kind.
   *
   * Qt says what a frame cost and the leave-one-out says what a layer cost, and
   * between the two there is still no answer to the question that decides where
   * to look: how much of this picture is built out of the expensive thing. So
   * the tree is walked once and the delegates are counted by the type name Qt
   * gives them, which is the QML type they were declared as.
   */
  function census(item, tally) {
    var kids = item.children
    for (var i = 0; i < kids.length; i++) {
      var kid = kids[i]
      var name = String(kid).replace(/[_(].*$/, "")
      tally[name] = (tally[name] || 0) + 1
      win.census(kid, tally)
    }
    return tally
  }

  function counted() {
    var tally = win.census(sea, {})
    var names = Object.keys(tally).sort()
    var line = []
    var all = 0
    for (var i = 0; i < names.length; i++) {
      line.push(names[i] + " " + tally[names[i]])
      all += tally[names[i]]
    }
    return all + " items: " + line.join(", ")
  }

  function quantile(values, at) {
    if (values.length === 0) return 0
    var sorted = values.slice().sort(function (a, b) { return a - b })
    var i = Math.min(sorted.length - 1, Math.max(0, Math.round(at * (sorted.length - 1))))
    return sorted[i]
  }

  function fixed(value, places) {
    return Number(value).toFixed(places)
  }

  function say() {
    console.log("bench " + win.width + "x" + win.height +
                " tolerance=" + win.tolerance +
                (win.zero ? " without " + win.zero : "") +
                " frames=" + win.frameMs.length)
    console.log("  scene  " + sea.specks.length + " specks at weight " + win.fixed(sea.flockWeight, 2) +
                ", " + sea.growth.length + " plants, " + sea.heads.length + " heads, " +
                sea.fishes.length + " fish, " + sea.motes.length + " motes")
    console.log("  tree   " + win.counted())
    console.log("  js     advance " + win.fixed(win.quantile(win.advanceMs, 0.5), 0) + "ms" +
                "  publish " + win.fixed(win.quantile(win.publishMs, 0.5), 0) + "ms")
    Qt.exit(0)
  }

  FrameAnimation {
    running: true

    onTriggered: {
      if (win.done) return
      if (win.seen === 0) win.empty()

      var before = Date.now()
      if (win.drive) sea.advance(win.step)
      var between = Date.now()
      if (win.drive) sea.publish()
      var after = Date.now()

      win.seen++
      if (win.seen <= win.warm) return

      win.advanceMs.push(between - before)
      win.publishMs.push(after - between)
      win.frameMs.push(frameTime * 1000)

      if (win.frameMs.length >= win.frames) {
        win.done = true
        win.say()
      }
    }
  }
}
