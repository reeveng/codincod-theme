/**
 * What is above the water: the two bodies, the light off them, and the wash the
 * hour puts over everything.
 *
 * `Seascape.qml` draws the same thing and the numbers here are its numbers. The
 * sky itself comes from `sun.ts` in the ornament, so the sun sets on this
 * wallpaper at the minute it sets in the porthole on the website, and the moon
 * is the shape tonight's moon actually is.
 */
import {
  type Passage,
  type Phase,
  sunNow,
  sunlit,
} from "../../../codincodv2/assets/js/ornament/sun.ts"
import { OWN, type Pen, type Point, TONE } from "./pen.ts"

/** The ends of a crossing, the top and bottom of the arc between them, and how
 *  big a body is drawn. */
const EAST = 0.12
const WEST = 0.88
const HIGH = 0.055
const LOW = 0.17
const DISC = 0.028

/** How far the shaft's foot swings either side of the body, and how far it has
 *  opened by the bottom of the box. */
const SWING = 0.34
const SPREAD = 0.085

/** How far down the box the shaft goes, how heavy it is at its mouth, and how
 *  fast it gives up. */
const FALL = 0.34
const DISC_INK = 0.012
const DISC_GIVE = 2.6

/** The three lights off a body: the veil out past everything, the halo that is
 *  most of the light there is, and the streak a lens gives a bright thing. */
const BLOOM = { fall: 2.4, ink: 0.016, reach: 13, thin: 1 }
const HALO = { fall: 1.6, ink: 0.07, reach: 4.2, thin: 1 }
const STREAK = { fall: 2.1, ink: 0.06, reach: 12, thin: 0.1 }

/** How much of the box a dusk reaches down, and how heavy the two washes are. */
const DUSK_REACH = 0.62
const DUSK_INK = 0.09
const NIGHT_INK = 0.3

/** Where the bodies sit against everything else, and where the washes do. */
const LANE = { body: -1.2, dusk: 3, night: 3.1 }

/**
 * The craters, off centre and unevenly sized on purpose.
 *
 * Three round spots spaced evenly on a disc is a face, and the moment anybody
 * sees a face there they stop seeing a moon. In units of the moon's own radius,
 * with the size third.
 */
const CRATERS = [
  [-0.34, -0.22, 0.22],
  [0.19, -0.45, 0.1],
  [0.31, 0.3, 0.15],
] as const

/** How dark a crater is against the moon it is on. */
const CRATER_INK = 0.34

/** How many sides a disc is cut into. Enough that the edge of a moon a
 *  fingernail across is a curve rather than a decision. */
const ROUND = 72

export interface Box {
  height: number
  width: number
}

/**
 * The sky, drawn.
 *
 * Both bodies every time, not the one that happens to be up: a single disc that
 * swapped identity at dusk would set in the west and reappear a moment later in
 * the east. Fading a setting sun out where it set while a moon comes up on the
 * other side is what actually happens, and it costs one more circle.
 */
export function paintSky(pen: Pen, box: Box): { daylight: number; dusk: number } {
  const sky = sunNow()
  const bodies = [
    { moon: false, passage: sky.sun, phase: null as Phase | null, show: sky.daylight, tone: TONE.sun },
    {
      moon: true,
      passage: sky.moon,
      phase: sky.moon as Phase,
      show: (1 - sky.daylight) * sky.moon.up,
      tone: TONE.moon,
    },
  ]

  for (const body of bodies) {
    if (body.show <= 0.004) continue
    paintBody(pen, box, body.passage, body.phase, body.show, body.tone)
  }

  // Dusk falls off with depth and night does not, which is the difference
  // between the two. A sunset is a colour arriving through the surface and it
  // gets no further down than the light it came in on; laid flat over the whole
  // box it lifts the floor off black and the water goes to one olive haze.
  if (sky.dusk > 0) {
    pen.wash({
      alpha: DUSK_INK * sky.dusk,
      fade: [0, box.height * DUSK_REACH],
      lane: LANE.dusk,
      tone: TONE.dusk,
    })
  }

  if (sky.daylight < 1) {
    pen.wash({ alpha: NIGHT_INK * (1 - sky.daylight), lane: LANE.night, tone: TONE.surface })
  }

  return { daylight: sky.daylight, dusk: sky.dusk }
}

/**
 * One body: the light around it, the shaft under it, and the disc itself.
 *
 * The disc is drawn at full strength whatever shape it is in, because a
 * crescent is as bright per inch as a full moon and there is simply less of it.
 * What there is less of is everything around it, so the halo, the bloom, the
 * streak and the shaft all take `lit`. A new moon throws nothing, which is what
 * a new moon does.
 */
function paintBody(
  pen: Pen,
  box: Box,
  passage: Passage,
  phase: Phase | null,
  show: number,
  tone: number,
): void {
  const r = box.height * DISC
  const cx = box.width * (EAST + passage.march * (WEST - EAST))
  const cy = box.height * (LOW + passage.arc * (HIGH - LOW))
  const glow = show * (phase ? phase.lit : 1)

  // A body over on the left throws its shaft down and to the right, and one
  // directly overhead throws it straight down.
  const lean = (0.5 - passage.march) * SWING

  for (const light of [BLOOM, HALO, STREAK]) {
    pen.light(cx, cy, {
      alpha: light.ink * glow,
      fall: light.fall,
      lane: LANE.body,
      shade: OWN,
      thin: light.thin,
      tone,
      width: r * light.reach,
    })
  }

  // The shaft, its mouth the disc's own diameter at the disc's own centre, so
  // the two edges are tangent to it and the lower half of the disc sits inside
  // its own light. Started anywhere below that line the mouth is wider than the
  // disc is at that height, and the light appears to come out of its sides.
  pen.fill(
    [
      { x: cx - r, y: cy },
      { x: cx + r, y: cy },
      { x: cx + box.width * (lean + SPREAD), y: box.height },
      { x: cx + box.width * (lean - SPREAD), y: box.height },
    ],
    {
      alpha: DISC_INK * glow,
      fade: [cy, Math.max(1, box.height * FALL - cy)],
      fall: DISC_GIVE,
      lane: LANE.body,
      tone,
    },
  )

  pen.fill(phase ? crescent(cx, cy, r, phase) : disc(cx, cy, r), {
    alpha: show,
    lane: LANE.body,
    tone,
  })

  if (!phase) return

  // A crater sitting where there is no moon under it is a grey spot on the sky,
  // so one is drawn only once it is clear of the terminator by its own width,
  // and fades in over the next. Through the month they go out one after another
  // as the shadow crosses them, which is what a terminator is for looking at.
  for (const [x, y, size] of CRATERS) {
    const clear = sunlit(x, y, phase) / size - 1
    if (clear <= 0) continue

    pen.fill(disc(cx + r * x, cy + r * y, r * size), {
      alpha: CRATER_INK * show * Math.min(1, clear),
      lane: LANE.body,
      tone: TONE.surface,
    })
  }
}

/** A disc, as a polygon. */
function disc(cx: number, cy: number, r: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < ROUND; i++) {
    const turn = (i / ROUND) * Math.PI * 2
    points.push({ x: cx + r * Math.cos(turn), y: cy + r * Math.sin(turn) })
  }
  return points
}

/**
 * The lit part of the moon, as a polygon.
 *
 * The same two arcs `crescent` in the ornament writes as a path, walked instead
 * of written: the limb, which is the disc's own edge on the side the sun is,
 * and the terminator, which is a circle around the moon seen edge on and so is
 * an ellipse squeezed by how much of the disc is in the light.
 */
function crescent(cx: number, cy: number, r: number, { lit, waxing }: Phase): Point[] {
  const side = waxing ? 1 : -1
  const waist = r * (2 * lit - 1)
  const points: Point[] = []
  const half = ROUND / 2

  for (let i = 0; i <= half; i++) {
    const turn = (i / half) * Math.PI
    points.push({ x: cx + side * r * Math.sin(turn), y: cy - r * Math.cos(turn) })
  }
  for (let i = half; i >= 0; i--) {
    const turn = (i / half) * Math.PI
    points.push({ x: cx - side * waist * Math.sin(turn), y: cy - r * Math.cos(turn) })
  }

  return points
}
