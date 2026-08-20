/**
 * The water, as a block of numbers a renderer can read without asking twice.
 *
 * The simulations are CodinCod's own and are taken as they stand; see
 * `LOCAL-CHANGES.md` beside `Seascape.qml`, which says the same of the QML
 * renderer. What this adds is the one thing a native renderer needs and a QML
 * one cannot have: a single typed array holding a frame of geometry, so the
 * boundary between the simulation and the drawing is a memcpy rather than a
 * few thousand property assignments.
 *
 * Nothing here decides how anything looks. It says where the ground is, where
 * the plants stand and which way they are bending, and stops.
 */
import { createBiome } from "../../../codincodv2/assets/js/ornament/biome.ts"
import { createCephalopods } from "../../../codincodv2/assets/js/ornament/cephalopods.ts"
import { createClouds } from "../../../codincodv2/assets/js/ornament/cloud.ts"
import { createCrags } from "../../../codincodv2/assets/js/ornament/crags.ts"
import { createDrift } from "../../../codincodv2/assets/js/ornament/drift.ts"
import { createFlora, type Plant } from "../../../codincodv2/assets/js/ornament/flora.ts"
import { createJellies } from "../../../codincodv2/assets/js/ornament/jellies.ts"
import { createNemos } from "../../../codincodv2/assets/js/ornament/nemos.ts"
import { createPassers } from "../../../codincodv2/assets/js/ornament/passers.ts"
import { thriving } from "../../../codincodv2/assets/js/ornament/plenty.ts"
import { createRays } from "../../../codincodv2/assets/js/ornament/rays.ts"
import { createReef, type Reef } from "../../../codincodv2/assets/js/ornament/reef.ts"
import { createRelics } from "../../../codincodv2/assets/js/ornament/relics.ts"
import { createSeabed, type Seabed } from "../../../codincodv2/assets/js/ornament/seabed.ts"
import { createShoal, daySeed, WILD } from "../../../codincodv2/assets/js/ornament/shoal.ts"
import { createSwarm } from "../../../codincodv2/assets/js/ornament/swarm.ts"
import { createVisitors } from "../../../codincodv2/assets/js/ornament/visitors.ts"
import { createWalkers } from "../../../codincodv2/assets/js/ornament/walkers.ts"
import { paintRays, paintSnow } from "./light.ts"
import {
  paintInklings,
  paintJellies,
  paintNemos,
  paintPassers,
  paintShoal,
  paintSwarm,
  paintVisitors,
  paintWalkers,
} from "./life.ts"
import { Pen } from "./pen.ts"
import { paintCrags, paintHeads, paintRelics, paintStones } from "./rock.ts"
import { paintSky, pretend as askSky } from "./sky.ts"

/** Mirrors of the densities `Seascape.qml` sows the bed at, so both renderers
 *  draw the same water from the same seed. */
const PER_K = {
  anemones: 34,
  cliffs: 5.5,
  corals: 46,
  fans: 19,
  grasses: 124,
  kelps: 24,
  stones: 40,
} as const

/**
 * What this renderer will draw, which is not what the QML one will.
 *
 * The QML caps say what a processor can tessellate every frame. Here the bed
 * goes over once and is bent on the card, so a plant costs a slot in a buffer
 * and nothing per frame, and the ceilings are only high enough that a rich day
 * is drawn rather than clipped.
 *
 * The anemone is the exception and keeps a cap near the QML one, because a
 * crown is walked rather than cut and is still the one plant on the processor.
 */
const MOST = {
  anemones: 200,
  cliffs: 16,
  corals: 500,
  fans: 220,
  grasses: 1400,
  kelps: 280,
  stones: 108,
} as const

const LEAST = 2
const REEF_HEADS = 34
const RANGES = 6

/**
 * A coral's drawing, as numbers.
 *
 * The corals are the one thing in the bed that arrives as SVG, and they are
 * also the one thing that never moves, so each drawing is read once here and
 * handed over as coordinates from then on. Every twig in `flora.ts` is a move
 * and one curve, which is the whole of the grammar this needs.
 */
const carved = new Map<string, number[]>()

function twigOf(d: string): number[] {
  const held = carved.get(d)
  if (held) return held

  const numbers = d.match(/-?\d+(\.\d+)?/g)
  const cut = numbers ? numbers.map(Number) : []
  carved.set(d, cut)
  return cut
}

/** What a plant's kind comes to on the wire. */
const KINDS: Record<string, number> = { anemone: 2, coral: 4, fan: 3, grass: 1, kelp: 0 }

/**
 * How far apart two openings of the same water can be, in seconds. Past this
 * the scene is a scene anybody has seen, so there is nothing to be gained by
 * winding further and a wind is not free.
 */
const CYCLE = 150

/** Sand, a hill and a cliff, on the wire. */
const GROUND = { cliff: 2, hill: 1, mound: 3, sand: 0 } as const

const geometry = new Float32Array(1 << 23)

let flora: ReturnType<typeof createFlora> | null = null
let reef: Reef | null = null
let seabed: Seabed | null = null
let box = { height: 0, width: 0 }

/**
 * How good a year this water is having, and the light the shoal was last told
 * to be the size of.
 */
let thrift = 1
let aimed = -1

/**
 * Everything else in the water, which is everything that will not stand still.
 *
 * Held apart from the bed because the bed goes over the wire once and these go
 * over it every frame; see `over`. All of them are the ornament's, made with
 * the numbers `Seascape.qml` makes them with, so the desktop and the site are
 * the same sea and not two seas with a family resemblance.
 */
let clouds: ReturnType<typeof createClouds> | null = null
let crags: ReturnType<typeof createCrags> | null = null
let drift: ReturnType<typeof createDrift> | null = null
let flock: ReturnType<typeof createSwarm> | null = null
let inklings: ReturnType<typeof createCephalopods> | null = null
let jellies: ReturnType<typeof createJellies> | null = null
let light: ReturnType<typeof createRays> | null = null
let nemos: ReturnType<typeof createNemos> | null = null
let passers: ReturnType<typeof createPassers> | null = null
let rushed = false
let shoal: ReturnType<typeof createShoal> | null = null
let visitors: ReturnType<typeof createVisitors> | null = null
let walkers: ReturnType<typeof createWalkers> | null = null
let wreckage: ReturnType<typeof createRelics> | null = null

/** How many of each the box is worth, and the ceilings on them. */
const FISH = { least: 6, most: 44, night: 0.55, per: 62_000 }
const MOTES = { least: 40, most: 280, per: 12_500 }
const CRAWLERS = { crabs: 11, mostCrabs: 28, mostStarfish: 24, starfish: 9 }
/**
 * How many jellyfish a thousand pixels of water is worth, and the ceiling.
 *
 * Counted through the day the way the plants are, because that is what a bloom
 * is: the same water in the same place with twenty in it one week and two the
 * next. Nothing else in this scene varies like that, and nothing else in the
 * sea does either.
 */
const JELLIES = { most: 16, per: 2.4 }
const SHAFTS = 5
/**
 * How many clouds are over the water.
 *
 * Few, and each of them wide: the sky is one band across the top of the
 * picture and what is wanted there is a moon that dims for a while, not a
 * ceiling. Enough that a body is behind one some of the time and in the clear
 * the rest of it.
 */
const CLOUDS = 4
const VENTS = 3
const SPECKS = 420
const SQUIDS = 2
const OCTOPUSES = 2

/** How long a fish is, and how much of its length it swims in a second. */
const CRUISE = 0.8
const SHORTEST = 52
const LONGEST = 92

/**
 * How far the water is wound on before anybody sees it, in steps of a tenth.
 *
 * Nothing opens on a row of fish abreast on their starting line or on snow that
 * has not yet had time to spread through the water.
 */
const WIND_STEP = 1 / 10

function spread(perThousand: number, most: number, width: number): number {
  return Math.max(LEAST, Math.min(most, Math.round((width * perThousand) / 1000)))
}

/** The same, for anything that grows, which is as thick as the day decided. */
function lush(perThousand: number, most: number, width: number, day: number): number {
  return spread(perThousand * day, most, width)
}

/**
 * Wind the rare things on with everything else, for the still harness.
 *
 * A passer keeps an appointment rather than a stopwatch and a shark is out
 * once in an evening, so a still of a sea taken the way the desktop opens one
 * is a still of empty water. `preview.qml` carries the same switch under the
 * same name, and the two renderers can only be held against each other on a
 * sea that has something in it.
 */
export function rush(on: number): void {
  rushed = on !== 0
}

/**
 * An hour asked for rather than read off the clock; see `sky.ts`.
 *
 * `-1` for daylight hands the sky back to the clock, since the host has
 * numbers rather than nulls to hand over.
 */
export function pretend(daylight: number, dusk: number, march: number, lit: number): void {
  askSky(
    daylight < 0 ? null : { daylight, dusk, lit: Math.abs(lit), march, waxing: lit >= 0 },
  )
}

/**
 * Which sea today is.
 *
 * The local calendar day, stirred, out of the same ornament the fish come from.
 * A day is the unit because both of the obvious ones are wrong for a wallpaper:
 * one fixed seed is the same sea for the rest of the machine's life, and a seed
 * off the clock is a new seabed every time somebody logs in.
 */
export function today(): number {
  return daySeed()
}

export function build(width: number, height: number, seed: number, tolerance: number): void {
  box = { height, width }
  handed.length = 0

  const day = thriving(seed)
  thrift = day
  aimed = daylight
  const water = createBiome()

  seabed = createSeabed({
    cliffs: spread(PER_K.cliffs, MOST.cliffs, width),
    height,
    ranges: RANGES,
    seed,
    stones: spread(PER_K.stones, MOST.stones, width),
    width,
  })

  reef = createReef({
    floor: seabed.floorAt,
    heads: REEF_HEADS,
    height,
    seed,
    tolerance,
    width,
  })

  flora = createFlora({
    about: water.about,
    anemones: lush(PER_K.anemones, MOST.anemones, width, day),
    corals: lush(PER_K.corals, MOST.corals, width, day),
    // The crowns and nothing else. Everything the water only bends is handed
    // over as a shape once and swayed on the card; see `layout`.
    cutting: ["anemone"],
    fans: lush(PER_K.fans, MOST.fans, width, day),
    floor: seabed.floorAt,
    grasses: lush(PER_K.grasses, MOST.grasses, width, day),
    height,
    kelps: lush(PER_K.kelps, MOST.kelps, width, day),
    seed,
    tolerance,
    width,
  })

  walkers = createWalkers({
    about: water.about,
    crabs: lush(CRAWLERS.crabs, CRAWLERS.mostCrabs, width, day),
    floor: seabed.floorAt,
    seed,
    starfish: lush(CRAWLERS.starfish, CRAWLERS.mostStarfish, width, day),
    tolerance,
    width,
  })

  shoal = createShoal({
    count: fishCount(width, height, day),
    cruise: CRUISE,
    height,
    longest: LONGEST,
    seed,
    shortest: SHORTEST,
    species: WILD,
    width,
  })

  inklings = createCephalopods({
    floor: seabed.floorAt,
    height,
    octopuses: OCTOPUSES,
    seed,
    squids: SQUIDS,
    width,
  })

  // The cephalopods, entered from out here rather than from inside their own
  // file, exactly as `Seascape.qml` enters them. An octopus is measured across
  // its arms rather than its head, which is twice the size it is drawn at and
  // is the honest number: what a crab sees coming over a stone is the reach.
  const seen = inklings
  water.enter(() => {
    const about = []
    for (const pus of seen.octopuses) {
      if (pus.lift > 0) {
        about.push({ depth: pus.depth, menace: 0.55, size: pus.size * 2, x: pus.x, y: pus.y })
      }
    }
    for (const squid of seen.squids) {
      about.push({ depth: squid.depth, menace: 0.3, size: squid.size, x: squid.x, y: squid.y })
    }
    return about
  })

  jellies = createJellies({
    count: lush(JELLIES.per, JELLIES.most, width, day),
    floor: seabed.floorAt,
    height,
    seed,
    water,
    width,
  })

  wreckage = createRelics({ floor: seabed.floorAt, height, seed, width })
  passers = createPassers({ eager: rushed, height, seed, width })
  visitors = createVisitors({ eager: rushed, height, seed, water, width })
  flock = createSwarm({ count: SPECKS, eager: rushed, height, seed, water, width })
  nemos = createNemos({ about: water.about, reef, seed })
  crags = createCrags({ floor: seabed.floorAt, height, seed, width })
  drift = createDrift({
    floor: seabed.floorAt,
    height,
    motes: moteCount(width, height),
    seed,
    tolerance,
    vents: VENTS,
    width,
  })
  light = createRays({ count: SHAFTS, height, seed, width })
  clouds = createClouds({ count: CLOUDS, height, seed, width })
}

/**
 * How much the light has to move before the shoal is told a new number. Dawn
 * takes minutes and the count is worked towards over them, so this is only how
 * often the question is asked.
 */
const DAWN_STEP = 0.01

/**
 * How many fish this box is worth at this hour.
 *
 * Fewer at night, because a shoal is a daylight thing: what is out after dark
 * is the animals that were always out after dark.
 */
function fishCount(width: number, height: number, day: number): number {
  const full = Math.max(FISH.least, Math.min(FISH.most, Math.round((width * height) / FISH.per)))
  const hour = FISH.night + (1 - FISH.night) * daylight
  return Math.max(FISH.least, Math.round(full * hour * Math.sqrt(day)))
}

function moteCount(width: number, height: number): number {
  return Math.max(MOTES.least, Math.min(MOTES.most, Math.round((width * height) / MOTES.per)))
}

/** Whatever the water is most frightened of this frame. */
function felt() {
  const above = passers?.startle ?? null
  const among = visitors?.startle ?? null
  if (!above) return among
  if (!among) return above
  return among.force > above.force ? among : above
}

/**
 * Carry the whole water forward by a stretch of time, as cheaply as it can be.
 *
 * Everything that swims has to be swum: where a fish is after a minute is the
 * minute it spent getting there. The bed is the exception, because a plant has
 * no memory: a stretch of time is an addition to its clock and one recut at the
 * end. The passers are the other exception, and for the opposite reason: they
 * keep appointments rather than a stopwatch, and winding them here would spend
 * the day's boat on the two minutes of water that exist to be skipped.
 */
/**
 * Where the water is in its own day when this scene opens, in seconds.
 *
 * The wall clock, wrapped at `CYCLE`, on top of the settling every scene owes
 * itself. Nothing is written down and nothing is read back: a clock is a clock
 * on every machine and after every reboot, so two screens opening together open
 * on the same moment of the same water for free, and a screen that opens an
 * hour later does not open on the same picture. `Seascape.qml` says the same in
 * `opening`.
 *
 * The still harness is the exception, because its whole job is to hand back the
 * same picture twice.
 */
export function open(settle: number): void {
  wind(rushed ? settle : settle + (Math.floor(Date.now() / 1000) % CYCLE))
}

export function wind(seconds: number): void {
  const steps = Math.round(Math.max(0, seconds) / WIND_STEP)

  for (let i = 0; i < steps; i++) {
    // The still harness only, and the one caller allowed to spend a passer:
    // see the note above. A boat crosses once in a day, so a background that
    // wound one here would open on water that had already had its boat.
    if (rushed) passers?.step(WIND_STEP)

    visitors?.step(WIND_STEP)
    flock?.step(WIND_STEP, felt())
    shoal?.step(WIND_STEP, null, felt())
    drift?.step(WIND_STEP)
    light?.step(WIND_STEP)
    clouds?.step(WIND_STEP)
    inklings?.step(WIND_STEP, rushed ? (passers?.startle ?? null) : null)
    jellies?.step(WIND_STEP, felt())
    walkers?.step(WIND_STEP)
    nemos?.step(WIND_STEP)
    wreckage?.step(WIND_STEP)
  }

  flora?.wind(steps * WIND_STEP)
  reef?.wind(steps * WIND_STEP)
}

/**
 * The passers and the visitors go first, so the fish answer the hull and the
 * shark where they are this frame rather than where they were last one.
 * Everything else here is indifferent to the order it is stepped in.
 */
export function step(seconds: number): void {
  passers?.step(seconds)
  visitors?.step(seconds)
  flock?.step(seconds, felt())
  shoal?.step(seconds, null, felt())
  drift?.step(seconds)
  light?.step(seconds)
  clouds?.step(seconds)
  flora?.step(seconds)
  inklings?.step(seconds, passers?.startle ?? null)
  jellies?.step(seconds, felt())
  walkers?.step(seconds)
  reef?.step(seconds)
  nemos?.step(seconds)
  wreckage?.step(seconds)

  held += seconds
  turn = (turn + 1) % 512
}

/**
 * How long the frame has been held, and which frame of grain it is.
 *
 * Both are advanced with the water rather than off a clock of their own, so a
 * covered wallpaper is a frame held still rather than one wandering where
 * nobody can see it, and the grain turns over exactly when the water does.
 */
let held = 0
let turn = 0

/**
 * How far the frame wanders, as a share of the box's short side, and how far it
 * rolls, in radians.
 *
 * Nobody holds a camera still. A picture that does not move at all is a picture
 * on a tripod, and a tripod is the thing this scene is trying not to be. It is
 * meant to be a thing nobody can point at and everybody would miss.
 */
const SWAY_REACH = 0.005
const SWAY_ROLL = 0.0022

/**
 * The water over the bed, and where the camera is holding it.
 *
 * Everything that is cut again every frame: the sky, the light in the water,
 * and everything swimming through it. The bed is not here; it went over once
 * and is bent on the card.
 *
 * ```
 * swayX swayY tilt overscan turn
 * count
 * drawing: form tone weight shade alpha lane width fall fadeTop fadeSpan thin
 *          n (x y)*n
 * ```
 */
export function over(): number {
  at = 0
  const unit = Math.min(box.width, box.height) * SWAY_REACH

  // Two sines an octave and a bit apart on each axis, which is the cheapest
  // thing that does not read as a pendulum: one alone is a frame swinging, and
  // two whose periods do not divide each other never come back to the same
  // place twice in anything like a minute.
  put(unit * (0.62 * Math.sin(held * 0.11) + 0.38 * Math.sin(held * 0.29 + 1.7)))
  put(unit * (0.62 * Math.sin(held * 0.13 + 2.4) + 0.38 * Math.sin(held * 0.23 + 0.6)))
  put(SWAY_ROLL * Math.sin(held * 0.09 + 1.1))

  // How much bigger than its box the scene is drawn, so that a frame which has
  // wandered is never a frame with the wallpaper showing along one edge. The
  // margin covers the roll as well as the wander: a corner is swung by the
  // angle times its distance from the middle, which is further than the middle
  // goes.
  const reach = unit + Math.abs(SWAY_ROLL) * Math.hypot(box.width, box.height) / 2
  put(1 + (2 * reach) / Math.max(1, Math.min(box.width, box.height)))
  put(turn)
  daylightAt = at
  put(daylight)

  const pen = new Pen(geometry, at)
  const sky = paintSky(pen, box, clouds)
  daylight = sky.daylight
  put_at(daylightAt, daylight)

  // The shoal follows the light. Reef fish shelter after dark and the water
  // over the sand thins out, so the count is a share of the day's, and the
  // shoal is told the number rather than made to be it: it works towards it
  // from the edges over the minutes dawn takes anyway, because a fish
  // appearing in the middle of the picture is the one thing the water promises
  // never to do. `Seascape.qml` says the same in `onDaylightChanged`.
  if (shoal && Math.abs(daylight - aimed) > DAWN_STEP) {
    aimed = daylight
    shoal.hold(fishCount(box.width, box.height, thrift))
  }

  if (crags) paintCrags(pen, crags, box)
  if (seabed) paintStones(pen, seabed)
  if (reef) paintHeads(pen, reef)
  if (wreckage) paintRelics(pen, wreckage)
  if (light) paintRays(pen, light, daylight)
  if (drift) paintSnow(pen, drift)
  if (shoal) paintShoal(pen, shoal)
  if (nemos) paintNemos(pen, nemos)
  if (flock) paintSwarm(pen, flock)
  if (inklings) paintInklings(pen, inklings)
  if (jellies) paintJellies(pen, jellies, daylight)
  if (walkers) paintWalkers(pen, walkers)
  if (visitors) paintVisitors(pen, visitors)
  if (passers) paintPassers(pen, passers)

  at = pen.close()
  return at
}

/**
 * How light it is above the water, which the renderer needs as well as the sky.
 *
 * The lit top of the water's own column is a function of it, and that is the
 * card's business rather than this file's, so it goes over with the wander.
 * Written after the sky is drawn, into a slot kept for it, because nothing
 * knows the hour until `sunNow` has been asked.
 */
let daylight = 1
let daylightAt = 0

function put_at(slot: number, value: number): void {
  geometry[slot] = value
}

let at = 0

function put(value: number): void {
  geometry[at++] = value
}

function putPoints(points: readonly { x: number; y: number }[]): void {
  put(points.length)
  for (let i = 0; i < points.length; i++) {
    put(points[i].x)
    put(points[i].y)
  }
}

function putGround(): void {
  if (!seabed) return

  put(GROUND.sand)
  put(1)
  putPoints(seabed.ridge)

  for (const band of seabed.ranges) {
    put(GROUND.hill)
    put(band.depth)
    putPoints(band.ridge)
  }

  if (reef) {
    put(GROUND.mound)
    put(reef.depth)
    putPoints(reef.crest)
  }

  for (const cliff of seabed.cliffs) {
    put(GROUND.cliff)
    put(cliff.depth)
    putPoints(cliff.ridge)
  }
}

/** How many pieces of ground the layout will write. */
function grounds(): number {
  if (!seabed) return 0
  return 1 + seabed.ranges.length + (reef ? 1 : 0) + seabed.cliffs.length
}

function putTwigs(plant: Plant): void {
  put(plant.twigs.length)
  for (let t = 0; t < plant.twigs.length; t++) {
    const twig = plant.twigs[t]
    const cut = twigOf(twig.d)
    put(twig.width)
    put(cut.length)
    for (let n = 0; n < cut.length; n++) put(cut[n])
  }
}

/**
 * The scene as it stands, which is everything that will not change today.
 *
 * The ground, the corals and the shape of every plant the water only bends:
 * where its limbs are rooted, how long each is and how it leans, and the leaves
 * hanging off them. All of it goes over once, and after that a frame is two
 * numbers a plant; see `publish`.
 *
 * ```
 * 3 width height groundCount plantCount
 * ground: kind depth n (x y)*n
 * plant:  kind depth girth scale x y
 *         kelp, grass, fan: limbs (beat give own seat shift slant span steps stem)*n
 *                           leaves (limb seat n (x y)*n)*n
 *         coral:            twigs (width n n*n)*n
 *         anemone:          nothing; it is cut again every frame it moves
 * ```
 */
export function layout(): number {
  at = 0
  if (!flora || !seabed) return 0

  put(3)
  put(box.width)
  put(box.height)
  put(grounds())
  put(flora.plants.length)

  putGround()

  for (let p = 0; p < flora.plants.length; p++) {
    const plant = flora.plants[p]
    put(KINDS[plant.kind] ?? 0)
    put(plant.depth)
    put(plant.girth)
    put(plant.scale)
    put(plant.x)
    put(plant.y)

    if (plant.kind === "coral") {
      putTwigs(plant)
      continue
    }
    if (plant.kind === "anemone") continue

    const frame = flora.madeOf(p)
    if (!frame) {
      put(0)
      put(0)
      continue
    }

    put(frame.limbs.length)
    for (const limb of frame.limbs) {
      put(limb.beat)
      put(limb.give)
      put(limb.own)
      put(limb.seat)
      put(limb.shift)
      put(limb.slant)
      put(limb.span)
      put(limb.steps)
      put(limb.stem)
    }

    put(frame.leaves.length)
    for (const leaf of frame.leaves) {
      put(leaf.limb)
      put(leaf.seat)
      putPoints(leaf.shape)
    }
  }

  return at
}

/** What each anemone was last handed over at, so a still one is not handed
 *  over again. A plant says when it has recut itself, and nothing else does. */
const handed: number[] = []

/**
 * A frame of the water: where every plant's sway has got to.
 *
 * Two numbers a plant, which the renderer bends the standing shape by. The
 * anemone is the exception and it is the reason there is a third number: a
 * crown is a heading that keeps turning rather than a shape with a bend put
 * through it, so where it has turned to is the drawing, and it comes over as
 * points the way it always did.
 *
 * ```
 * plantCount
 * plant: amp own cut-again
 *        and, for an anemone that has cut again, n (x y)*n blades (n (x y)*n)*n
 * ```
 */
export function publish(): number {
  at = 0
  if (!flora) return 0

  put(flora.plants.length)

  for (let p = 0; p < flora.plants.length; p++) {
    const plant = flora.plants[p]
    const swing = flora.swinging[p]
    put(swing ? swing.amp : 0)
    put(swing ? swing.own : 0)

    if (plant.kind !== "anemone" || handed[p] === plant.cut) {
      put(0)
      continue
    }

    handed[p] = plant.cut
    put(1)
    putPoints(plant.points)
    put(plant.blades.length)
    for (let b = 0; b < plant.blades.length; b++) putPoints(plant.blades[b])
  }

  return at
}

// The one export the host reads rather than calls.
export { geometry }
