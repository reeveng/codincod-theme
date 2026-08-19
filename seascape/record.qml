// Frames of the sea, rendered offscreen and stepped by hand.
//
//   ./look.sh record.qml out=/tmp/frames frames=180 fps=15
//
// Through `look.sh` rather than `qml6` directly, so the clip comes off the
// renderer the desktop uses rather than the software one the offscreen
// platform reaches for by itself.
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
  readonly property real lit: Number(win.arg("lit", "0.62"))
  readonly property real march: Number(win.arg("march", "0.5"))

  /**
   * How heavy the film is, for a clip that has to be stored rather than watched.
   *
   * A string rather than a number, because "" is how this says nothing: left
   * out, the scene keeps whatever grain it draws on a desktop.
   *
   * It is worth saying at all because the grain is re-rolled every frame, which
   * is right on a screen and ruinous in a file: it changes most of the pixels in
   * the picture between one frame and the next, so nothing can be carried over
   * and every frame of a gif is stored whole. `gif.sh` turns it off for exactly
   * that reason and lets the encoder's own dither do the anti-banding.
   */
  readonly property string grain: win.arg("grain", "")

  /** How far a plant may drift from its drawing before it is cut again, in px. */
  readonly property real tolerance: Number(win.arg("tolerance", "0.25"))

  /**
   * Whether the frame is bolted to the wall for this clip.
   *
   * The scene wanders a few px and leans a fraction of a degree, on the argument
   * that nobody holds a camera still. It is the right argument on a screen and
   * the wrong one in a file: a frame that has moved is a frame in which every
   * pixel has changed, so a clip of a still sea costs as much to store as a clip
   * of a storm. `gif.sh` takes the tripod; the water goes on moving without it.
   */
  readonly property bool tripod: win.arg("tripod", "0") !== "0"

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
    moon: ({
      arc: Math.sin(win.march * Math.PI),
      lit: win.lit,
      march: win.march,
      up: 1,
      waxing: true,
    })
    running: false
    rushed: true
    seed: Number(win.arg("seed", "1956"))
    settle: Number(win.arg("settle", "40"))
    sun: ({ arc: Math.sin(win.march * Math.PI), march: win.march })
    surface: win.surface
    tolerance: win.tolerance

    // Assigned rather than bound, because a binding that says "whatever it was
    // unless somebody said otherwise" is a binding that names itself.
    Component.onCompleted: {
      if (win.grain !== "") sea.grainInk = Number(win.grain)
      if (win.tripod) {
        sea.swayReach = 0
        sea.swayRoll = 0
      }
    }
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
