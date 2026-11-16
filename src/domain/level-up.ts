/**
 * The points a level brings, placed by the character's player (spec section
 * 3, decisions 8, 9, 95, 96 and 161): IV and EV points up to the level's
 * budgets, and one roleplay point per level above 1. Points may wait; a point
 * once placed is never taken back.
 */
import type { DataPack } from '../data/types.ts'
import { ATTRIBUTE_IDS, type AttributePoints, checkAttributes, unplacedPoints } from '../game-rules/attributes.ts'
import { checkEvs, checkIvs, evBudget, ivBudget, spreadTotal } from '../game-rules/budgets.ts'
import { STAT_IDS, type StatSpread } from '../game-rules/stats.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import { type Changed, revised } from './changed.ts'
import { maxHpOf } from './character-check.ts'

/** The points a character has not placed yet, of each kind. */
export interface PointsLeft {
  ivs: number
  evs: number
  attributes: number
}

export function pointsLeft(character: CharacterDocument): PointsLeft {
  return {
    ivs: ivBudget(character.level) - spreadTotal(character.ivs),
    evs: evBudget(character.level) - spreadTotal(character.evs),
    attributes: unplacedPoints(character.attributes, character.level),
  }
}

/** Where the character's points stand once the new ones are placed: totals, not what is added. */
export interface Placement {
  ivs: StatSpread
  evs: StatSpread
  /** The roleplay points placed on top of the 300 of creation. */
  gained: AttributePoints
}

export type PlacementProblem =
  /** A dead character places nothing until it is brought back. */
  | 'dead'
  /** A point once placed stays where it is (decision 8). */
  | 'taken-back'
  | 'ivs'
  | 'evs'
  | 'attributes'
  /** Nothing was placed. */
  | 'nothing'

/**
 * The character with its points placed. Its stats follow at once; when its
 * maximum HP rises, its HP rises by as much, as on a level-up (decision 161),
 * and a Pokémon at 0 HP stays there.
 */
export function withPointsPlaced(character: CharacterDocument, placement: Placement, pack: DataPack): Changed<PlacementProblem> {
  if (character.condition.state === 'dead') return { ok: false, problem: 'dead' }
  const lowered =
    STAT_IDS.some((stat) => placement.ivs[stat] < character.ivs[stat] || placement.evs[stat] < character.evs[stat]) ||
    ATTRIBUTE_IDS.some((attribute) => placement.gained[attribute] < character.attributes.gained[attribute])
  if (lowered) return { ok: false, problem: 'taken-back' }
  if (checkIvs(placement.ivs, character.level).length > 0) return { ok: false, problem: 'ivs' }
  if (checkEvs(placement.evs, character.level).length > 0) return { ok: false, problem: 'evs' }
  const attributes = { creation: character.attributes.creation, gained: placement.gained }
  if (checkAttributes(attributes, character.level).length > 0) return { ok: false, problem: 'attributes' }

  const placed = revised(character, { ivs: placement.ivs, evs: placement.evs, attributes })
  const left = pointsLeft(character)
  const now = pointsLeft(placed)
  if (now.ivs === left.ivs && now.evs === left.evs && now.attributes === left.attributes) return { ok: false, problem: 'nothing' }

  const before = maxHpOf(character, pack)
  const after = maxHpOf(placed, pack)
  if (character.hp === 0 || before === undefined || after === undefined) return { ok: true, character: placed }
  return { ok: true, character: { ...placed, hp: Math.min(after, character.hp + (after - before)) } }
}
