// A still of the sea, rendered offscreen.
//
//   QT_QPA_PLATFORM=offscreen qml6 preview.qml
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
  width: 1600
  height: 1000
  visible: true

  readonly property color ink: "#35c26d"
  readonly property color surface: "#0e1712"

  // The wallpaper is a gradient rather than a flat fill, so the preview shows
  // what the weights actually look like against the darkest part of the floor
  // as well as the lit water at the top.
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
    ink: win.ink
    surface: win.surface
  }

  // Long enough that a vent has fired and the snow has spread, short enough to
  // stay a quick command.
  Timer {
    interval: 4000
    running: true
    onTriggered: win.contentItem.grabToImage(function (result) {
      result.saveToFile(Qt.resolvedUrl("preview.png").toString().replace("file://", ""))
      Qt.exit(0)
    })
  }
}
