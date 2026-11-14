/**
 * The numbers a character sheet shows that the character does not store:
 * its stats, its maximum HP and PP, how far it is into its level, and the
 * points it still has to place. Worked out from the same rules the checks
 * and the battle use.
 */
import type { DataPack } from '../data/types.ts'
import { type AttributePoints, attributeScores, unplacedPoints } from '../game-rules/attributes.ts'
import { evBudget, ivBudget, spreadTotal } from '../game-rules/budgets.ts'
import { MAX_LEVEL, expForLevel } from '../game-rules/exp.ts'
import { maxPp } from '../game-rules/pp.ts'
import { type StatSpread, computeStats } from '../game-rules/stats.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'

export interface SheetNumbers {
  /** The six stats at its level, with its points and its nature. `hp` is its maximum HP. */
  stats: StatSpread
  /** The roleplay attributes as one number each. */
  attributes: AttributePoints
  /** Maximum PP of each of its moves, by move id. */
  maxPp: Record<string, number>
  exp: {
    /** EXP at which the next level begins; nothing at the highest level. */
    next: number | undefined
    /** Share of the way from the start of its level to the next, from 0 to 1. */
    progress: number
  }
  /** Points it may still place. */
  unplaced: { attributes: number; ivs: number; evs: number }
}

/** Nothing when the character names a species or a nature this app's data does not have. */
export function sheetNumbers(character: CharacterDocument, pack: DataPack): SheetNumbers | undefined {
  const species = pack.species[character.species]
  const nature = character.nature === undefined ? {} : pack.natures[character.nature]
  if (!species || !nature) return undefined
  const level = character.level
  const start = expForLevel(level)
  const next = level < MAX_LEVEL ? expForLevel(level + 1) : undefined
  return {
    stats: computeStats({ baseStats: species.baseStats, ivs: character.ivs, evs: character.evs, level, nature }),
    attributes: attributeScores(character.attributes),
    maxPp: Object.fromEntries(
      character.moves.map((slot) => {
        const move = pack.moves[slot.id]
        return [slot.id, move ? maxPp(move.pp, slot.ppUps, move.fixedPp) : slot.pp]
      }),
    ),
    exp: { next, progress: next === undefined ? 1 : Math.min(1, Math.max(0, (character.exp - start) / (next - start))) },
    unplaced: {
      attributes: Math.max(0, unplacedPoints(character.attributes, level)),
      ivs: Math.max(0, ivBudget(level) - spreadTotal(character.ivs)),
      evs: Math.max(0, evBudget(level) - spreadTotal(character.evs)),
    },
  }
}
