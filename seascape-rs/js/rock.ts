/**
 * What the water sits on and what stands out of it: stones, near rock, the
 * reef's heads, an island, and whatever is lying on the bottom.
 *
 * Everything here recedes the way the ground recedes rather than the way an
 * animal does. The rock in front of the picture is the exception and is painted
 * away from the ink instead: it is between the light and the reader, so what
 * there is to see of it is that none of the light came back.
 */
import { type Crags, SPRIGS } from "../../../codincodv2/assets/js/ornament/crags.ts"
import type { Reef } from "../../../codincodv2/assets/js/ornament/reef.ts"
import {
  BLOCK_CARD,
  BLOCK_LINES,
  CHEST_BANDS,
  CHEST_BODY,
  CHEST_LOCK,
  LAPTOP_BASE,
  LAPTOP_LINES,
  LAPTOP_SCREEN,
  type Relics,
  SMOKER,
  WRECK,
  WRECK_SPAR,
} from "../../../codincodv2/assets/js/ornament/relics.ts"
import type { Seabed } from "../../../codincodv2/assets/js/ornament/seabed.ts"
import { disc } from "./light.ts"
import { OWN, type Pen, type Point, TONE } from "./pen.ts"
import type { Box } from "./sky.ts"
import { trace } from "./trace.ts"

/** How dark each of these may be at the front of the picture. */
const CRAG_INK = 0.94
const FLORA_INK = 0.33
const HAZE_INK = 0.04
const ISLE_INK = 0.88
const PLUME_INK = 0.2
const RELIC_INK = 0.24
const STONE_INK = 0.25

/** How much of a weight is punched back out for a strap, a lock or a line. */
const CUT_SHADE = 0.34

/** What is left of a puff's own body over the last of its life. */
const PLUME_LET_GO = 0.25

/** How far forward a mass has to stand before it is rock you are among rather
 *  than rock you are looking at, and what grows on it. */
const CRAG_NEAR = 0.8

/**
 * How far the lens gives up on the near rock, in pixels, at the front of the
 * water, and each mass takes its own share of it by how far forward it stands.
 *
 * `Seascape.qml` says the same in a blur of 0.24 out of a `blurMax` of 48.
 */
const CRAG_BLUR = 0.24 * 48
const PERCH_SCALE = 1.15
const PERCH_SHADE = 0.72

/** How thick a blade is against the strand it grows off. */
const BLADE_GIRTH = 0.8

/** How many relics and how much smoke are ever drawn at once. */
const MOST = { plume: 76, relics: 4 }

/** Where these sit against everything else. */
const LANE = { isle: -1.15, plume: -1.6 }

function far(full: number, depth: number): number {
  return HAZE_INK + (full - HAZE_INK) * Math.min(1, Math.max(0, depth))
}

/**
 * A face of near rock, closed off past the edge it hangs from.
 *
 * The ground closes downwards because the ground is what the box is standing
 * on. A wall is not: it comes in from the side and the mass of it is off the
 * picture, so closing it under the box would fill the water in front of it as
 * well. The roof is the same statement turned on its end.
 */
function faced(points: readonly Point[], edge: string, box: Box): Point[] {
  const out = points.map((p) => ({ x: p.x, y: p.y }))
  if (!out.length) return out

  const first = out[0]
  const last = out[out.length - 1]
  const past = 60

  if (edge === "top") {
    out.push({ x: last.x, y: -past })
    out.push({ x: first.x, y: -past })
    return out
  }

  const side = edge === "left" ? -past : box.width + past
  out.push({ x: side, y: last.y })
  out.push({ x: side, y: first.y })
  return out
}

/** A ridge with the box's floor closed off underneath it. */
function floored(points: readonly Point[], box: Box): Point[] {
  const out = points.map((p) => ({ x: p.x, y: p.y }))
  if (!out.length) return out

  out.push({ x: out[out.length - 1].x, y: box.height + 2 })
  out.push({ x: out[0].x, y: box.height + 2 })
  return out
}

/**
 * Stones, lying where they fell.
 *
 * Rounded rather than drawn: at this weight a stone is a mass with a lean on
 * it, and an outline would make it a pebble somebody had illustrated. A
 * round-capped line is the same shape as a rectangle with a radius of half its
 * height, which is what the other renderer draws one as.
 */
export function paintStones(pen: Pen, seabed: Seabed): void {
  for (const stone of seabed.stones) {
    const run = Math.max(0, stone.span - stone.rise) / 2

    pen.line([[{ x: -run, y: 0 }, { x: run, y: 0 }]], {
      lane: -2 + stone.depth * 0.3,
      shade: stone.y,
      weight: far(STONE_INK, stone.depth),
      width: stone.rise,
    }, { tilt: stone.lean, x: stone.x, y: stone.y - stone.rise * 0.12 })
  }
}

/**
 * The reef's heads: what took a place on the mound.
 *
 * A head is drawn the way a plant is, and which of the two kinds of drawing it
 * carries is its own business: a stencil hands over twigs, and an animal hands
 * over a stalk with whatever it has grown on the end of it.
 */
export function paintHeads(pen: Pen, reef: Reef): void {
  for (const head of reef.heads) {
    const weight = far(FLORA_INK, head.depth)
    const mark = { lane: -3 + head.depth, shade: head.y, weight }

    if (head.blades.length > 0) {
      pen.line([head.points], { ...mark, width: head.girth })
      pen.line(head.blades, { ...mark, width: head.girth * BLADE_GIRTH })
    }

    if (head.twigs.length === 0) continue

    // A stencil: the same drawing every frame, leaned where it grew and bent by
    // the swell it is standing in. Coral does not move under its own steam, and
    // with everything else on this rock moving it is what the movement is
    // measured against.
    const spot = { scale: head.scale, tilt: head.lean + head.bend, x: head.x, y: head.y }
    for (const twig of head.twigs) {
      pen.line(trace(twig.d), { ...mark, width: twig.width * head.scale }, spot)
    }
  }
}

/**
 * The rock you are among, and what is living on it.
 *
 * Last of the ground and over everything including the boats: on the days this
 * water has a roof, the roof is between the picture and the surface, and a hull
 * drawn through it would be a hull inside the rock.
 */
export function paintCrags(pen: Pen, crags: Crags, box: Box): void {
  for (const crag of crags.rocks) {
    const weight = CRAG_INK * crag.depth
    const near = crag.depth >= CRAG_NEAR
    const adrift = near ? (crag.depth - CRAG_NEAR) / Math.max(0.01, 1 - CRAG_NEAR) : 0
    const lane = near ? crag.depth + 0.5 : crag.depth
    const soft = CRAG_BLUR * adrift

    pen.fill([faced(crag.outline, crag.edge, box)], {
      lane,
      shade: OWN,
      soft,
      tone: TONE.shadow,
      weight,
    })

    // What is growing on it, one colony at a time. Drawn a shade off the rock
    // rather than in the rock's own weight: a silhouette on a silhouette is a
    // silhouette, and the whole reason these are here is that a bare wall is a
    // shape somebody cut out of paper.
    for (const perch of crag.perches) {
      const unit = perch.size * PERCH_SCALE * crag.depth
      // The drawing grows up out of nothing; the perch says which way is out of
      // the rock, and a quarter turn is the difference between them.
      const spot = { scale: unit, tilt: perch.lean + Math.PI / 2, x: perch.x, y: perch.y }

      for (const twig of SPRIGS[perch.kind]) {
        pen.line(trace(twig.d), {
          lane,
          shade: perch.y,
          soft,
          tone: TONE.shadow,
          weight: weight * PERCH_SHADE,
          width: twig.width * unit,
        }, spot)
      }
    }
  }

  // An island, where the ground climbed the whole way and came out. It goes
  // dark rather than bright for the reason near rock does: a shore lit from
  // behind is a silhouette, and everybody has seen that one.
  if (crags.isle) {
    pen.fill([floored(crags.isle.outline, box)], {
      lane: LANE.isle,
      shade: OWN,
      tone: TONE.shadow,
      weight: ISLE_INK,
    })
  }
}

/**
 * What is lying on the bottom, and what is coming out of it.
 *
 * Behind the sand rather than in front of it: a wreck lies half buried, and the
 * sand is what buries it.
 */
export function paintRelics(pen: Pen, wreckage: Relics): void {
  let drawn = 0
  for (const one of wreckage.relics) {
    if (drawn++ >= MOST.relics) break

    const weight = RELIC_INK * one.depth
    const spot = { scale: one.scale, tilt: one.lean, x: one.x, y: one.y }
    const mark = { lane: -3 + one.depth, shade: one.y, weight }
    const cut = { ...mark, weight: weight * CUT_SHADE }

    const body =
      one.kind === "wreck"
        ? WRECK
        : one.kind === "smoker"
          ? SMOKER
          : one.kind === "chest"
            ? CHEST_BODY
            : BLOCK_CARD
    pen.fill(trace(body), mark, spot)

    // The wreck's spar, which is what stops a pair of leaning verticals reading
    // as two dead trees.
    if (one.kind === "wreck") {
      pen.line([WRECK_SPAR], { ...mark, width: 0.03 * one.scale }, spot)
    }

    // The code block's three lines, cut out of the card in the surface rather
    // than drawn in ink, the way a fish's eye is. A snippet is a card with
    // light coming through it, not a card with marks on it.
    if (one.kind === "block") {
      for (const line of BLOCK_LINES) pen.fill(trace(line), cut, spot)
    }

    // The chest, and the laptop still open on its lid. The straps and the lock
    // are cut out in the surface; the screen is the one thing in the whole sea
    // drawn at full ink.
    if (one.kind === "chest") {
      for (const band of CHEST_BANDS) pen.fill(trace(band), cut, spot)
      pen.fill(trace(CHEST_LOCK), cut, spot)
      pen.fill(trace(LAPTOP_BASE), mark, spot)
      pen.fill(trace(LAPTOP_SCREEN), { ...mark, tone: TONE.ink, weight: 1 }, spot)
      for (const row of LAPTOP_LINES) {
        pen.fill(trace(row), { ...mark, tone: TONE.surface, weight: 1 }, spot)
      }
    }
  }

  // What the smoker is pouring: the only thing on the bottom that moves under
  // its own steam rather than the water's, which is what makes a vent read as
  // hot. Opaque for most of its life, like everything else that is a thing
  // rather than light, and letting go of the last of the alpha as well, because
  // by then the puff is the colour of what is behind it.
  let puffed = 0
  for (const puff of wreckage.plume) {
    if (puffed++ >= MOST.plume) break

    pen.fill([disc(puff.x, puff.y, puff.r)], {
      alpha: Math.min(1, (1 - puff.age) / PLUME_LET_GO),
      lane: LANE.plume,
      shade: puff.y,
      weight: PLUME_INK * Math.sqrt(Math.max(0, 1 - puff.age)),
    })
  }
}
