/**
 * Training Value, TV: the one number a player places in each of a Pokémon's
 * stats, where the games have IVs and EVs (decision 286). One TV is worth one
 * IV, or four EVs: the same point of a stat at level 100. A stat takes 0 to
 * 94, the games' 31 IVs and 252 EVs, and a level's TV to share are its IV
 * budget and a quarter of its EV budget.
 *
 * A Pokémon still keeps IVs and EVs, which the battle engine reads; TV is how
 * they are counted and placed. Raised, a stat's TV fills its IVs first, then
 * its EVs four at a time; lowered, it empties its EVs first. Enemies follow
 * the same budget.
 *
 * A Pokémon made before TV keeps the IVs and EVs it has, however they are
 * split: they count for the TV they are worth, and fit the budget since each
 * of the two fitted its own.
 */
import { EV_MAX, IV_MAX, evBudget, ivBudget } from './budgets.ts'
import { STAT_IDS, type StatId, type StatSpread } from './stats.ts'

/** How many EVs one TV is worth. */
const EVS_PER_TV = 4

/** The most TV one stat takes. */
export const TV_MAX = IV_MAX + EV_MAX / EVS_PER_TV

/** What a Pokémon's TV is kept as. */
export interface Training {
  ivs: StatSpread
  evs: StatSpread
}

/** TV to share between the six stats at this level: 313 at level 100. */
export function tvBudget(level: number): number {
  return ivBudget(level) + Math.floor(evBudget(level) / EVS_PER_TV)
}

/** The TV of each stat. EVs short of a fourth count for nothing, as in the games. */
export function tvOf({ ivs, evs }: Training): StatSpread {
  const tv = { ...ivs }
  for (const stat of STAT_IDS) tv[stat] = ivs[stat] + Math.floor(evs[stat] / EVS_PER_TV)
  return tv
}

/** The TV placed in the six stats together. */
export function tvPlaced(training: Training): number {
  const tv = tvOf(training)
  return STAT_IDS.reduce((total, stat) => total + tv[stat], 0)
}

/** The TV still to place at this level; below zero when more is placed than the level allows. */
export function tvLeft(training: Training, level: number): number {
  return tvBudget(level) - tvPlaced(training)
}

/** The highest a stat's TV can go with the other stats as they are. */
export function tvCeiling(training: Training, stat: StatId, level: number): number {
  return Math.min(TV_MAX, tvOf(training)[stat] + Math.max(0, tvLeft(training, level)))
}

/**
 * The training with one stat's TV set, between 0 and 94 whatever is asked.
 * Raising never lowers the stat's IVs or its EVs, and lowering never raises
 * them: a point placed can be told from one taken back.
 */
export function withTv(training: Training, stat: StatId, value: number): Training {
  const target = Math.min(TV_MAX, Math.max(0, Math.round(value)))
  let iv = training.ivs[stat]
  let ev = training.evs[stat]
  let change = target - (iv + Math.floor(ev / EVS_PER_TV))
  if (change > 0) {
    const toIvs = Math.min(change, IV_MAX - iv)
    iv += toIvs
    change -= toIvs
    // EVs short of a fourth may leave less room than four: the last TV then takes what room there is.
    ev = Math.min(EV_MAX, ev + change * EVS_PER_TV)
  } else if (change < 0) {
    const fromEvs = Math.min(-change, Math.floor(ev / EVS_PER_TV))
    ev -= fromEvs * EVS_PER_TV
    iv -= -change - fromEvs
  }
  return { ivs: { ...training.ivs, [stat]: iv }, evs: { ...training.evs, [stat]: ev } }
}

export type TrainingProblem =
  | { kind: 'not-whole' | 'below-zero'; part: keyof Training; stat: StatId }
  | { kind: 'above-max'; part: keyof Training; stat: StatId; max: number }
  | { kind: 'over-budget'; by: number }

const PARTS: readonly { part: keyof Training; max: number }[] = [
  { part: 'ivs', max: IV_MAX },
  { part: 'evs', max: EV_MAX },
]

/** Everything wrong with a Pokémon's training at its level; an empty list means it is allowed. */
export function checkTraining(training: Training, level: number): TrainingProblem[] {
  const problems: TrainingProblem[] = []
  for (const { part, max } of PARTS) {
    for (const stat of STAT_IDS) {
      const value = training[part][stat]
      if (!Number.isInteger(value)) problems.push({ kind: 'not-whole', part, stat })
      else if (value < 0) problems.push({ kind: 'below-zero', part, stat })
      else if (value > max) problems.push({ kind: 'above-max', part, stat, max })
    }
  }
  // Counted only on numbers that can be counted: a part that is not whole has said so already.
  if (problems.length > 0) return problems
  const over = -tvLeft(training, level)
  if (over > 0) problems.push({ kind: 'over-budget', by: over })
  return problems
}
