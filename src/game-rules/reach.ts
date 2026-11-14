/**
 * Reach on Denborn's two battle lines (DECISIONS.md 1.1, "Lines and reach").
 *
 * Each line is as long as its own team and the two lines are centred on each
 * other: a Pokémon at `position` on a line of `lineLength` sits at
 * `x = position − (lineLength − 1) / 2`. Allies are adjacent when they are
 * neighbours; foes are adjacent when `|x₁ − x₂| ≤ 1`.
 *
 * This module is pure geometry. Whether a Pokémon is standing, downed or dead
 * is the caller's business.
 */

export type LineSide = 'players' | 'enemies'

export interface Spot {
  side: LineSide
  /** 0-based index from the left, as seen at the table. */
  position: number
  /** Number of slots on that side's line, empty slots of dead Pokémon included. */
  lineLength: number
}

/**
 * How a move picks its target, in the engine's vocabulary. Only the kinds where
 * reach matters are listed; every other kind (self, whole side, whole field)
 * has no reach to check.
 */
export type ReachKind =
  | 'normal' // one adjacent Pokémon, friend or foe
  | 'adjacentFoe'
  | 'adjacentAlly'
  | 'adjacentAllyOrSelf'
  | 'any' // anyone but the user
  | 'randomNormal' // a random adjacent foe
  | 'scripted' // the foe that triggered it (Counter, Mirror Coat)
  | 'allAdjacentFoes'
  | 'allAdjacent'

/** Twice the x coordinate, so that every value is an integer. */
function doubledX(spot: Spot): number {
  return 2 * spot.position - (spot.lineLength - 1)
}

/** The x coordinate of a slot; lines of different lengths share the same centre. */
export function xOf(spot: Spot): number {
  return doubledX(spot) / 2
}

export function isSameSpot(a: Spot, b: Spot): boolean {
  return a.side === b.side && a.position === b.position
}

/** Neighbours on the same line, or foes within one step of each other across the lines. */
export function isAdjacent(a: Spot, b: Spot): boolean {
  if (a.side === b.side) return Math.abs(a.position - b.position) === 1
  return Math.abs(doubledX(a) - doubledX(b)) <= 2
}

/** True when the two slots face each other exactly (Imposter copies only such a foe). */
export function isDirectlyOpposite(a: Spot, b: Spot): boolean {
  return a.side !== b.side && doubledX(a) === doubledX(b)
}

/**
 * Whether a move of the given kind, used from `from`, can be aimed at or can
 * hit the slot `to`.
 */
export function canReach(kind: ReachKind, from: Spot, to: Spot): boolean {
  const self = isSameSpot(from, to)
  const foe = from.side !== to.side
  switch (kind) {
    case 'any':
      return !self
    case 'normal':
    case 'allAdjacent':
      return isAdjacent(from, to)
    case 'adjacentFoe':
    case 'randomNormal':
    case 'scripted':
    case 'allAdjacentFoes':
      return foe && isAdjacent(from, to)
    case 'adjacentAlly':
      return !foe && isAdjacent(from, to)
    case 'adjacentAllyOrSelf':
      return self || (!foe && isAdjacent(from, to))
  }
}
