/**
 * What a device keeps to find its place in a live session again (decision
 * 122): for a game master, the room's code and the secret that makes the
 * room theirs; for a player, the token that makes them the same player to
 * the game master, and the character they brought.
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
const secret = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/)

const hosting = z.object({ code: z.string().refine(isValidRoomCode), secret })
const seat = z.object({ token: secret, character: documentId })

/** A game master's hold on a room. */
export type Hosting = z.infer<typeof hosting>
/** A player's place in a room. */
export type Seat = z.infer<typeof seat>

export interface SessionKeys {
  /** The room a campaign is hosted in from this device: the one it had, or a new one. */
  hostingOf(campaignId: string): Hosting
  /** Forgets a campaign's room, once its session is ended: the next one gets a new code. */
  forgetHosting(campaignId: string): void
  /** The place a device has in a room, if it has one. */
  seatAt(code: string): Seat | undefined
  /** The place a device takes in a room with a character: the one it had with that character, or a new one. */
  takeSeat(code: string, character: string): Seat
  /** Forgets a place, once the player is out of the session for good. */
  forgetSeat(code: string): void
}

/** `random` fills an array with random bytes: `crypto.getRandomValues` in a browser. */
export function openSessionKeys(storage: KeyValue, random: (bytes: Uint8Array) => Uint8Array): SessionKeys {
  const newSecret = (): string => toBase64Url(random(new Uint8Array(SECRET_BYTES)))

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

  return {
    hostingOf: (campaignId) => kept(HOSTING + campaignId, hosting) ?? keep(HOSTING + campaignId, { code: makeRoomCode(random(new Uint8Array(5))), secret: newSecret() }),
    forgetHosting: (campaignId) => storage.removeItem(HOSTING + campaignId),
    seatAt: (code) => kept(SEATS + code, seat),
    takeSeat: (code, character) => {
      const before = kept(SEATS + code, seat)
      // Another character is another player to the game master: one character per device (decision 119).
      return before?.character === character ? before : keep(SEATS + code, { token: newSecret(), character })
    },
    forgetSeat: (code) => storage.removeItem(SEATS + code),
  }
}
