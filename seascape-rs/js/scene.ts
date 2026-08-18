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
  handed.length = 0

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
    // The crowns and nothing else. Everything the water only bends is handed
    // over as a shape once and swayed on the card; see `layout`.
    cutting: ["anemone"],
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
