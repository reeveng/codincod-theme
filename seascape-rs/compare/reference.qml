// The QML renderer drawing nothing but the bed, as the reference the native
// renderer is measured against.
//
//   QT_QPA_PLATFORM=offscreen qml6 reference.qml -- out=/tmp/bed.png
//
// Everything that is not ground or a plant is turned off here rather than in
// `Seascape.qml`, which knows nothing about this: a scene with one layer left
// in it is a fair comparison and a scene with a switch in it is a scene with a
// switch in it. The water is opaque for the same reason, since what shows
// through it on a desktop is a wallpaper neither renderer draws.
import QtQuick
import "../../seascape"

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

  readonly property string out: win.arg("out", "bed.png")

  color: "black"

  Seascape {
    anchors.fill: parent

    beams: 0
    bloomInk: 0
    bubblePool: 0
    crabsPerK: 0
    daylight: 1
    discInk: 0
    duskInk: 0
    dusk: 0
    farBlur: 0
    flurry: 0
    frothSlots: 0
    grainInk: 0
    haloInk: 0
    discR: 0
    maxFish: 0
    maxMotes: 0
    minFish: 0
    minMotes: 0
    shafts: 0
    ink: "#35c26d"
    moon: ({ arc: 1, march: 0.5 })
    nearBlur: 0
    nightInk: 0
    octopuses: 0
    passerSlots: 0
    plumeSlots: 0
    reefHeads: 0
    relicSlots: 0
    rushed: true
    running: false
    seed: Number(win.arg("seed", "28"))
    settle: Number(win.arg("settle", "40"))
    speckPool: 0
    squids: 0
    starfishPerK: 0
    stonesPerK: 0
    streakInk: 0
    sun: ({ arc: 1, march: 0.5 })
    surface: "#0e1712"
    swayReach: 0
    swayRoll: 0
    tolerance: Number(win.arg("tolerance", "0.25"))
    vignetteInk: 0
    visitorSlots: 0
    waterInk: 1
  }

  Timer {
    interval: 1200
    running: true
    onTriggered: win.contentItem.grabToImage(function (result) {
      result.saveToFile(Qt.resolvedUrl(win.out).toString().replace("file://", ""))
      Qt.exit(0)
    })
  }
}
