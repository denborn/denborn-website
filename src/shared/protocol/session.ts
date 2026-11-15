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
import { characterDocument } from '../schema/character.ts'
import { documentId, whole } from '../schema/common.ts'
import { intent, intentRefusal, playerFight } from './battle.ts'

/** 2: the fight (milestone 6). A device that speaks 1 would never be shown one, so the two are told to update. */
export const SESSION_VERSION = 2

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
