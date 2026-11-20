/**
 * What the game master's browser and a player's say to each other inside a
 * live session (milestone 5). These messages travel as the `body` of the
 * relay's frames (relay.ts); the relay never reads them.
 *
 * The game master's browser is the authority. A player asks to come in with
 * their character; the game master's side checks it, lets the game master
 * answer, and from then on tells every member the state of the party. The
 * character a member is given back is the one that counts: its device keeps
 * that copy (decision 13).
 */
import { z } from 'zod'
import { PARTY_MAX } from '../../game-rules/party.ts'
import { invitation } from '../codec/codes.ts'
import { attributePoints, characterDocument } from '../schema/character.ts'
import { dataId, documentId, statSpread, whole } from '../schema/common.ts'
import { intent, intentRefusal, playerFight } from './battle.ts'

/**
 * 3: a character's progress during a session (milestone 7), and a Bag action
 * that names the Bag it draws from. A device that speaks an older version
 * would not hear what it is asked, so the two are told to update.
 *
 * 4: the messages are the same, but the rules both sides judge a character by
 * are not: its IVs and EVs are counted as TV (decision 286). A device still on
 * the rules before would refuse what the other allows, so it is told to
 * update too.
 *
 * 5: creation shares 265 roleplay points and may keep some for later (decision
 * 307): a character may come with fewer placed, and points placed later may
 * go to creation's layer, which the placement now carries.
 */
export const SESSION_VERSION = 5

/**
 * What a member asks to change of a sheet outside a fight (milestone 7):
 * their own, or a teammate's when an item is used on it. The game master's
 * side decides; the copies that changed come back with the party.
 */
export const sheetChange = z.discriminatedUnion('do', [
  /** Places points a level brought: where every total then stands (decision 8: none is ever lowered). */
  z.object({ do: z.literal('points'), ivs: statSpread(31), evs: statSpread(252), creation: attributePoints, gained: attributePoints }),
  z.object({ do: z.literal('evolve'), to: dataId }),
  /** The Ability and the moves chosen during a rest at a Pokémon Center. */
  z.object({ do: z.literal('reselect'), ability: dataId, moves: z.array(dataId).min(1).max(6) }),
  /** Uses an item on a character of the party; `from` names the downed or dead teammate whose Bag it comes from (decision 175). */
  z.object({ do: z.literal('item'), item: dataId, target: documentId, move: dataId.optional(), from: documentId.optional() }),
  /** Takes items from the Bag of a teammate who is downed or dead. */
  z.object({ do: z.literal('take'), from: documentId, item: dataId, quantity: whole(1, 999) }),
  /** Holds an item of the Bag; with no item, holds nothing. */
  z.object({ do: z.literal('hold'), item: dataId.optional() }),
])

export type SheetChange = z.infer<typeof sheetChange>

/** From a player to the game master. */
export const guestMessage = z.discriminatedUnion('t', [
  /** Asks which campaign is being played, before a character is chosen. */
  z.object({ t: z.literal('hello') }),
  /** Asks to come in with a character, or says "I am back" with the same one. The character travels without its rules: the game master has them. */
  z.object({ t: z.literal('ask'), dataPackVersion: z.string().min(1).max(80), character: characterDocument }),
  /** Leaves the session, or takes a request back. */
  z.object({ t: z.literal('leave') }),
  /**
   * What a member asks for their own Pokémon in the fight. `id` tells this
   * intent from every other the device sent: one that arrives twice is
   * carried out once. `round` is the round it was made for: late, it is not
   * carried out in the next.
   */
  z.object({ t: z.literal('intent'), id: documentId, round: whole(1, 100_000), intent }),
  /** A change asked of a sheet outside a fight. `id` tells it from every other the device sent: one that arrives twice is made once. */
  z.object({ t: z.literal('change'), id: documentId, change: sheetChange }),
])

export type GuestMessage = z.infer<typeof guestMessage>

/** Why a player is not let in. */
export const REFUSALS = [
  /** The two apps do not speak the same version of these messages. */
  'version',
  /** The two apps do not carry the same game data. */
  'other-data',
  /** The character was made for another campaign. */
  'other-campaign',
  /** The character does not pass its campaign's rules. */
  'invalid',
  /** That character is in the session already, from another device; or this device already brought another. */
  'already-in',
  /** The party is full (decision 121). */
  'full',
  /** The game master said no. */
  'declined',
] as const

export type Refusal = (typeof REFUSALS)[number]

const member = z.object({
  character: characterDocument,
  /** Whether its player's device is connected right now. */
  present: z.boolean(),
  /** Whether it is resting at a Pokémon Center: its player may choose its Ability and its moves again, once. */
  resting: z.boolean(),
})

/** The party as every member sees it. */
export const party = z.object({
  /** One more each time the party changes: a member can tell a newer state from an older one. */
  revision: whole(0, 1_000_000_000),
  campaign: z.object({ id: documentId, name: z.string().min(1).max(60) }),
  /** The id of the character of the member this was sent to. */
  you: documentId,
  members: z.array(member).max(PARTY_MAX),
})

export type Party = z.infer<typeof party>

/** What a character is awarded at the end of an encounter (decisions 4, 130 and 134). */
export const rewards = z.object({
  encounter: z.string().min(1).max(60),
  exp: whole(0, 1_000_000),
  money: whole(0, 999_999_999),
  /** The level before and after, when the EXP took the character past one (decision 161). */
  level: z.object({ from: whole(1, 100), to: whole(1, 100) }).optional(),
})

export type Rewards = z.infer<typeof rewards>

/** The most kinds of item one grant gives or takes. */
export const GRANTED_ITEMS_MAX = 50

/** What the game master gave a character, or took from it, by hand (decisions 5 and 170). */
export const granted = z.object({
  exp: whole(0, 1_000_000),
  /** Above 0 when given, below when taken. */
  money: z.number().int().min(-999_999_999).max(999_999_999),
  items: z.array(z.object({ item: dataId, quantity: z.number().int().min(-999).max(999) })).max(GRANTED_ITEMS_MAX),
  /** The level before and after, when the EXP took the character past one. */
  level: z.object({ from: whole(1, 100), to: whole(1, 100) }).optional(),
})

export type Granted = z.infer<typeof granted>

/** Why a change asked of a sheet was not made: a word of the rules, for the screen to put into words. */
export const changeRefusal = z.string().min(1).max(40)

/** From the game master to a player. */
export const hostMessage = z.discriminatedUnion('t', [
  /**
   * The campaign being played, with its rules in force and the game data the
   * game master's app carries: the player chooses among their characters made
   * for it, or makes one there and then (decision 128). The same as a
   * creation link holds.
   */
  z.object({ t: z.literal('about'), invitation }),
  /** The request is in front of the game master. */
  z.object({ t: z.literal('waiting') }),
  z.object({ t: z.literal('refused'), reason: z.enum(REFUSALS) }),
  /**
   * The player is in: the state of the party, sent again whenever it changes,
   * with the fight being played when one is on. A party told without a fight
   * means none is on.
   */
  z.object({ t: z.literal('party'), party, fight: playerFight.optional() }),
  /** The game master took the player out of the session (decision 123). */
  z.object({ t: z.literal('removed') }),
  /** The fight as it now stands, between two changes of the party; nothing once it is over and closed. */
  z.object({ t: z.literal('fight'), fight: playerFight.nullable() }),
  /** What became of an intent: carried out, or why not. */
  z.object({ t: z.literal('intentAnswer'), id: documentId, refused: intentRefusal.optional() }),
  /** An encounter is over: what the member's character was awarded, and the levels it went through. Its copy follows with the party. */
  z.object({ t: z.literal('rewards'), rewards }),
  /** What became of a change asked of a sheet: made, or why not. */
  z.object({ t: z.literal('changeAnswer'), id: documentId, refused: changeRefusal.optional() }),
  /** The game master gave the member's character something, or took something from it. Its copy follows with the party. */
  z.object({ t: z.literal('granted'), granted }),
])

export type HostMessage = z.infer<typeof hostMessage>

/** A message as it travels: its fields and the version of these messages it was made for. */
export function encodeMessage(message: GuestMessage | HostMessage): unknown {
  return { p: SESSION_VERSION, ...message }
}

export type DecodedMessage<T> = { ok: true; message: T } | { ok: false; reason: 'malformed' | 'version' }

function decode<T>(schema: z.ZodType<T>, body: unknown): DecodedMessage<T> {
  if (typeof body !== 'object' || body === null) return { ok: false, reason: 'malformed' }
  if ((body as { p?: unknown }).p !== SESSION_VERSION) return { ok: false, reason: 'version' }
  const message = schema.safeParse(body)
  return message.success ? { ok: true, message: message.data } : { ok: false, reason: 'malformed' }
}

export const decodeGuestMessage = (body: unknown): DecodedMessage<GuestMessage> => decode(guestMessage, body)
export const decodeHostMessage = (body: unknown): DecodedMessage<HostMessage> => decode(hostMessage, body)
