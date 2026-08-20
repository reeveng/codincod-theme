/**
 * Everything alive, and everything going over the top of it.
 *
 * The shoal, the clownfish in their anemones, the bait ball, the big animals
 * that cross once in a while, the cephalopods, what walks on the bottom, and
 * the boats. All of it is the ornament's own simulation; what is here is what
 * `Seascape.qml` decides, which is how heavy each of them is drawn and how far
 * back it stands.
 */
import type { Cephalopods } from "../../../codincodv2/assets/js/ornament/cephalopods.ts"
import { frameAt, SPAN } from "../../../codincodv2/assets/js/ornament/fish_shape.ts"
import type { Nemos } from "../../../codincodv2/assets/js/ornament/nemos.ts"
import {
  HULL,
  PING_RINGS,
  type Passers,
  ringAt,
  SCREWS,
  SUB_SCREW,
  SUBMARINE,
} from "../../../codincodv2/assets/js/ornament/passers.ts"
import { SPECIES, type Shoal } from "../../../codincodv2/assets/js/ornament/shoal.ts"
import type { Swarm } from "../../../codincodv2/assets/js/ornament/swarm.ts"
import { BODIES, type Visitors } from "../../../codincodv2/assets/js/ornament/visitors.ts"
import { octopusArms, octopusHead, squidArms, squidBody } from "../../../codincodv2/assets/js/ornament/cephalopods.ts"
import type { Walkers } from "../../../codincodv2/assets/js/ornament/walkers.ts"
import { disc, ring } from "./light.ts"
import { OWN, type Pen, TONE } from "./pen.ts"
import { trace } from "./trace.ts"

/** How dark an animal in the open water may be, and how much of that weight it
 *  keeps at the back of it. */
const OPEN_WATER = 0.22
const DEPTH_INK = 0.65

/** The rest of the ceilings, each one thing's share of full ink. */
const CRAWLER_INK = 0.42
const CRAWLER_LIFT = 0.8
const CRAWLER_RISEN = 0.62
const FROTH_INK = 0.3
const FROTH_LET_GO = 0.45
const HAZE_INK = 0.04
const HULL_INK = 0.16
const PING_INK = 0.62
const SPECK_INK = 0.16
const VISITOR_INK = 0.42

/** How much of a weight is punched back out again for an eye or a cut line. */
const CUT_SHADE = 0.34

/** What the bodies are drawn as lines at, in their own units. */
const ARM_GIRTH = 0.075
const TENTACLE_GIRTH = 0.035

/** How many of each are ever drawn at once. */
const MOST = { froth: 220, passers: 4, specks: 420, visitors: 6 }

/** Where the boats sit, which is over everything in the water. */
const LANE = { froth: 1.15, passer: 1.2 }

/**
 * What a weight is worth at a distance, for anything in the open water.
 *
 * It keeps a share of its weight whatever the distance, because an animal that
 * faded into the murk as far as the ground does is an animal the eye loses in
 * the middle of a stroke.
 */
function afloat(full: number, depth: number): number {
  return full * (1 - DEPTH_INK + DEPTH_INK * depth)
}

/** And what it is worth for anything standing on the bottom, which does fade
 *  the whole way: the murk it is seen through is the ground's. */
function far(full: number, depth: number): number {
  return HAZE_INK + (full - HAZE_INK) * Math.min(1, Math.max(0, depth))
}

export function paintShoal(pen: Pen, shoal: Shoal): void {
  for (const fish of shoal.fish) {
    const weight = afloat(OPEN_WATER, fish.depth)
    if (weight <= 0.002) continue

    const frame = frameAt(fish.tail)
    const spot = {
      facing: fish.facing,
      scale: fish.size / SPAN,
      tilt: fish.tilt,
      x: fish.x,
      y: fish.y,
    }

    // The billed kinds are a whole drawing of their own rather than this one
    // with a bill laid over it. Two fills would put a seam across the
    // swordfish's face wherever the bill's buried root crossed the head.
    pen.fill(trace(SPECIES[fish.kind].bill > 0 ? frame.billed : frame.d), {
      lane: fish.depth,
      shade: fish.y,
      weight,
    }, spot)

    // The eye is punched out in the surface behind it rather than drawn in an
    // ink of its own, which is why a fish reads as a cutout in the water
    // instead of a sticker on it.
    pen.fill([disc(frame.eye.x, frame.eye.y, frame.eye.r)], {
      lane: fish.depth,
      shade: fish.y,
      weight: weight * CUT_SHADE,
    }, spot)
  }
}

/**
 * The clownfish, each in the anemone it lives in.
 *
 * `face` is the drawn width and its sign is the mirror, so the fish squeezes to
 * nothing and opens out the other way, which is what a fish that has stopped
 * actually does. A fish all the way into the tentacles is not drawn at all
 * rather than drawn faintly: it has not become hard to see, it is behind
 * something.
 */
export function paintNemos(pen: Pen, nemos: Nemos): void {
  for (const nemo of nemos.nemos) {
    const weight = afloat(OPEN_WATER, nemo.host.depth) * (1 - nemo.cover)
    if (weight <= 0.002) continue

    pen.fill(trace(frameAt(nemo.beat).d), {
      lane: -3 + nemo.host.depth,
      shade: nemo.y,
      weight,
    }, {
      facing: nemo.face,
      scale: nemo.length / SPAN,
      tilt: nemo.tilt,
      x: nemo.x,
      y: nemo.y,
    })
  }
}

/**
 * A flock of thousands, which is a few hundred specks and a shape round them.
 *
 * Marks rather than fish. At the size one of these is on the screen a fish
 * drawing is four pixels of nothing, and what makes a bait ball read is that it
 * is a crowd with a body: hundreds of identical small marks, packed, all
 * leaning the same way and all leaning a little differently.
 */
export function paintSwarm(pen: Pen, flock: Swarm): void {
  let drawn = 0
  for (const speck of flock.specks) {
    if (drawn++ >= MOST.specks) break

    const weight = afloat(SPECK_INK, speck.depth) * flock.weight
    if (weight <= 0.002) continue

    const girth = Math.max(0.7, speck.size * 0.42)
    pen.line([[{ x: -speck.size / 2, y: 0 }, { x: speck.size / 2, y: 0 }]], {
      lane: speck.depth,
      shade: speck.y,
      weight,
      width: girth,
    }, { tilt: speck.tilt, x: speck.x, y: speck.y })
  }
}

/**
 * The big animals: a turtle, a pod of dolphins, a manta, a shark going
 * somewhere, and once in a very long while a thing that is none of those.
 * Heavier than a fish, because what is being read across the whole picture is
 * the shape, and a shape drawn at the shoal's weight is a smudge.
 */
export function paintVisitors(pen: Pen, visitors: Visitors): void {
  let drawn = 0
  for (const guest of visitors.crossing) {
    if (drawn++ >= MOST.visitors) break

    const weight = afloat(VISITOR_INK * guest.weight, guest.depth)
    if (weight <= 0.002) continue

    pen.fill(trace(BODIES[guest.kind](guest.stroke)), {
      lane: guest.depth,
      shade: guest.y,
      weight,
    }, {
      facing: guest.facing,
      scale: guest.size,
      tilt: guest.tilt,
      x: guest.x,
      y: guest.y,
    })
  }
}

/**
 * Squid and octopus.
 *
 * A squid jets and drifts, which is the opposite rhythm to a tail. An octopus
 * is on the bottom rather than in the water, except for the once in a long
 * while when one lets go, so it recedes the way the bottom does and it runs
 * between two weights by how far off the floor it is.
 */
export function paintInklings(pen: Pen, inklings: Cephalopods): void {
  for (const squid of inklings.squids) {
    const weight = afloat(OPEN_WATER, squid.depth)
    if (weight <= 0.002) continue

    const spot = {
      facing: squid.facing,
      scale: squid.size,
      tilt: squid.tilt,
      x: squid.x,
      y: squid.y,
    }
    const mark = { lane: squid.depth, shade: squid.y, weight }

    pen.fill(trace(squidBody(squid.squeeze)), mark, spot)
    pen.line(squidArms(squid.squeeze), { ...mark, width: TENTACLE_GIRTH * squid.size }, spot)
  }

  for (const octopus of inklings.octopuses) {
    const aloft = Math.max(-1, Math.min(1, octopus.lift / CRAWLER_LIFT))
    const bedded = far(CRAWLER_INK, octopus.depth)
    const risen = far(CRAWLER_RISEN, octopus.depth)

    // Under the sand is under the haze. A buried one is not a faint animal, it
    // is a bump in the ground with an animal somewhere inside it.
    const weight = aloft < 0 ? bedded * (1 + aloft * 0.7) : bedded + (risen - bedded) * aloft
    if (weight <= 0.002) continue

    const spot = { scale: octopus.size, x: octopus.x, y: octopus.y }
    const mark = { lane: octopus.depth, shade: octopus.y, weight }

    pen.fill(trace(octopusHead(octopus.breath)), mark, spot)
    pen.line(octopusArms(octopus), { ...mark, width: ARM_GIRTH * octopus.size }, spot)
  }
}

/**
 * Crabs and starfish, which is everything down there that has legs and never
 * uses them to leave.
 *
 * The legs first and the body over them, so a claw folded across the shell
 * reads as a claw in front of a shell rather than a crack in it.
 */
export function paintWalkers(pen: Pen, walkers: Walkers): void {
  for (const one of walkers.walkers) {
    const weight = far(CRAWLER_INK, one.depth)
    if (weight <= 0.002) continue

    const spot = { facing: one.facing, scale: one.size, x: one.x, y: one.y }
    const mark = { lane: one.depth, shade: one.y, weight }

    pen.line(one.legs, { ...mark, width: ARM_GIRTH * one.size }, spot)
    pen.fill(trace(one.body), mark, spot)
  }
}

/**
 * What goes past overhead, and what is looking for you.
 *
 * Minutes apart rather than seconds, and most sittings will hold neither: a
 * scene you can watch the whole vocabulary of in a minute is wallpaper.
 */
export function paintPassers(pen: Pen, passers: Passers): void {
  let drawn = 0
  for (const one of passers.passing) {
    if (drawn++ >= MOST.passers) break

    const weight = HULL_INK * one.weight
    const spot = { facing: one.facing, scale: one.scale, x: one.x, y: one.y }
    const mark = { lane: LANE.passer, shade: one.y, weight }

    if (one.kind === "boat") {
      pen.fill(trace(HULL), mark, spot)
      pen.fill(trace(SCREWS), mark, spot)
    }

    if (one.kind === "submarine") {
      pen.fill(trace(SUBMARINE), mark, spot)
      pen.fill(trace(SUB_SCREW), mark, spot)
    }

    // Sonar: three rings, staggered, going out and losing themselves in the
    // water. One ring would be a bubble.
    if (one.kind === "sonar") {
      for (const stagger of PING_RINGS) {
        const at = ringAt(one.along, stagger)
        if (!at) continue

        pen.line([ring(one.x, one.y, at.reach * one.scale)], {
          alpha: PING_INK * at.weight * one.weight,
          lane: LANE.passer,
          shade: OWN,
          tone: TONE.ink,
          // Thick where it leaves and a hairline by the time it is spent. A
          // front carries what it was sent with, spread over a circle that
          // keeps growing.
          width: Math.max(1, Math.round(4 * at.weight)),
        })
      }
    }
  }

  // The churn a hull leaves: white water, filled rather than outlined, so
  // overlapping puffs merge into one patch instead of piling their alphas into
  // a bright knot wherever three of them meet.
  let churned = 0
  for (const puff of passers.wake) {
    if (churned++ >= MOST.froth) break

    pen.fill([disc(puff.x, puff.y, puff.r)], {
      alpha: Math.min(1, (1 - puff.age) / FROTH_LET_GO),
      lane: LANE.froth,
      shade: puff.y,
      weight: FROTH_INK * (1 - puff.age),
    })
  }
}
