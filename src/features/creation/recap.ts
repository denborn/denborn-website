/**
 * What the top screen of creation shows (decision 288): the character as far
 * as it is made. Only what the player has chosen is there; the rest is not
 * known yet, and the screen says so. Pure: the screen draws what this gives.
 */
import type { DataPack, Gender, NatureData, SpeciesData } from '../../data/types.ts'
import type { AttributePoints } from '../../game-rules/attributes.ts'
import { expForLevel } from '../../game-rules/exp.ts'
import { type NatureEffect, STAT_IDS, type StatSpread, computeStats } from '../../game-rules/stats.ts'
import { tvOf } from '../../game-rules/training.ts'
import type { Invitation } from '../../shared/codec/codes.ts'
import { STEPS } from './draft.ts'
import type { Flow } from './flow.ts'

/** The top of the profile graph's scale: the highest base stat the games have. */
export const PROFILE_TOP = 255

export interface Recap {
  /** The campaign's name. */
  campaign: string | undefined
  /** The level characters of the campaign start at, and the EXP that goes with it. */
  level: number | undefined
  exp: number | undefined
  species: SpeciesData | undefined
  /** Its name, as typed; its species' name is shown until it has one. */
  nickname: string
  gender: Gender | undefined
  ability: string | undefined
  /** Nothing where the campaign makes every Pokémon neutral, or none is chosen yet. */
  nature: NatureData | undefined
  /** The campaign makes every Pokémon neutral: there is no nature to wait for. */
  neutral: boolean
  /** Once an item pack is chosen: the item held of it, if any. */
  held: { item: string | undefined } | undefined
  /** The six roleplay attributes, once the player has been to their step. */
  attributes: AttributePoints | undefined
  /** With a species: its base stats, what TV and its nature make of them on the same scale, and its stats at its level. */
  profile: { base: StatSpread; trained: StatSpread; stats: StatSpread } | undefined
}

/**
 * What TV and a nature make of base stats, as base stats: the profile graph's
 * second shape. A TV is worth half a point of a base stat in the games'
 * formula (twice the base stat, plus the IVs, plus a quarter of the EVs), and
 * a nature a tenth of the stat. No further than the top of the scale.
 */
export function trainedProfile(baseStats: StatSpread, tv: StatSpread, nature: NatureEffect = {}): StatSpread {
  const trained = { ...baseStats }
  for (const stat of STAT_IDS) {
    const raised = nature.plus === stat && nature.minus !== stat
    const lowered = nature.minus === stat && nature.plus !== stat
    trained[stat] = Math.min(PROFILE_TOP, (baseStats[stat] + tv[stat] / 2) * (raised ? 1.1 : lowered ? 0.9 : 1))
  }
  return trained
}

export function recapOf(flow: Flow, invitation: Invitation | undefined, pack: DataPack): Recap {
  const { draft } = flow
  const rules = invitation?.rules
  const level = rules?.startingLevel
  const species = draft.species && rules ? pack.species[draft.species] : undefined
  const nature = rules?.natures === 'chosen' && draft.nature ? pack.natures[draft.nature] : undefined
  const been = (step: (typeof STEPS)[number]): boolean => STEPS.indexOf(flow.reached) >= STEPS.indexOf(step)
  return {
    campaign: invitation?.campaign.name,
    level,
    exp: level === undefined ? undefined : expForLevel(level),
    species,
    nickname: draft.nickname,
    gender: species ? draft.gender : undefined,
    ability: species ? draft.ability : undefined,
    nature,
    neutral: rules?.natures === 'neutral',
    held: rules && draft.pack !== undefined ? { item: draft.heldItem } : undefined,
    attributes: rules && been('identity') ? draft.attributes : undefined,
    profile:
      species && level !== undefined
        ? {
            base: species.baseStats,
            trained: trainedProfile(species.baseStats, tvOf(draft), nature ?? {}),
            stats: computeStats({ baseStats: species.baseStats, ivs: draft.ivs, evs: draft.evs, level, nature: nature ?? {} }),
          }
        : undefined,
  }
}
