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

/**
 * A light that gives out the way a shaft of sunlight in water does.
 *
 * `Ornament.fade`, which no single exponent draws: it holds most of its
 * strength for the first half of its length and then goes quickly. Added to a
 * tone rather than named as one, since it says how a thing fades rather than
 * what colour it is.
 */
export const SPENT = 0x200

/** Read the water at the height the fragment itself is at. */
export const OWN = -1

export interface Mark {
  /** How much of it there is where it starts, before it fades. */
  alpha?: number
  /** Where a fade down the box starts and how far it runs. No span, no fade. */
  fade?: readonly [number, number]
  /** How fast it gives out, whether down the box or out from a middle. */
  fall?: number
  /**
   * How far out of focus it is, in pixels of blur.
   *
   * Rock only, and it is the lens rather than the water: what is a hand from
   * the glass is further outside the field than what is a long way behind the
   * subject. Anything with this set is drawn on its own and softened before it
   * is laid in, so drawings meant to be softened together, a mass of rock and
   * what is growing on it, have to be written one after another.
   */
  soft?: number
  /** Whether it ends on the light's own curve rather than on an exponent. */
  spent?: boolean
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
 * Where a unit drawing is stood, since most of what swims is written about the
 * origin and put in the water afterwards.
 *
 * `facing` is a mirror rather than a turn, and it is applied before the turn:
 * the ornament works out the whole angle for an animal that is swimming left,
 * so turning a mirrored drawing again is how every renderer here has got a
 * leftward fish upside down at least once.
 */
export interface Spot {
  facing?: number
  scale?: number
  tilt?: number
  x: number
  y: number
}

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

  fill(parts: readonly (readonly Point[])[], mark: Mark, spot?: Spot): void {
    this.head(FORM.fill, mark)
    this.parts(parts, spot)
  }

  line(parts: readonly (readonly Point[])[], mark: Mark, spot?: Spot): void {
    this.head(FORM.stroke, mark)
    this.parts(parts, spot)
  }

  /** A round light, which is a middle and a reach rather than a shape. */
  light(x: number, y: number, mark: Mark): void {
    this.head(FORM.light, mark)
    this.put(1)
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
    this.put((mark.tone ?? TONE.water) | (mark.spent ? SPENT : 0))
    this.put(mark.weight ?? 0)
    this.put(mark.shade ?? OWN)
    this.put(mark.alpha ?? 1)
    this.put(mark.lane)
    this.put(mark.width ?? 0)
    this.put(mark.fall ?? 1)
    this.put(mark.fade ? mark.fade[0] : 0)
    this.put(mark.fade ? mark.fade[1] : 0)
    this.put(mark.thin ?? 1)
    this.put(mark.soft ?? 0)
  }

  /**
   * Every piece of one drawing, stood where it is seen.
   *
   * Several pieces rather than one, because an animal is not one outline: a
   * fish is a body, a tail swung off its joint and a fin rooted inside the
   * back, and they are meant to overlap. Handed over as one drawing they are
   * filled as one silhouette; handed over as three they would each be painted
   * over the last, and every overlap would show as a seam.
   */
  private parts(parts: readonly (readonly Point[])[], spot?: Spot): void {
    this.put(parts.length)

    const scale = (spot?.scale ?? 1) * (1)
    const mirror = spot?.facing ?? 1
    const turn = spot?.tilt ?? 0
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)

    for (const points of parts) {
      this.put(points.length)
      for (let i = 0; i < points.length; i++) {
        if (!spot) {
          this.put(points[i].x)
          this.put(points[i].y)
          continue
        }
        const x = points[i].x * scale * mirror
        const y = points[i].y * scale
        this.put(spot.x + x * cos - y * sin)
        this.put(spot.y + x * sin + y * cos)
      }
    }
  }

  private put(value: number): void {
    this.floats[this.at++] = value
  }
}
