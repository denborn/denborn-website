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
import { characterDocument } from '../schema/character.ts'
import { documentId, whole } from '../schema/common.ts'

export const SESSION_VERSION = 1

/** From a player to the game master. */
export const guestMessage = z.discriminatedUnion('t', [
  /** Asks which campaign is being played, before a character is chosen. */
  z.object({ t: z.literal('hello') }),
  /** Asks to come in with a character, or says "I am back" with the same one. The character travels without its rules: the game master has them. */
  z.object({ t: z.literal('ask'), dataPackVersion: z.string().min(1).max(80), character: characterDocument }),
  /** Leaves the session, or takes a request back. */
  z.object({ t: z.literal('leave') }),
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

/** From the game master to a player. */
export const hostMessage = z.discriminatedUnion('t', [
  /** The campaign being played: the player chooses among their characters made for it. */
  z.object({ t: z.literal('about'), campaign: z.object({ id: documentId, name: z.string().min(1).max(60) }) }),
  /** The request is in front of the game master. */
  z.object({ t: z.literal('waiting') }),
  z.object({ t: z.literal('refused'), reason: z.enum(REFUSALS) }),
  /** The player is in: the state of the party, sent again whenever it changes. */
  z.object({ t: z.literal('party'), party }),
  /** The game master took the player out of the session (decision 123). */
  z.object({ t: z.literal('removed') }),
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
