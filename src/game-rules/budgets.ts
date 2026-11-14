/**
 * How many IV and EV points a Pokémon may place, by level (DECISIONS.md 1.1,
 * "Character creation"). Players place them themselves; nothing is random and
 * nothing is earned in battle. Points may be left unplaced. Enemies follow
 * the same budgets.
 */
import { STAT_IDS, type StatId, type StatSpread } from './stats.ts'

export const IV_MAX = 31
export const EV_MAX = 252

/** IV points to share between the six stats at this level: all 186 (six times 31) at level 100. */
export function ivBudget(level: number): number {
  return Math.floor((186 * level) / 100)
}

/** EV points to share between the six stats at this level: the games' 510 at level 100. */
export function evBudget(level: number): number {
  return Math.floor((510 * level) / 100)
}

export type SpreadProblem =
  | { kind: 'not-whole'; stat: StatId }
  | { kind: 'below-zero'; stat: StatId }
  | { kind: 'above-max'; stat: StatId; max: number }
  | { kind: 'over-budget'; by: number }

export function spreadTotal(spread: StatSpread): number {
  return STAT_IDS.reduce((total, stat) => total + spread[stat], 0)
}

/** Everything wrong with a placement of IVs or EVs; an empty list means it is allowed. */
export function checkSpread(spread: StatSpread, max: number, budget: number): SpreadProblem[] {
  const problems: SpreadProblem[] = []
  for (const stat of STAT_IDS) {
    const value = spread[stat]
    if (!Number.isInteger(value)) problems.push({ kind: 'not-whole', stat })
    else if (value < 0) problems.push({ kind: 'below-zero', stat })
    else if (value > max) problems.push({ kind: 'above-max', stat, max })
  }
  const over = spreadTotal(spread) - budget
  if (over > 0) problems.push({ kind: 'over-budget', by: over })
  return problems
}

export const checkIvs = (ivs: StatSpread, level: number): SpreadProblem[] => checkSpread(ivs, IV_MAX, ivBudget(level))
export const checkEvs = (evs: StatSpread, level: number): SpreadProblem[] => checkSpread(evs, EV_MAX, evBudget(level))
