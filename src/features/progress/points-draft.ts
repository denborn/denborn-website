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
import { ATTRIBUTE_CAP, ATTRIBUTE_IDS, type AttributeId, type AttributePoints, attributeScores } from '../../game-rules/attributes.ts'
import { EV_MAX, IV_MAX } from '../../game-rules/budgets.ts'
import { STAT_IDS, type StatId, type StatSpread } from '../../game-rules/stats.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'

export interface PointsDraft {
  ivs: StatSpread
  evs: StatSpread
  /** The six roleplay attributes as the player sees them: one number each, creation's points and the levels' together. */
  scores: AttributePoints
}

export type PointsKind = 'ivs' | 'evs' | 'scores'

/** The draft that places nothing: every total where the sheet has it. */
export function draftOfPoints(character: CharacterDocument): PointsDraft {
  return { ivs: character.ivs, evs: character.evs, scores: attributeScores(character.attributes) }
}

const sum = (points: Readonly<Record<string, number>>): number => Object.values(points).reduce((total, value) => total + value, 0)

/** The points of each kind still to place once the draft's are. */
export function leftAfter(character: CharacterDocument, draft: PointsDraft): Record<PointsKind, number> {
  const left = pointsLeft(character)
  const placed = draftOfPoints(character)
  return { ivs: left.ivs - (sum(draft.ivs) - sum(placed.ivs)), evs: left.evs - (sum(draft.evs) - sum(placed.evs)), scores: left.attributes - (sum(draft.scores) - sum(placed.scores)) }
}

/** The most one stat or attribute takes, whatever is left to place. */
const CAPS: Record<PointsKind, number> = { ivs: IV_MAX, evs: EV_MAX, scores: ATTRIBUTE_CAP }

/** How far one total can go: from what the sheet has, up to its cap or to what the points left allow. */
export function rangeOf(character: CharacterDocument, draft: PointsDraft, kind: PointsKind, id: StatId | AttributeId): { floor: number; ceiling: number; cap: number } {
  const floor = (draftOfPoints(character)[kind] as Readonly<Record<string, number>>)[id] ?? 0
  const now = (draft[kind] as Readonly<Record<string, number>>)[id] ?? floor
  return { floor, cap: CAPS[kind], ceiling: Math.min(CAPS[kind], now + Math.max(0, leftAfter(character, draft)[kind])) }
}

/** The draft with one total set, brought back between its floor and its ceiling. */
export function withPoint(character: CharacterDocument, draft: PointsDraft, kind: PointsKind, id: StatId | AttributeId, value: number): PointsDraft {
  const { floor, ceiling } = rangeOf(character, draft, kind, id)
  return { ...draft, [kind]: { ...draft[kind], [id]: Math.min(ceiling, Math.max(floor, Math.round(value))) } }
}

/** How many points the draft places that the sheet has not. */
export function newPoints(character: CharacterDocument, draft: PointsDraft): number {
  const before = pointsLeft(character)
  const after = leftAfter(character, draft)
  return before.ivs - after.ivs + (before.evs - after.evs) + (before.attributes - after.scores)
}

/** What is asked of the game master's side: where every total then stands. */
export function placementOf(character: CharacterDocument, draft: PointsDraft): Placement {
  const gained = { ...draft.scores }
  for (const attribute of ATTRIBUTE_IDS) gained[attribute] = draft.scores[attribute] - character.attributes.creation[attribute]
  return { ivs: draft.ivs, evs: draft.evs, gained }
}

export { STAT_IDS, ATTRIBUTE_IDS }
