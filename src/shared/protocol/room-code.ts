/**
 * Room codes are what players type or scan to reach a live session.
 *
 * A code is 5 random symbols plus 1 check symbol. The Worker verifies the check
 * symbol before it touches a Durable Object, so a mistyped or made-up code never
 * creates an object or spends Durable Object quota.
 *
 * The alphabet leaves out 0/O and 1/I/L, which are easy to confuse on a phone.
 */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 6

const BASE = ROOM_CODE_ALPHABET.length

function checkSymbol(body: string): string | null {
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const value = ROOM_CODE_ALPHABET.indexOf(body.charAt(i))
    if (value < 0) return null
    // Position weights catch single-symbol errors and swaps of neighbours.
    sum = (sum + value * (i + 2)) % BASE
  }
  return ROOM_CODE_ALPHABET.charAt(sum)
}

/** What comes before a join code in a link: the tag of the family of Denborn's codes, in the capitals a QR code packs best. */
const JOIN_TAG = 'DNJ1.'

/** The link that opens the app on the join screen with a session's code filled in (decision 124). */
export function joinLink(code: string, origin: string): string {
  return `${origin}/#${JOIN_TAG}${code}`
}

/**
 * The join code in what a player typed, pasted or scanned: the code alone, or
 * a join link. Nothing when there is no well-formed code in it.
 */
export function joinCodeIn(text: string): string | undefined {
  const trimmed = text.trim()
  const afterHash = trimmed.slice(trimmed.lastIndexOf('#') + 1)
  const code = normalizeRoomCode(afterHash.toUpperCase().startsWith(JOIN_TAG) ? afterHash.slice(JOIN_TAG.length) : afterHash)
  return isValidRoomCode(code) ? code : undefined
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase()
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false
  const body = code.slice(0, -1)
  return checkSymbol(body) === code.slice(-1)
}

/** `randomValues` must hold at least 5 values; pass `crypto.getRandomValues(new Uint8Array(5))`. */
export function makeRoomCode(randomValues: Uint8Array): string {
  let body = ''
  for (let i = 0; i < ROOM_CODE_LENGTH - 1; i++) {
    body += ROOM_CODE_ALPHABET.charAt((randomValues[i] ?? 0) % BASE)
  }
  return body + (checkSymbol(body) ?? '')
}
