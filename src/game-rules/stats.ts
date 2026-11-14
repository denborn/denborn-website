/**
 * A Pokémon's six stats from its species, level, points and nature: the
 * games' formula since Generation 3 (DECISIONS.md 1.1, "Roster, moves and
 * numbers").
 *
 * The battle engine works the same numbers out on its own. A test in
 * src/battle proves the two agree, so that a sheet shows what a fight uses.
 */

export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export const STAT_IDS: readonly StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

/** One number per stat: base stats, IVs, EVs or the stats themselves. */
export type StatSpread = Record<StatId, number>

/** The stat a nature raises by a tenth and the one it lowers by a tenth; neither for a neutral nature. */
export interface NatureEffect {
  plus?: StatId
  minus?: StatId
}

export interface StatInput {
  baseStats: StatSpread
  ivs: StatSpread
  evs: StatSpread
  level: number
  nature?: NatureEffect
}

export function computeStats({ baseStats, ivs, evs, level, nature = {} }: StatInput): StatSpread {
  // The part every stat shares, before what makes HP different and before the nature.
  const core = (stat: StatId): number => Math.floor(((2 * baseStats[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100)
  const other = (stat: StatId): number => {
    const value = core(stat) + 5
    // In whole numbers, as the games do: ×1.1 in floating point would be off by one now and then.
    if (nature.plus === stat && nature.minus !== stat) return Math.floor((value * 110) / 100)
    if (nature.minus === stat && nature.plus !== stat) return Math.floor((value * 90) / 100)
    return value
  }
  return {
    hp: core('hp') + level + 10,
    atk: other('atk'),
    def: other('def'),
    spa: other('spa'),
    spd: other('spd'),
    spe: other('spe'),
  }
}
