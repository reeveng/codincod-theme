/**
 * The one thing a renderer is told, and the whole of it.
 *
 * `scene.ts` says where the ground is and how the plants are bending, which is
 * a bed that stands still and is cut once. Everything else in this water moves:
 * a fish is somewhere new, a mote has fallen, a shaft has breathed, and the
 * moon is a different shape tonight than it was last night. All of that is
 * written here, as drawings.
 *
 * A drawing is small on purpose. A shape, a colour to mix it from, how heavy it
 * is, how it gives out, and how far back it stands. There is no fish in this
 * file and no moon either: what a thing is stays in the ornament, and this says
 * only what it looks like.
 */

/** How a drawing is drawn. */
export const FORM = { fill: 0, light: 2, stroke: 1, wash: 3 } as const

/**
 * Which colour it is mixed from.
 *
 * `water` is a weight towards the ink at the height it is drawn at, which is
 * anything in the water lit from where the reader is standing; `shadow` is the
 * same weight towards the surface colour, which is near rock with the light
 * behind it. The rest are the lights, and they are the only colours in this
 * scene that are not the theme's.
 */
export const TONE = { dusk: 4, ink: 6, moon: 3, shadow: 1, sun: 2, surface: 5, water: 0 } as const

/** Read the water at the height the fragment itself is at. */
export const OWN = -1

export interface Mark {
  /** How much of it there is where it starts, before it fades. */
  alpha?: number
  /** Where a fade down the box starts and how far it runs. No span, no fade. */
  fade?: readonly [number, number]
  /** How fast it gives out, whether down the box or out from a middle. */
  fall?: number
  lane: number
  /** The height the water under it is read at, or `OWN`. */
  shade?: number
  /** How much of its height a round light keeps. Under 1 is a streak. */
  thin?: number
  tone?: number
  weight?: number
  /** How wide a line is, or how far a round light reaches. */
  width?: number
}

export type Point = { x: number; y: number }

/**
 * Drawings into the block of numbers the renderer reads.
 *
 * The count goes in first and is written again at the end, because how many
 * there are is not known until the last one is drawn and the renderer has to
 * read it before any of them.
 */
export class Pen {
  private drawn = 0
  private held = 0

  constructor(
    private readonly floats: Float32Array,
    private at: number,
  ) {
    this.held = at
    this.floats[this.at++] = 0
  }

  /** How many numbers were written, once every drawing is in. */
  close(): number {
    this.floats[this.held] = this.drawn
    return this.at
  }

  fill(points: readonly Point[], mark: Mark): void {
    this.head(FORM.fill, mark)
    this.points(points)
  }

  line(points: readonly Point[], mark: Mark): void {
    this.head(FORM.stroke, mark)
    this.points(points)
  }

  /** A round light, which is a middle and a reach rather than a shape. */
  light(x: number, y: number, mark: Mark): void {
    this.head(FORM.light, mark)
    this.put(1)
    this.put(x)
    this.put(y)
  }

  /** A wash over the whole box, which is what a night is. */
  wash(mark: Mark): void {
    this.head(FORM.wash, mark)
    this.put(0)
  }

  private head(form: number, mark: Mark): void {
    this.drawn++
    this.put(form)
    this.put(mark.tone ?? TONE.water)
    this.put(mark.weight ?? 0)
    this.put(mark.shade ?? OWN)
    this.put(mark.alpha ?? 1)
    this.put(mark.lane)
    this.put(mark.width ?? 0)
    this.put(mark.fall ?? 1)
    this.put(mark.fade ? mark.fade[0] : 0)
    this.put(mark.fade ? mark.fade[1] : 0)
    this.put(mark.thin ?? 1)
  }

  private points(points: readonly Point[]): void {
    this.put(points.length)
    for (let i = 0; i < points.length; i++) {
      this.put(points[i].x)
      this.put(points[i].y)
    }
  }

  private put(value: number): void {
    this.floats[this.at++] = value
  }
}
