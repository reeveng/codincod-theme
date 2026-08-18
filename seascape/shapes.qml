// Every drawing in the seascape, large and on its own.
//
//   QT_QPA_PLATFORM=offscreen qml6 shapes.qml
//
// Writes shapes.png next to this file, and exits.
//
// The scene renders each of these an inch tall at four percent opacity in a
// dark green, which is right for a background and useless for telling whether
// the thing is drawn correctly. A wreck that is upside down and a wreck that is
// working look identical down there. So this draws each shape big, in one flat
// ink, with nothing in front of it, and the two questions stay separate: is the
// drawing right, and is the scene's weight right.
import QtQuick
import QtQuick.Shapes
import "Ornament.js" as Ornament

Window {
  id: win
  width: 1500
  height: 1360
  visible: true

  readonly property color ink: "#8fe0ac"
  readonly property color paper: "#0a1210"

  Rectangle {
    anchors.fill: parent
    color: win.paper
  }

  component Plate: Item {
    id: plate

    property string label: ""
    /** How many px one unit of the drawing is worth here. */
    property real unit: 120

    width: 360
    height: 320

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      color: win.ink
      font.family: "monospace"
      font.pixelSize: 15
      opacity: 0.7
      text: plate.label
      y: 8
    }

    Item {
      id: middle
      anchors.centerIn: parent
      y: 20
    }
  }

  Grid {
    anchors.centerIn: parent
    columns: 4
    spacing: 10

    // ------------------------------------------------------------- the wreck
    Plate {
      label: "wreck"

      Item {
        x: parent.width / 2
        y: parent.height / 2 + 60

        transform: Scale { xScale: 150; yScale: 150 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            fillRule: ShapePath.WindingFill
            strokeColor: "transparent"

            PathSvg { path: Ornament.WRECK }
          }

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: win.ink
            strokeWidth: 0.03

            PathMove { x: Ornament.WRECK_SPAR[0].x; y: Ornament.WRECK_SPAR[0].y }
            PathLine { x: Ornament.WRECK_SPAR[1].x; y: Ornament.WRECK_SPAR[1].y }
          }
        }
      }
    }

    // ------------------------------------------------------------ the smoker
    Plate {
      label: "smoker"

      Item {
        x: parent.width / 2
        y: parent.height / 2 + 110

        transform: Scale { xScale: 85; yScale: 85 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            fillRule: ShapePath.WindingFill
            strokeColor: "transparent"

            PathSvg { path: Ornament.SMOKER }
          }
        }
      }
    }

    // ------------------------------------------------------------- the chest
    Plate {
      label: "chest + laptop"

      Item {
        x: parent.width / 2
        y: parent.height / 2 + 90

        transform: Scale { xScale: 70; yScale: 70 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            fillRule: ShapePath.WindingFill
            strokeColor: "transparent"

            PathSvg { path: Ornament.CHEST_BODY }
          }
        }

        Repeater {
          model: Ornament.CHEST_BANDS.length

          delegate: Shape {
            id: band
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              fillColor: win.paper
              strokeColor: "transparent"

              PathSvg { path: Ornament.CHEST_BANDS[band.index] }
            }
          }
        }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.paper
            strokeColor: "transparent"

            PathSvg { path: Ornament.CHEST_LOCK }
          }

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.LAPTOP_BASE }
          }

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.LAPTOP_SCREEN }
          }
        }

        Repeater {
          model: Ornament.LAPTOP_LINES.length

          delegate: Shape {
            id: row
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              fillColor: win.paper
              strokeColor: "transparent"

              PathSvg { path: Ornament.LAPTOP_LINES[row.index] }
            }
          }
        }
      }
    }

    // ------------------------------------------------------- the code block
    Plate {
      label: "code block"

      Item {
        x: parent.width / 2
        y: parent.height / 2 + 20

        transform: Scale { xScale: 90; yScale: 90 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.BLOCK_CARD }
          }
        }

        Repeater {
          model: Ornament.BLOCK_LINES.length

          delegate: Shape {
            id: line
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              fillColor: win.paper
              strokeColor: "transparent"

              PathSvg { path: Ornament.BLOCK_LINES[line.index] }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------- the boat
    //
    // The hull and the screws, and nothing behind them. A boat's wake used to
    // be two ruled lines that came with the drawing; it is churn now, a string
    // of puffs a hull lets go of and the water carries away, so there is no
    // still of it to put on a plate.
    Plate {
      label: "boat, from under"

      Item {
        x: parent.width / 2
        y: parent.height / 2

        transform: Scale { xScale: 100; yScale: 100 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.HULL }
          }

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.SCREWS }
          }
        }
      }
    }

    // --------------------------------------------------------- the submarine
    Plate {
      label: "submarine, from the side"

      Item {
        x: parent.width / 2
        y: parent.height / 2

        transform: Scale { xScale: 100; yScale: 100 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            fillRule: ShapePath.WindingFill
            strokeColor: "transparent"

            PathSvg { path: Ornament.SUBMARINE }
          }

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.SUB_SCREW }
          }
        }
      }
    }

    // ------------------------------------------------- a squid, jet and fill
    Plate {
      label: "squid, filling"

      Squid {
        anchors.centerIn: parent
        ink: win.ink
        squeeze: 0
      }
    }

    Plate {
      label: "squid, jetting"

      Squid {
        anchors.centerIn: parent
        ink: win.ink
        squeeze: 1
      }
    }

    // ------------------------------------------- an octopus, at what it does
    Plate {
      label: "octopus, crawling"

      Item {
        x: parent.width / 2
        y: parent.height / 2 - 20

        transform: Scale { xScale: 110; yScale: 110 }

        Shape {
          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            fillColor: win.ink
            strokeColor: "transparent"

            PathSvg { path: Ornament.octopusHead(0.5) }
          }
        }

        Repeater {
          model: Ornament.octopusArms({ crawl: 0.6, doing: "crawl", facing: 1, haul: 0, reach: 1 }).length

          delegate: Shape {
            id: limb
            required property int index

            preferredRendererType: Shape.CurveRenderer

            ShapePath {
              capStyle: ShapePath.RoundCap
              fillColor: "transparent"
              strokeColor: win.ink
              strokeWidth: 0.075

              PathPolyline {
                path: {
                  var arm = Ornament.octopusArms({
                    crawl: 0.6, doing: "crawl", facing: 1, haul: 0, reach: 1,
                  })[limb.index]
                  var out = []
                  for (var i = 0; i < arm.length; i++) out.push(Qt.point(arm[i].x, arm[i].y))
                  return out
                }
              }
            }
          }
        }
      }
    }

    // The rest of the repertoire, which is the point of it: if these are not
    // telling apart on one page then the animal has one behaviour whatever its
    // state says it is doing.
    Repeater {
      model: ["probe", "rest", "pounce", "stilt", "bury", "handle", "jet"]

      delegate: Plate {
        id: doing
        required property string modelData

        label: "octopus, " + doing.modelData

        Octopus {
          doing: doing.modelData
          // A jet with nothing driving it is a jet nobody is having, and the
          // arms are read off the drive rather than off the behaviour.
          haul: doing.modelData === "jet" ? 1 : 0
          x: parent.width / 2
          y: parent.height / 2 - 20
        }
      }
    }
  }

  /** One octopus at one of its behaviours, drawn the way `Seascape.qml` does. */
  component Octopus: Item {
    id: pus

    property string doing: "crawl"
    property real crawl: 0.6
    property real haul: 0
    property color ink: win.ink
    property real reach: 1

    readonly property var pose: ({
      crawl: pus.crawl, doing: pus.doing, facing: 1, haul: pus.haul, reach: pus.reach,
    })

    transform: Scale { xScale: 110; yScale: 110 }

    Shape {
      preferredRendererType: Shape.CurveRenderer

      ShapePath {
        fillColor: pus.ink
        fillRule: ShapePath.WindingFill
        strokeColor: "transparent"

        PathSvg { path: Ornament.octopusHead(0.5) }
      }
    }

    Repeater {
      model: Ornament.octopusArms(pus.pose).length

      delegate: Shape {
        id: limb
        required property int index

        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          capStyle: ShapePath.RoundCap
          fillColor: "transparent"
          strokeColor: pus.ink
          strokeWidth: 0.075

          PathPolyline {
            path: {
              var arm = Ornament.octopusArms(pus.pose)[limb.index]
              var out = []
              for (var i = 0; i < arm.length; i++) out.push(Qt.point(arm[i].x, arm[i].y))
              return out
            }
          }
        }
      }
    }
  }

  component Squid: Item {
    id: squid

    property color ink: "#8fe0ac"
    property real squeeze: 0

    width: 1
    height: 1

    Item {
      transform: Scale { xScale: 260; yScale: 260 }

      Shape {
        preferredRendererType: Shape.CurveRenderer

        ShapePath {
          fillColor: squid.ink
          fillRule: ShapePath.WindingFill
          strokeColor: "transparent"

          PathSvg { path: Ornament.squidBody(squid.squeeze) }
        }
      }

      Repeater {
        model: Ornament.squidArms(squid.squeeze).length

        delegate: Shape {
          id: arm
          required property int index

          preferredRendererType: Shape.CurveRenderer

          ShapePath {
            capStyle: ShapePath.RoundCap
            fillColor: "transparent"
            strokeColor: squid.ink
            strokeWidth: 0.035

            PathPolyline {
              path: {
                var one = Ornament.squidArms(squid.squeeze)[arm.index]
                var out = []
                for (var i = 0; i < one.length; i++) out.push(Qt.point(one[i].x, one[i].y))
                return out
              }
            }
          }
        }
      }
    }
  }

  Timer {
    interval: 300
    running: true
    onTriggered: win.contentItem.grabToImage(function (result) {
      result.saveToFile(Qt.resolvedUrl("shapes.png").toString().replace("file://", ""))
      Qt.exit(0)
    })
  }
}
