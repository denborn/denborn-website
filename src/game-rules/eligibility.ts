/**
 * Which moves a Pokémon may choose from (DECISIONS.md 1.1, "Roster, moves and
 * numbers" and "Campaign rules").
 */
import type { LearnsetEntry } from './learnset.ts'

/** The campaign's move-access ruling. It has no default: the GM chooses. */
export type MoveAccess = 'level-up' | 'level-up-tm-tutor-egg'

export function isEligible(entry: LearnsetEntry, level: number, access: MoveAccess): boolean {
  // Learned on evolution counts as level 0, so it is always within reach.
  if (entry.level !== undefined && entry.level <= level) return true
  return access === 'level-up-tm-tutor-egg' && Boolean(entry.tm ?? entry.tutor ?? entry.egg)
}

/**
 * The moves a Pokémon of this level may pick: its eligible learnset moves, then
 * the campaign's common moves it does not already have.
 */
export function eligibleMoves(
  learnset: readonly LearnsetEntry[],
  level: number,
  access: MoveAccess,
  commonMoves: readonly string[] = [],
): string[] {
  const own = learnset.filter((entry) => isEligible(entry, level, access)).map((entry) => entry.move)
  const seen = new Set(own)
  return [...own, ...commonMoves.filter((move) => !seen.has(move))]
}
