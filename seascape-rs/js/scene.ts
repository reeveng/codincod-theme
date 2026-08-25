/**
 * The water, as a block of numbers a renderer can read without asking twice.
 *
 * Everything below this line is CodinCod's. The simulations decide what is in
 * the water, `paint/` says what each of them looks like, and `paint/sea.ts`
 * holds the two together and hands out a frame. This file adds the one thing a
 * host embedding all of that in V8 needs and cannot ask for from inside it: a
 * handful of functions that take numbers and return numbers, standing on one
 * scene, over a block that was allocated before the scene was.
 *
 * Nothing here decides how anything looks. Anything that does belongs in the
 * ornament, where both renderers read it.
 */
import {
  createSea,
  opening,
  type Sea,
  today as todaysSeed,
} from "./.ornament/paint/sea.ts"
import type { Asked } from "./.ornament/paint/sky.ts"

/**
 * The block every frame is written into.
 *
 * Allocated here rather than by the sea, because the host reads its address out
 * of V8 as the bundle finishes loading and borrows it from then on, which is
 * some time before anybody says how wide the screen is. A frame of a full
 * screen is a few hundred thousand numbers, so this is several times over what
 * one has ever come to.
 */
const geometry = new Float32Array(1 << 23)

let sea: Sea | null = null

/**
 * Whether the rare things are wound on with everything else.
 *
 * A passer keeps an appointment rather than a stopwatch and a shark is out once
 * in an evening, so a still taken the way a wallpaper opens one is a still of
 * empty water. `preview.qml` carries the same switch under the same name, and
 * the two renderers can only be held against each other on a sea that has
 * something in it.
 */
let rushed = false

/** An hour asked for rather than read off the clock, or the clock. */
let hour: Asked | null = null

export function rush(on: number): void {
  rushed = on !== 0
}

/**
 * An hour asked for rather than read off the clock; see `paint/sky.ts`.
 *
 * `-1` for daylight hands the sky back to the clock, since the host has numbers
 * rather than nulls to hand over, and the moon's phase arrives signed: how lit
 * it is, negative while it is waning.
 */
export function pretend(daylight: number, dusk: number, march: number, lit: number): void {
  hour = daylight < 0 ? null : { daylight, dusk, lit: Math.abs(lit), march, waxing: lit >= 0 }
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
  return todaysSeed()
}

/**
 * A sea, at this size and from this seed.
 *
 * `wire` because this renderer bends the bed on the card: the ground and the
 * plants go over once through `layout` and after that a frame is two numbers a
 * plant.
 */
export function build(width: number, height: number, seed: number, tolerance: number): void {
  sea = createSea({
    bed: "wire",
    eager: rushed,
    height,
    hour,
    into: geometry,
    seed,
    tolerance,
    width,
  })
}

/**
 * Wind the water on to where it should be by now.
 *
 * The wall clock, on top of the settling every scene owes itself, so two
 * screens opening together open on the same moment of the same water and one
 * opening an hour later does not. The still harness is the exception, because
 * its whole job is to hand back the same picture twice.
 */
export function open(settle: number): void {
  wind(rushed ? settle : opening(settle))
}

export function wind(seconds: number): void {
  sea?.wind(seconds)
}

export function step(seconds: number): void {
  sea?.step(seconds)
}

/** The scene as it stands, which is everything that will not change today. */
export function layout(): number {
  return sea?.layout() ?? 0
}

/** A frame of the water: where every plant's sway has got to. */
export function publish(): number {
  return sea?.publish() ?? 0
}

/** And everything that is not the bed, as drawings. */
export function over(): number {
  return sea?.over() ?? 0
}

// The one export the host reads rather than calls.
export { geometry }
