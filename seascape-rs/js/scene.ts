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
import { createFlora, type Plant } from "../../../codincodv2/assets/js/ornament/flora.ts"
import { createReef, type Reef } from "../../../codincodv2/assets/js/ornament/reef.ts"
import { createSeabed, type Seabed } from "../../../codincodv2/assets/js/ornament/seabed.ts"

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

const MOST = {
  anemones: 92,
  cliffs: 16,
  corals: 108,
  fans: 50,
  grasses: 320,
  kelps: 74,
  stones: 108,
} as const

const LEAST = 2
const REEF_HEADS = 34
const RANGES = 6

/** What a plant's kind comes to on the wire. */
const KINDS: Record<string, number> = { anemone: 2, coral: 4, fan: 3, grass: 1, kelp: 0 }

/** Sand, a hill and a cliff, on the wire. */
const GROUND = { cliff: 2, hill: 1, mound: 3, sand: 0 } as const

const geometry = new Float32Array(1 << 23)

let flora: ReturnType<typeof createFlora> | null = null
let reef: Reef | null = null
let seabed: Seabed | null = null
let box = { height: 0, width: 0 }

function spread(perThousand: number, most: number, width: number): number {
  return Math.max(LEAST, Math.min(most, Math.round((width * perThousand) / 1000)))
}

export function build(width: number, height: number, seed: number, tolerance: number): void {
  box = { height, width }

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
    anemones: spread(PER_K.anemones, MOST.anemones, width),
    corals: spread(PER_K.corals, MOST.corals, width),
    fans: spread(PER_K.fans, MOST.fans, width),
    floor: seabed.floorAt,
    grasses: spread(PER_K.grasses, MOST.grasses, width),
    height,
    kelps: spread(PER_K.kelps, MOST.kelps, width),
    seed,
    tolerance,
    width,
  })
}

export function wind(seconds: number): void {
  flora?.wind(seconds)
}

export function step(seconds: number): void {
  flora?.step(seconds)
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

function putPlant(plant: Plant): void {
  put(KINDS[plant.kind] ?? 0)
  put(plant.depth)
  put(plant.girth)
  put(plant.scale)
  put(plant.x)
  put(plant.y)
  put(plant.cut)
  putPoints(plant.points)
  put(plant.blades.length)
  for (let b = 0; b < plant.blades.length; b++) putPoints(plant.blades[b])
}

/**
 * A frame of the bed, written into `geometry`. Returns how many floats it took.
 *
 * ```
 * version width height groundCount plantCount
 * ground: kind depth n (x y)*n
 * plant:  kind depth girth scale x y cut  n (x y)*n  blades (n (x y)*n)*blades
 * ```
 */
export function publish(): number {
  at = 0
  if (!flora || !seabed) return 0

  put(1)
  put(box.width)
  put(box.height)

  const groundAt = at
  put(0)
  const plantAt = at
  put(0)

  let ground = 0
  put(GROUND.sand)
  put(1)
  putPoints(seabed.ridge)
  ground++

  for (const band of seabed.ranges) {
    put(GROUND.hill)
    put(band.depth)
    putPoints(band.ridge)
    ground++
  }

  if (reef) {
    put(GROUND.mound)
    put(reef.depth)
    putPoints(reef.crest)
    ground++
  }

  for (const cliff of seabed.cliffs) {
    put(GROUND.cliff)
    put(cliff.depth)
    putPoints(cliff.ridge)
    ground++
  }

  for (const plant of flora.plants) putPlant(plant)

  geometry[groundAt] = ground
  geometry[plantAt] = flora.plants.length
  return at
}

// The one export the host reads rather than calls.
export { geometry }
