/**
 * What a device keeps to find its place in a live session again (decision
 * 122): for a game master, the room's code, the secret that makes the room
 * theirs, and who is in the party; for a player, the token that makes them
 * the same player to the game master, and the character they brought.
 *
 * These never leave the device except towards the relay. Like everything in
 * the browser's storage they are a convenience: a device that lost them hosts
 * a new room, or asks to come in again.
 */
import { z } from 'zod'
import { toBase64Url } from '../shared/codec/packing.ts'
import { isValidRoomCode, makeRoomCode } from '../shared/protocol/room-code.ts'
import { documentId } from '../shared/schema/common.ts'
import type { KeyValue } from './library.ts'

const HOSTING = 'denborn/hosting/'
const SEATS = 'denborn/seat/'

/** 32 random bytes written in 43 letters and digits: far too many to guess. */
const SECRET_BYTES = 32
/** The random bytes a room code is made from. */
const ROOM_CODE_BYTES = 5
const secret = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/)

/** A member of the party as the game master's device remembers it: the player's device and the character it brought. */
const member = z.object({ peer: z.string().regex(/^[0-9a-f]{16}$/), character: documentId })
const hosting = z.object({ code: z.string().refine(isValidRoomCode), secret, members: z.array(member).max(32).default([]) })
const seat = z.object({ token: secret, character: documentId.optional() })

/** A game master's hold on a room. */
export type Hosting = z.infer<typeof hosting>
/** A player's place in a room. */
export type Seat = z.infer<typeof seat>

export interface SessionKeys {
  /** The room a campaign is hosted in from this device: the one it had, or a new one. */
  hostingOf(campaignId: string): Hosting
  /** Remembers who is in the party, so that a game master whose page reloads finds everyone again. */
  keepMembers(campaignId: string, members: Hosting['members']): void
  /** Forgets a campaign's room, once its session is ended: the next one gets a new code. */
  forgetHosting(campaignId: string): void
  /** The place a device has in a room: the one it had, or a new one. One place per room, whichever character it brings (decision 119). */
  seatAt(code: string): Seat
  /** Remembers the character brought, or that none is chosen any more. */
  bring(code: string, character: string | undefined): Seat
  /** Forgets a place, once the player is out of the session for good. */
  forgetSeat(code: string): void
}

/** `random` gives that many random bytes: from `crypto.getRandomValues` in a browser. */
export function openSessionKeys(storage: KeyValue, random: (length: number) => Uint8Array): SessionKeys {
  const newSecret = (): string => toBase64Url(random(SECRET_BYTES))

  /** What is kept under a key, when it is still what it should be. */
  function kept<T>(key: string, schema: z.ZodType<T>): T | undefined {
    try {
      const parsed = schema.safeParse(JSON.parse(storage.getItem(key) ?? 'null'))
      return parsed.success ? parsed.data : undefined
    } catch {
      // Not JSON any more, or a storage that refuses to be read: the same as nothing kept.
      return undefined
    }
  }

  /** Keeps a value if the storage lets it. If not, the value still serves for this visit. */
  function keep<T>(key: string, value: T): T {
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {
      // Full or refused: the session works for as long as the page stays open, and a reload starts a new one.
    }
    return value
  }

  const hostingOf = (campaignId: string): Hosting =>
    kept(HOSTING + campaignId, hosting) ?? keep(HOSTING + campaignId, { code: makeRoomCode(random(ROOM_CODE_BYTES)), secret: newSecret(), members: [] })
  const seatAt = (code: string): Seat => kept(SEATS + code, seat) ?? keep(SEATS + code, { token: newSecret() })

  return {
    hostingOf,
    keepMembers: (campaignId, members) => void keep(HOSTING + campaignId, { ...hostingOf(campaignId), members }),
    forgetHosting: (campaignId) => storage.removeItem(HOSTING + campaignId),
    seatAt,
    bring: (code, character) => keep(SEATS + code, { token: seatAt(code).token, ...(character ? { character } : {}) }),
    forgetSeat: (code) => storage.removeItem(SEATS + code),
  }
}
