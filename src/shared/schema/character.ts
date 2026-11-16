/**
 * A character: one Pokémon, as saved in the browser and in its file (spec
 * section 8). It names the campaign and the rules version it was made under,
 * and the data pack it was last saved with. In a file it also carries those
 * rules themselves, so that the file alone is enough to check it.
 */
import { z } from 'zod'
import { type ReadResult, dataId, documentId, itemStack, readDocument, statSpread, whole } from './common.ts'
import { campaignRules } from './rules.ts'

export const CHARACTER_KIND = 'denborn.character'
export const CHARACTER_SCHEMA_VERSION = 1

export const attributePoints = z.object({
  strength: whole(0, 95),
  dexterity: whole(0, 95),
  endurance: whole(0, 95),
  perception: whole(0, 95),
  charisma: whole(0, 95),
  intelligence: whole(0, 95),
})

const moveSlot = z.object({
  id: dataId,
  /** PP Ups spent on the move, 0 to 3; lost when the move is swapped out. */
  ppUps: whole(0, 3),
  /** PP left. They only go down in battle. */
  pp: whole(0, 99),
})

export type MoveSlot = z.infer<typeof moveSlot>

/** Standing, downed with its Agony stacks frozen until revived or rested, or dead until a revival item is used on it (decision 171). */
const condition = z.discriminatedUnion('state', [
  z.object({ state: z.literal('standing') }),
  z.object({ state: z.literal('downed'), stacks: whole(1, 3) }),
  z.object({ state: z.literal('dead') }),
])

export const characterDocument = z.object({
  kind: z.literal(CHARACTER_KIND),
  schemaVersion: z.literal(CHARACTER_SCHEMA_VERSION),
  id: documentId,
  /** One more at every accepted change, so that two copies can be told apart. */
  revision: whole(0, 1_000_000_000),
  dataPackVersion: z.string().min(1).max(80),
  campaign: z.object({ id: documentId, name: z.string().max(60), rulesVersion: whole(1, 9999) }),
  /** The rules the character was made under. Present in a file; a code or a QR only names them. */
  rules: campaignRules.optional(),

  species: dataId,
  nickname: z.string().min(1).max(100),
  gender: z.enum(['M', 'F', 'N']),
  level: whole(1, 100),
  exp: whole(0, 1_000_000),
  /** Absent when the campaign makes every Pokémon neutral. */
  nature: dataId.optional(),
  ability: dataId,

  /** The roleplay attributes: the 300 points of creation, and the points gained with levels and placed since. */
  attributes: z.object({ creation: attributePoints, gained: attributePoints }),
  ivs: statSpread(31),
  evs: statSpread(252),
  moves: z.array(moveSlot).min(1).max(6),

  /** One item, taken out of the bag while it is held. */
  heldItem: dataId.optional(),
  bag: z.array(itemStack).max(500),
  money: whole(0, 999_999_999),

  hp: whole(0, 999),
  status: z.enum(['psn', 'tox', 'brn', 'par', 'slp', 'frz']).optional(),
  condition,
})

export type CharacterDocument = z.infer<typeof characterDocument>

export function readCharacter(input: unknown): ReadResult<CharacterDocument> {
  return readDocument(characterDocument, CHARACTER_KIND, CHARACTER_SCHEMA_VERSION, input)
}
