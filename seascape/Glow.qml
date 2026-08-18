import QtQuick
import QtQuick.Shapes

/**
 * A round light, brightest in the middle and gone by its own edge.
 *
 * Every light in this scene above the size of a dot is one of these: the glow
 * around the disc, the veil of bloom past it, and the streak across it, which is
 * the same light again with the height taken out of it. They were three hand
 * written radial gradients before, each with its own ladder of stops, and the
 * only real difference between them was how fast they gave out.
 *
 * ## Why the stops are a ladder and not two ends
 *
 * A gradient stop is a corner. Between two of them the alpha runs dead straight,
 * and where two straight runs meet at different slopes the eye finds a ring. A
 * light in water does not fall off in a straight line, so two stops draw the
 * chord of the curve it wants and every extra stop is another chance to bend.
 * Seven of them on a curve this steep leaves nowhere for a corner to show.
 *
 * The same fault, on a shaft rather than a halo, is why the disc's beam has ten.
 */
Shape {
  id: glow

  /** Where the light is, in the box's own coordinates. */
  property real cx: 0
  property real cy: 0

  /**
   * How fast it gives out, as the exponent on the way out from the middle.
   *
   * At 1 the light thins evenly and ends in a visible hem, which is a disc with
   * a soft edge rather than a light. Past about 3 it is gone before it has left
   * the thing it came off. Between those is every glow in this scene.
   */
  property real fall: 1.6

  /** The colour of the light, and how heavy it is at the middle. */
  property color hue: "#ffffff"
  property real ink: 0.07

  /** How far out it reaches before there is nothing left of it, in px. */
  property real reach: 0

  /**
   * How much of its height it keeps. 1 is round, and anything under it is a
   * streak: the width a lens gives a bright light it cannot quite hold, drawn as
   * this same light with the height squeezed out of it rather than as a shape of
   * its own.
   */
  property real thin: 1

  function at(out) {
    return Qt.rgba(glow.hue.r, glow.hue.g, glow.hue.b, glow.ink * Math.pow(1 - out, glow.fall))
  }

  preferredRendererType: Shape.CurveRenderer
  visible: glow.ink > 0 && glow.reach > 0
  transform: Scale {
    origin.x: glow.cx
    origin.y: glow.cy
    yScale: glow.thin
  }

  ShapePath {
    fillGradient: RadialGradient {
      centerRadius: glow.reach
      centerX: glow.cx
      centerY: glow.cy
      focalX: glow.cx
      focalY: glow.cy

      GradientStop { position: 0; color: glow.at(0) }
      GradientStop { position: 0.18; color: glow.at(0.18) }
      GradientStop { position: 0.34; color: glow.at(0.34) }
      GradientStop { position: 0.5; color: glow.at(0.5) }
      GradientStop { position: 0.66; color: glow.at(0.66) }
      GradientStop { position: 0.83; color: glow.at(0.83) }
      GradientStop { position: 1; color: glow.at(1) }
    }
    strokeColor: "transparent"

    PathAngleArc {
      centerX: glow.cx
      centerY: glow.cy
      radiusX: glow.reach
      radiusY: glow.reach
      startAngle: 0
      sweepAngle: 360
    }
  }
}
