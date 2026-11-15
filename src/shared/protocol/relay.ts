/**
 * What a browser and the relay say to each other (milestone 5).
 *
 * The relay is a switchboard and nothing more. The game master's browser
 * claims a room with a secret and is from then on the room's host; each
 * player's browser joins with a token of its own and is known to the host by
 * a peer id the relay derives from it. The relay passes messages between the
 * host and the players it names, tells each side when the other comes and
 * goes, and keeps no game data: what a message's `body` holds is the app's
 * business (src/shared/protocol/session.ts), and the relay never looks.
 *
 * Every frame is one line of JSON. Both ends check every frame they receive.
 */
import { z } from 'zod'

export const RELAY_VERSION = 1

/** Longest frame, in characters. Far above a party's characters; the battle's own needs are measured in milestone 6. */
export const MAX_FRAME_LENGTH = 256_000

/** Most connections a room holds at once: the host, a party, and those still asking to come in. */
export const ROOM_SOCKETS_MAX = 16

/** Most frames one connection may send in a second before the relay closes it. */
export const FRAMES_PER_SECOND_MAX = 30

/** A room lives a day after its host last connected (decision 122). */
export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000

/** A text that is no frame but starts with this is sent straight back: the system check's way of seeing the relay answer. */
export const PROBE_PREFIX = 'probe:'
export const PROBE_LENGTH_MAX = 1024

/** Why the relay closes a connection, beyond the WebSocket standard's own codes. */
export const CLOSED = {
  /** The secret is not the one the room was claimed with. */
  notHost: 4001,
  /** The same host, or the same player, connected again elsewhere: the newer connection stays. */
  replaced: 4002,
  /** No session has this code. */
  noRoom: 4003,
  /** The host ended the session, or the room's day ran out. */
  ended: 4004,
  /** The frame was made for another version of the relay. */
  version: 4005,
} as const

/** A host's secret or a player's token: random, made by the browser, never shown. */
const secret = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/)

/** How the host names a player: sixteen hex digits the relay derives from the player's token. */
export const peerId = z.string().regex(/^[0-9a-f]{16}$/)

export const clientFrame = z.discriminatedUnion('t', [
  /** Claims the room, or takes it back after the host's connection dropped. */
  z.object({ t: z.literal('host'), secret }),
  /** Comes in as a player, or comes back in as the same one. */
  z.object({ t: z.literal('join'), token: secret }),
  /** From the host: a message for the players named. From a player: a message for the host. */
  z.object({ t: z.literal('send'), to: z.array(peerId).max(ROOM_SOCKETS_MAX).optional(), body: z.unknown() }),
  /** From the host: the session is over and the code stops working. */
  z.object({ t: z.literal('end') }),
])

export type ClientFrame = z.infer<typeof clientFrame>

export const relayFrame = z.discriminatedUnion('t', [
  /** To the host, once the room is theirs: the players connected right now. */
  z.object({ t: z.literal('hosting'), peers: z.array(peerId) }),
  /** To a player: who they are to the host, and whether the host is there. */
  z.object({ t: z.literal('joined'), peer: peerId, host: z.boolean() }),
  /** To the host: a player came or went. */
  z.object({ t: z.literal('peer'), peer: peerId, present: z.boolean() }),
  /** To the players: the host came or went. */
  z.object({ t: z.literal('host'), present: z.boolean() }),
  /** A message passed on. `from` is set on a player's message to the host. */
  z.object({ t: z.literal('msg'), from: peerId.optional(), body: z.unknown() }),
])

export type RelayFrame = z.infer<typeof relayFrame>

/** A frame as it travels: its fields and the relay version it was made for. */
export function encodeFrame(frame: ClientFrame | RelayFrame): string {
  return JSON.stringify({ v: RELAY_VERSION, ...frame })
}

export type Decoded<T> = { ok: true; frame: T } | { ok: false; reason: 'malformed' | 'version' }

function decode<T>(schema: z.ZodType<T>, text: string): Decoded<T> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'malformed' }
  if ((parsed as { v?: unknown }).v !== RELAY_VERSION) return { ok: false, reason: 'version' }
  const frame = schema.safeParse(parsed)
  return frame.success ? { ok: true, frame: frame.data } : { ok: false, reason: 'malformed' }
}

/** Reads a frame a browser sent. */
export const decodeClientFrame = (text: string): Decoded<ClientFrame> => decode(clientFrame, text)

/** Reads a frame the relay sent. */
export const decodeRelayFrame = (text: string): Decoded<RelayFrame> => decode(relayFrame, text)
