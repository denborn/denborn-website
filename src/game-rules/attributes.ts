/**
 * The six roleplay attributes (spec section 2; decisions 9, 95 and 96).
 *
 * They belong to the tabletop only: a check is a D100 roll at or below the
 * attribute, and nothing here touches a battle.
 *
 * A character has two layers of points. At creation, 300 are shared between
 * the six attributes, 5 to 75 each, all of them placed. Then one point per
 * level above 1 goes on top: those may raise an attribute as far as 95 and
 * may be kept for later. A character created above level 1 has both layers
 * from the start, exactly as if it had levelled.
 */

export const ATTRIBUTE_IDS = ['strength', 'dexterity', 'endurance', 'perception', 'charisma', 'intelligence'] as const
export type AttributeId = (typeof ATTRIBUTE_IDS)[number]
export type AttributePoints = Record<AttributeId, number>

export const CREATION_POINTS = 300
export const CREATION_MIN = 5
export const CREATION_MAX = 75
/** Decision 9: a roll of 96 to 100 is always a critical failure, so no attribute goes above 95. */
export const ATTRIBUTE_CAP = 95

export interface AttributeSheet {
  /** The 300 points of creation. */
  creation: AttributePoints
  /** Points gained with levels and placed since. */
  gained: AttributePoints
}

/** Points gained with levels: one per level above 1. */
export function gainedPoints(level: number): number {
  return Math.max(0, level - 1)
}

export function attributeScores(sheet: AttributeSheet): AttributePoints {
  const scores = { ...sheet.creation }
  for (const attribute of ATTRIBUTE_IDS) scores[attribute] += sheet.gained[attribute]
  return scores
}

function total(points: AttributePoints): number {
  return ATTRIBUTE_IDS.reduce((sum, attribute) => sum + points[attribute], 0)
}

/** Gained points not placed yet. Negative when more were placed than the level gives. */
export function unplacedPoints(sheet: AttributeSheet, level: number): number {
  return gainedPoints(level) - total(sheet.gained)
}

export type AttributeProblem =
  | { kind: 'not-whole'; attribute: AttributeId }
  | { kind: 'creation-out-of-range'; attribute: AttributeId }
  | { kind: 'creation-total'; total: number }
  | { kind: 'gained-below-zero'; attribute: AttributeId }
  | { kind: 'above-cap'; attribute: AttributeId }
  | { kind: 'too-many-gained'; by: number }

/** Everything wrong with a character's attributes at this level; an empty list means they are allowed. */
export function checkAttributes(sheet: AttributeSheet, level: number): AttributeProblem[] {
  const problems: AttributeProblem[] = []
  for (const attribute of ATTRIBUTE_IDS) {
    const creation = sheet.creation[attribute]
    const gained = sheet.gained[attribute]
    if (!Number.isInteger(creation) || !Number.isInteger(gained)) {
      problems.push({ kind: 'not-whole', attribute })
      continue
    }
    if (creation < CREATION_MIN || creation > CREATION_MAX) problems.push({ kind: 'creation-out-of-range', attribute })
    if (gained < 0) problems.push({ kind: 'gained-below-zero', attribute })
    if (creation + gained > ATTRIBUTE_CAP) problems.push({ kind: 'above-cap', attribute })
  }
  const placed = total(sheet.creation)
  if (placed !== CREATION_POINTS) problems.push({ kind: 'creation-total', total: placed })
  const unplaced = unplacedPoints(sheet, level)
  if (unplaced < 0) problems.push({ kind: 'too-many-gained', by: -unplaced })
  return problems
}
