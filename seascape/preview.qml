// A still of the sea, rendered offscreen.
//
//   ./look.sh preview.qml
//
// Through `look.sh` rather than `qml6` directly: the offscreen platform on its
// own loads the software scene graph, and a sheet drawn by QPainter is not the
// picture the desktop is drawing.
//
// Writes preview.png next to this file, and exits.
//
// This exists so the scene can be looked at and tuned without taking over a
// desktop to do it: the background layer is only visible when no window is on
// the workspace, so screenshotting the real thing means throwing whoever is
// using the machine onto an empty workspace and back.
//
// It mounts the same `Seascape` the background does, so there is no second
// renderer here to drift out of step with the first. What it does not have is
// the wallpaper underneath, a compositor to ask about visibility, or a theme:
// the colours below are Codincod Forest's, written out.
import QtQuick

Window {
  id: win
  width: Number(win.arg("width", "1600"))
  height: Number(win.arg("height", "1000"))
  visible: true

  readonly property color ink: "#35c26d"
  readonly property color surface: "#0e1712"

  // The wallpaper is a gradient rather than a flat fill, so the preview shows
  // what the weights actually look like against the darkest part of the floor
  // as well as the lit water at the top. Pass `wall=` a real image to see the
  // sea over the picture it will actually be over, which is the only way to
  // answer whether it is visible on somebody's own desktop.
  Rectangle {
    anchors.fill: parent

    gradient: Gradient {
      GradientStop { position: 0; color: "#101c15" }
      GradientStop { position: 1; color: "#030705" }
    }
  }

  Image {
    anchors.fill: parent
    fillMode: Image.PreserveAspectCrop
    source: win.arg("wall", "") ? "file://" + win.arg("wall", "") : ""
    visible: source != ""
  }

  /**
   * `./look.sh preview.qml seed=42 settle=14 out=boat.png`
   *
   * `seed` picks which water to look at, which matters now that most of what is
   * down there is placed by a roll of the dice: the only way to see the chest is
   * to ask for a sea that has one. `settle` is how far the scene is wound on
   * before the grab, and it is the only way to catch a passer, since a boat
   * takes half a minute to cross and the default wind runs past the whole
   * crossing in one go.
   *
   * Parsed as `key=value` rather than by position because a missing positional
   * argument comes through as a string that reads as NaN, and a NaN interval on
   * the timer below means the harness hangs instead of failing.
   */
  function arg(key, fallback) {
    var all = Qt.application.arguments
    for (var i = 0; i < all.length; i++) {
      if (all[i].indexOf(key + "=") === 0) return all[i].substring(key.length + 1)
    }
    return fallback
  }

  readonly property real daylight: Number(win.arg("daylight", "1"))
  readonly property real dusk: Number(win.arg("dusk", "0"))
  readonly property real march: Number(win.arg("march", "0.5"))

  /**
   * `daylight=0 lit=0.1` is a new moon and `lit=1 waxing=0` is a full one.
   *
   * The real sky hands these over from the calendar, so the only way to look at
   * a shape that is three weeks off is to ask for it. `up=0` is the other half
   * of the month, when there is no moon over the water at all.
   */
  readonly property real lit: Number(win.arg("lit", "0.62"))
  readonly property real up: Number(win.arg("up", "1"))
  readonly property bool waxing: win.arg("waxing", "1") !== "0"
  readonly property int seed: Number(win.arg("seed", "1956"))
  readonly property real settle: Number(win.arg("settle", "40"))

  /** `tolerance=0` draws the bed the way it stood before a plant could hold a
   *  drawing, which is how the two are compared. */
  readonly property real tolerance: Number(win.arg("tolerance", "0.25"))
  readonly property string out: win.arg("out", "preview.png")

  /** `visitor=shark` to watch one animal, since a turtle crosses once a while. */
  readonly property string visitor: win.arg("visitor", "")

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
      up: win.up,
      waxing: win.waxing,
    })
    sun: ({ arc: Math.sin(win.march * Math.PI), march: win.march, up: 1 })
    rushed: true
    seed: win.seed
    settle: win.settle
    surface: win.surface
    tolerance: win.tolerance
    visitorKinds: win.visitor ? [win.visitor] : null
  }

  // Long enough that a vent has fired and the snow has spread, short enough to
  // stay a quick command.
  Timer {
    interval: 3000
    running: true
    onTriggered: win.contentItem.grabToImage(function (result) {
      result.saveToFile(Qt.resolvedUrl(win.out).toString().replace("file://", ""))
      Qt.exit(0)
    })
  }
}
