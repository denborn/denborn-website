/**
 * Levels and EXP (DECISIONS.md 1.1): every Pokémon grows at the games'
 * "Medium Fast" rate. Level 1 is 0 EXP and level n is n³.
 */

export const MIN_LEVEL = 1
export const MAX_LEVEL = 100

/** Total EXP a Pokémon has when it has just reached this level. */
export function expForLevel(level: number): number {
  return level <= MIN_LEVEL ? 0 : level ** 3
}

/** The level a Pokémon with this much EXP is at; it stops at 100. */
export function levelForExp(exp: number): number {
  let level = MIN_LEVEL
  while (level < MAX_LEVEL && expForLevel(level + 1) <= exp) level++
  return level
}
