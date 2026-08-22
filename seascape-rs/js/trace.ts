/**
 * A drawing, walked.
 *
 * The ornament writes its animals and its wreckage as paths, because that is
 * what a browser and Qt both take: a string of moves and curves. This renderer
 * takes triangles, so somewhere between the two the curves have to become
 * points, and here is the cheapest place for it to happen. The alternative is a
 * path parser on the other side of the wire and a string squeezed through an
 * array of floats to reach it.
 *
 * Absolute commands only, and only the four the ornament writes: a move, a
 * line, a cubic and a quadratic, with a close. Nothing here guesses at the rest
 * of SVG. If a drawing ever grows an arc, this will draw it as the chord and
 * somebody will see it.
 */
import type { Point } from "./pen.ts"

/**
 * How fine a curve is cut, in the drawing's own units.
 *
 * A fish is written about forty units long and drawn a few hundred px, so the
 * steps below are counted against how far the curve actually runs rather than
 * fixed: a long sweep down a whale's back and the notch in a tail fin are the
 * same command and want a different number of pieces.
 */
const STEP = 1.2
const MOST = 24

/** What one path came to, kept, since a fish is the same drawing as the fish
 *  beating beside it and there are only so many steps in a beat. */
const walked = new Map<string, Point[][]>()

export function trace(d: string): Point[][] {
  const held = walked.get(d)
  if (held) return held

  const cut = walk(d)
  walked.set(d, cut)
  return cut
}

function walk(d: string): Point[][] {
  const parts: Point[][] = []
  let here: Point[] = []
  let at = { x: 0, y: 0 }
  let start = { x: 0, y: 0 }

  const tokens = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  let read = 0
  const number = () => Number(tokens[read++])

  while (read < tokens.length) {
    const command = tokens[read++]

    if (command === "M" || command === "m") {
      if (here.length > 1) parts.push(here)
      here = []
      at = { x: number(), y: number() }
      start = at
      here.push(at)
      continue
    }

    if (command === "L" || command === "l") {
      at = { x: number(), y: number() }
      here.push(at)
      continue
    }

    if (command === "C" || command === "c") {
      const one = { x: number(), y: number() }
      const two = { x: number(), y: number() }
      const end = { x: number(), y: number() }
      cubic(here, at, one, two, end)
      at = end
      continue
    }

    if (command === "Q" || command === "q") {
      const hold = { x: number(), y: number() }
      const end = { x: number(), y: number() }
      quadratic(here, at, hold, end)
      at = end
      continue
    }

    if (command === "Z" || command === "z") {
      if (here.length > 1) parts.push(here)
      here = []
      at = start
      continue
    }

    // A number where a command was expected is a repeat of the last one, which
    // the ornament does not write. Skipping it is better than reading the rest
    // of the drawing off by one.
  }

  if (here.length > 1) parts.push(here)
  return parts
}

/** How many pieces a curve of this reach is worth cutting into. */
function pieces(reach: number): number {
  return Math.max(2, Math.min(MOST, Math.ceil(reach / STEP)))
}

function cubic(into: Point[], from: Point, one: Point, two: Point, end: Point): void {
  const reach =
    Math.hypot(one.x - from.x, one.y - from.y) +
    Math.hypot(two.x - one.x, two.y - one.y) +
    Math.hypot(end.x - two.x, end.y - two.y)
  const steps = pieces(reach)

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    into.push({
      x: u * u * u * from.x + 3 * u * u * t * one.x + 3 * u * t * t * two.x + t * t * t * end.x,
      y: u * u * u * from.y + 3 * u * u * t * one.y + 3 * u * t * t * two.y + t * t * t * end.y,
    })
  }
}

function quadratic(into: Point[], from: Point, hold: Point, end: Point): void {
  const reach =
    Math.hypot(hold.x - from.x, hold.y - from.y) + Math.hypot(end.x - hold.x, end.y - hold.y)
  const steps = pieces(reach)

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    into.push({
      x: u * u * from.x + 2 * u * t * hold.x + t * t * end.x,
      y: u * u * from.y + 2 * u * t * hold.y + t * t * end.y,
    })
  }
}
