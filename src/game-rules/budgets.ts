/**
 * How many of the games' IVs and EVs a Pokémon may have, by level
 * (DECISIONS.md 1.1, "Character creation"). Nothing is random and nothing is
 * earned in battle. A player places neither by name: both are counted and
 * placed as Training Value (training.ts, decision 286), whose budget is made
 * of these two.
 */

export const IV_MAX = 31
export const EV_MAX = 252

/** IVs to share between the six stats at this level: all 186 (six times 31) at level 100. */
export function ivBudget(level: number): number {
  return Math.floor((186 * level) / 100)
}

/** EVs to share between the six stats at this level: the games' 510 at level 100. */
export function evBudget(level: number): number {
  return Math.floor((510 * level) / 100)
}
