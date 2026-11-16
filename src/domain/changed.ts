/**
 * What a change asked of a character gives: the character once changed, or
 * the reason it was not. Every change of a character's sheet after its
 * creation (src/domain: level-up, evolution, rest, items, grants) answers in
 * this form, so that the session can say why a player's request did nothing.
 */
import type { CharacterDocument } from '../shared/schema/character.ts'

export type Changed<Problem extends string> = { ok: true; character: CharacterDocument } | { ok: false; problem: Problem }

/** The same for a change that touches several characters of a party: the whole party, with those it changed. */
export type PartyChanged<Problem extends string> = { ok: true; party: CharacterDocument[] } | { ok: false; problem: Problem }

/** The character with one more revision: two copies of it can be told apart by it. */
export function revised(character: CharacterDocument, changes: Partial<CharacterDocument> = {}): CharacterDocument {
  return { ...character, ...changes, revision: character.revision + 1 }
}
