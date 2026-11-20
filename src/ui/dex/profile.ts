/**
 * The profile graph of the Pokédex's top screen (decision 288), in numbers: a
 * shape with one corner a stat, each as far from the middle as the stat is up
 * its scale. Pure: the component draws the points this gives.
 */

/** A point of the graph, from its middle: across to the right and down, as shares of the graph's radius. */
export interface ProfilePoint {
  x: number
  y: number
}

/** The least share a corner is drawn at: a stat of nothing still leaves a small shape, not a dot. */
const SMALLEST = 0.04

/** Where corner `corner` of `corners` is when its stat is `share` of the way up the scale: the first is at the top, the rest follow clockwise, and 1 is the rim. */
export function cornerPoint(corner: number, corners: number, share: number): ProfilePoint {
  const angle = (corner / corners) * 2 * Math.PI
  return { x: Math.sin(angle) * share, y: -Math.cos(angle) * share }
}

/** The points of a shape, corner after corner, for stats given as shares of the scale. No corner is nearer the middle than a small share, nor past the rim. */
export function shapePoints(shares: readonly number[]): ProfilePoint[] {
  return shares.map((share, corner) => cornerPoint(corner, shares.length, Math.max(SMALLEST, Math.min(1, share))))
}

/** A shape's points as an SVG polygon's, in a square `2 × radius` wide with the graph's middle at its middle. */
export function polygonOf(points: readonly ProfilePoint[], radius: number): string {
  return points.map((point) => `${(radius + point.x * radius).toFixed(2)},${(radius + point.y * radius).toFixed(2)}`).join(' ')
}
