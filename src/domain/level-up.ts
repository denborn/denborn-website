/**
 * The points a level brings, placed by the character's player (spec section
 * 3, decisions 8, 9, 95, 96, 161, 286 and 307): TV up to the level's budget,
 * one roleplay point per level above 1, and the points of creation it kept.
 * Points may wait; a point once placed is never taken back.
 */
import type { DataPack } from '../data/types.ts'
import { ATTRIBUTE_IDS, type AttributePoints, checkAttributes, creationLeft, unplacedPoints } from '../game-rules/attributes.ts'
import { STAT_IDS, type StatSpread } from '../game-rules/stats.ts'
import { checkTraining, tvLeft } from '../game-rules/training.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import { type Changed, revised } from './changed.ts'
import { maxHpOf } from './character-check.ts'

/** The points a character has not placed yet, of each kind. */
export interface PointsLeft {
  tv: number
  attributes: number
}

export function pointsLeft(character: CharacterDocument): PointsLeft {
  return {
    tv: tvLeft(character, character.level),
    attributes: unplacedPoints(character.attributes, character.level),
  }
}

/** Where the character's points stand once the new ones are placed: totals, not what is added. */
export interface Placement {
  /** Its TV, as the IVs and EVs it is kept as. */
  ivs: StatSpread
  evs: StatSpread
  /** The roleplay points of creation, those it kept and has placed since among them (decision 307). */
  creation: AttributePoints
  /** The roleplay points placed on top of creation's. */
  gained: AttributePoints
}

export type PlacementProblem =
  /** A dead character places nothing until it is brought back. */
  | 'dead'
  /** A point once placed stays where it is (decision 8). */
  | 'taken-back'
  | 'training'
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
    ATTRIBUTE_IDS.some((attribute) => placement.gained[attribute] < character.attributes.gained[attribute] || placement.creation[attribute] < character.attributes.creation[attribute])
  if (lowered) return { ok: false, problem: 'taken-back' }
  if (checkTraining(placement, character.level).length > 0) return { ok: false, problem: 'training' }
  const attributes = { creation: placement.creation, gained: placement.gained }
  // Creation's layer grows by the points it kept, no more (decision 307).
  const fromCreation = ATTRIBUTE_IDS.reduce((sum, attribute) => sum + placement.creation[attribute] - character.attributes.creation[attribute], 0)
  if (fromCreation > creationLeft(character.attributes) || checkAttributes(attributes, character.level).length > 0) return { ok: false, problem: 'attributes' }

  const placed = revised(character, { ivs: placement.ivs, evs: placement.evs, attributes })
  const left = pointsLeft(character)
  const now = pointsLeft(placed)
  if (now.tv === left.tv && now.attributes === left.attributes) return { ok: false, problem: 'nothing' }

  const before = maxHpOf(character, pack)
  const after = maxHpOf(placed, pack)
  if (character.hp === 0 || before === undefined || after === undefined) return { ok: true, character: placed }
  return { ok: true, character: { ...placed, hp: Math.min(after, character.hp + (after - before)) } }
}
