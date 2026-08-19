/**
 * The light in the water, and what is falling through it.
 *
 * Shafts from the surface, marine snow, and the bubbles off a vent. The
 * numbers are `Seascape.qml`'s, because the two renderers are meant to be the
 * same sea.
 */
import type { Drift } from "../../../codincodv2/assets/js/ornament/drift.ts"
import { SPREAD, type Rays } from "../../../codincodv2/assets/js/ornament/rays.ts"
import { OWN, type Pen, type Point, TONE } from "./pen.ts"

/** How dark each of these may be, as a share of full ink. */
const RAY_INK = 0.07
const SNOW_INK = 0.15
const BUBBLE_INK = 0.3

/**
 * How much light there is to make shafts out of, at the hour it is.
 *
 * Not none at night. A moon over calm water throws the same shafts a sun does,
 * and a scene whose light went out altogether at dusk would be a scene that
 * turned into a black rectangle for half of every day.
 */
const MOON_RAYS = 0.28

/**
 * How many copies each shaft is drawn as, and how much shorter each one inside
 * it is.
 *
 * The plies are drawn one over another, so at any height they are the same fade
 * repeated, and copies hung to the same depth step down at exactly the same
 * heights: the eye is offered one edge as strong as all of them. Staggering
 * them gives each step its own height, and the core of the shaft runs out above
 * the glow around it, which is what a shaft does.
 */
const PLIES = 4
const TAPER = 0.13

/** How many bubbles are ever drawn at once. */
const BUBBLES = 96

/** Where these sit against everything else. */
const LANE = { ray: -1 }

export function paintRays(pen: Pen, light: Rays, daylight: number): void {
  const overcast = MOON_RAYS + (1 - MOON_RAYS) * daylight

  for (const ray of light.rays) {
    const slope = Math.tan(ray.tilt)
    const mouth = ray.span / 2
    const hem = (ray.span * SPREAD) / 2
    const lit = (RAY_INK / PLIES) * overcast * ray.glow
    if (lit <= 0) continue

    for (let ply = 0; ply < PLIES; ply++) {
      const inset = 1 - ply / PLIES
      const drop = ray.reach * (1 - ply * TAPER)
      const lean = drop * slope
      const lip = mouth * inset
      const flare = (mouth + (hem - mouth) * (ray.reach > 0 ? drop / ray.reach : 0)) * inset

      pen.fill(
        [
          [
            { x: ray.x - lip, y: 0 },
            { x: ray.x + lip, y: 0 },
            { x: ray.x + flare + lean, y: drop },
            { x: ray.x - flare + lean, y: drop },
          ],
        ],
        {
          alpha: lit,
          fade: [0, drop],
          lane: LANE.ray,
          spent: true,
          tone: TONE.ink,
        },
      )
    }
  }
}

/**
 * Marine snow, sorted into the fish by depth rather than laid over them, so a
 * near mote passes in front of a far animal and the water gets a thickness the
 * fish alone cannot give it.
 */
export function paintSnow(pen: Pen, drift: Drift): void {
  for (const mote of drift.motes) {
    pen.fill([disc(mote.x, mote.y, mote.r)], {
      lane: mote.depth,
      shade: mote.y,
      weight: SNOW_INK * mote.depth,
    })
  }

  // Rings rather than discs. A filled circle at this size is a dot, and a dot
  // going up is a dot going up; an outline with the water showing through it is
  // a bubble.
  let drawn = 0
  for (const bubble of drift.bubbles) {
    if (drawn++ >= BUBBLES) break

    pen.line([ring(bubble.x, bubble.y, bubble.r)], {
      alpha: BUBBLE_INK * bubble.depth,
      lane: bubble.depth,
      shade: OWN,
      tone: TONE.ink,
      width: 1,
    })
  }
}

/** How many sides a small round thing is worth cutting into. */
const SIDES = 16

export function disc(cx: number, cy: number, r: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < SIDES; i++) {
    const turn = (i / SIDES) * Math.PI * 2
    points.push({ x: cx + r * Math.cos(turn), y: cy + r * Math.sin(turn) })
  }
  return points
}

/** The same, as a line that comes back to where it started. */
export function ring(cx: number, cy: number, r: number): Point[] {
  const points = disc(cx, cy, r)
  points.push(points[0])
  return points
}
