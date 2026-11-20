/**
 * The points a level brought, as their player is placing them: where each
 * total would stand, before anything is asked of the game master's side.
 * Pure: the screen shows it and sends the placement once the player confirms.
 *
 * A point already placed is the floor of its stat or attribute (decision 8);
 * the level's budgets are the ceilings. A choice that cannot be is brought
 * back within them.
 */
import { type Placement, pointsLeft } from '../../domain/level-up.ts'
import { ATTRIBUTE_CAP, ATTRIBUTE_IDS, type AttributeId, type AttributePoints, attributeScores, placeScores, scoreCeiling } from '../../game-rules/attributes.ts'
import { STAT_IDS, type StatId, type StatSpread } from '../../game-rules/stats.ts'
import { TV_MAX, tvOf, tvPlaced, withTv } from '../../game-rules/training.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'

export interface PointsDraft {
  /** Its TV, as the IVs and EVs it is kept as. */
  ivs: StatSpread
  evs: StatSpread
  /** The six roleplay attributes as the player sees them: one number each, creation's points and the levels' together. */
  scores: AttributePoints
}

/** What a point is placed in: a stat's TV, or a roleplay attribute. */
export type PointTarget = { kind: 'tv'; stat: StatId } | { kind: 'scores'; attribute: AttributeId }

/** The draft that places nothing: every total where the sheet has it. */
export function draftOfPoints(character: CharacterDocument): PointsDraft {
  return { ivs: character.ivs, evs: character.evs, scores: attributeScores(character.attributes) }
}

const sum = (points: Readonly<Record<string, number>>): number => Object.values(points).reduce((total, value) => total + value, 0)

/** The points of each kind still to place once the draft's are. */
export function leftAfter(character: CharacterDocument, draft: PointsDraft): { tv: number; scores: number } {
  const left = pointsLeft(character)
  return { tv: left.tv - (tvPlaced(draft) - tvPlaced(character)), scores: left.attributes - (sum(draft.scores) - sum(attributeScores(character.attributes))) }
}

/** How far one total can go: from what the sheet has, up to its cap or to what the points left allow. */
export function rangeOf(character: CharacterDocument, draft: PointsDraft, target: PointTarget): { floor: number; ceiling: number; cap: number } {
  const left = leftAfter(character, draft)
  if (target.kind === 'tv') {
    const now = tvOf(draft)[target.stat]
    return { floor: tvOf(character)[target.stat], cap: TV_MAX, ceiling: Math.min(TV_MAX, now + Math.max(0, left.tv)) }
  }
  // Creation's kept points raise an attribute no higher than 75, the level's up to 95 (decision 307).
  return { floor: attributeScores(character.attributes)[target.attribute], cap: ATTRIBUTE_CAP, ceiling: scoreCeiling(character.attributes, draft.scores, target.attribute, character.level) }
}

/** The draft with one total set, brought back between its floor and its ceiling. */
export function withPoint(character: CharacterDocument, draft: PointsDraft, target: PointTarget, value: number): PointsDraft {
  const { floor, ceiling } = rangeOf(character, draft, target)
  const within = Math.min(ceiling, Math.max(floor, Math.round(value)))
  if (target.kind === 'scores') return { ...draft, scores: { ...draft.scores, [target.attribute]: within } }
  // Raised from what the sheet has, never lowered from what the draft had: a stat brought back down ends exactly where it was.
  const raised = withTv(character, target.stat, within)
  return { ...draft, ivs: { ...draft.ivs, [target.stat]: raised.ivs[target.stat] }, evs: { ...draft.evs, [target.stat]: raised.evs[target.stat] } }
}

/** How many points the draft places that the sheet has not. */
export function newPoints(character: CharacterDocument, draft: PointsDraft): number {
  const before = pointsLeft(character)
  const after = leftAfter(character, draft)
  return before.tv - after.tv + (before.attributes - after.scores)
}

/** What is asked of the game master's side: where every total then stands, creation's kept points placed before the level's. */
export function placementOf(character: CharacterDocument, draft: PointsDraft): Placement {
  const { creation, gained } = placeScores(character.attributes, draft.scores)
  return { ivs: draft.ivs, evs: draft.evs, creation, gained }
}

export { STAT_IDS, ATTRIBUTE_IDS }
