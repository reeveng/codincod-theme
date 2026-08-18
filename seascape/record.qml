// Frames of the sea, rendered offscreen and stepped by hand.
//
//   QT_QPA_PLATFORM=offscreen qml6 record.qml -- out=/tmp/frames frames=180 fps=15
//
// The scene's own timer is off and the clip is advanced a frame at a time, so
// what comes out is the same water at the same rate on any machine, however
// long a grab happens to take.
import QtQuick

Window {
  id: win
  width: Number(win.arg("width", "1600"))
  height: Number(win.arg("height", "1000"))
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
  readonly property string out: win.arg("out", "/tmp/sea-frames")
  readonly property int frames: Number(win.arg("frames", "180"))
  readonly property real fps: Number(win.arg("fps", "15"))
  readonly property real daylight: Number(win.arg("daylight", "1"))
  readonly property real dusk: Number(win.arg("dusk", "0"))
  readonly property real march: Number(win.arg("march", "0.5"))

  property int made: 0

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
    daylight: win.daylight
    dusk: win.dusk
    ink: win.ink
    moon: ({ arc: Math.sin(win.march * Math.PI), march: win.march })
    running: false
    rushed: true
    seed: Number(win.arg("seed", "1956"))
    settle: Number(win.arg("settle", "40"))
    sun: ({ arc: Math.sin(win.march * Math.PI), march: win.march })
    surface: win.surface
  }

  function pad(n) {
    var s = "000" + n
    return s.substring(s.length - 4)
  }

  property bool busy: false

  // A timer rather than a chain off each grab's own callback. A grab is
  // finished by the render loop, and a callback that immediately asks for the
  // next one never lets that loop come round: the first frame is scheduled and
  // nothing after it ever arrives.
  Timer {
    interval: 30
    repeat: true
    running: true

    onTriggered: {
      if (win.busy) return
      if (win.made >= win.frames) {
        Qt.exit(0)
        return
      }

      win.busy = true
      sea.advance(1 / win.fps)
      sea.publish()

      var at = win.made
      win.made++

      win.contentItem.grabToImage(function (result) {
        result.saveToFile(win.out + "/frame-" + win.pad(at) + ".png")
        win.busy = false
      })
    }
  }
}
