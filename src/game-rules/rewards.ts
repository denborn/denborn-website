/**
 * What an encounter is worth: the EXP and the Pokédollars the app fills in
 * before the game master awards them (decision 4). The game master may
 * change every amount.
 *
 * EXP is the games' formula since Generation VII, scaled by the two levels:
 * a Pokémon below the enemy's level earns more, one above earns less. Each
 * participant gets it in full (decision 4). The battle engine knows nothing
 * of EXP, so this cannot be checked against it: its shape and multipliers are
 * the documented ones, and where the sources I could read do not agree on
 * the rounding, a fraction is dropped at each step. An amount may therefore
 * be a point or two off the games', which matters little for a default.
 *
 * Pokédollars are the games' trainer formula with the enemy's class in the
 * place of the trainer's class (decisions 133 and 134).
 */
import { MAX_LEVEL } from './exp.ts'

/** A Pokémon that could already evolve at its level and has not: a fifth more, as the games write it (decision 131). */
const NOT_YET_EVOLVED = 4915 / 4096
/** A held Lucky Egg: half as much again. No Lucky Egg can be held yet (decision 140). */
const LUCKY_EGG = 3 / 2

/** An enemy of the encounter, for EXP: its species' base EXP yield and its level. */
export interface Defeated {
  baseExp: number
  level: number
}

/** A character that earns EXP. */
export interface Earner {
  level: number
  /** Its level has reached the one at which it evolves, and it has not evolved. */
  couldEvolve: boolean
  holdsLuckyEgg: boolean
}

/** The EXP one enemy is worth to one character. */
export function expFrom(defeated: Defeated, earner: Earner): number {
  // At the highest level there is nothing left to earn.
  if (earner.level >= MAX_LEVEL) return 0
  const base = Math.floor((defeated.baseExp * defeated.level) / 5)
  const byLevels = ((2 * defeated.level + 10) / (defeated.level + earner.level + 10)) ** 2.5
  let exp = Math.floor(base * byLevels) + 1
  if (earner.holdsLuckyEgg) exp = Math.floor(exp * LUCKY_EGG)
  if (earner.couldEvolve) exp = Math.floor(exp * NOT_YET_EVOLVED)
  return exp
}

/** The EXP every enemy of an encounter is worth to one character, added up. */
export function expFor(enemies: readonly Defeated[], earner: Earner): number {
  return enemies.reduce((total, enemy) => total + expFrom(enemy, earner), 0)
}

/** What a game master calls an enemy, for themselves alone (decision 133), and the base each class pays per level (decision 134). */
export const MOB_CLASS_BASE = { minion: 16, elite: 60, boss: 120 } as const
export type MobClass = keyof typeof MOB_CLASS_BASE
export const MOB_CLASSES = Object.keys(MOB_CLASS_BASE) as MobClass[]

/** The Pokédollars an encounter is worth to each participant: each enemy's level times its class's base, added up. */
export function moneyFor(enemies: readonly { level: number; class: MobClass }[]): number {
  return enemies.reduce((total, enemy) => total + enemy.level * MOB_CLASS_BASE[enemy.class], 0)
}
