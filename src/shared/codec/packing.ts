/**
 * How a value becomes a short text and back: JSON, compressed with deflate,
 * written in the 64 characters that are safe in a URL (DECISIONS.md 2.1).
 *
 * Reading is the dangerous way: the text comes from a link, a QR code or a
 * paste. Its length is bounded before anything is done, and what it inflates
 * to is bounded too, so a crafted code cannot make the app use unbounded
 * memory.
 */
import { deflateSync, inflateSync } from 'fflate'

const ALPHABET = /^[A-Za-z0-9_-]*$/

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Nothing when the text is not base64url. */
export function fromBase64Url(text: string): Uint8Array | undefined {
  if (!ALPHABET.test(text) || text.length % 4 === 1) return undefined
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * The same bytes in capitals and digits only (base 32). A QR code stores such
 * text far more densely than mixed case, so a code's QR form uses it.
 */
export function toBase32(bytes: Uint8Array): string {
  let text = ''
  let bits = 0
  let held = 0
  for (const byte of bytes) {
    held = (held << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      text += BASE32.charAt((held >>> bits) & 31)
    }
    held &= (1 << bits) - 1
  }
  if (bits > 0) text += BASE32.charAt((held << (5 - bits)) & 31)
  return text
}

/** Nothing when the text is not base 32. */
export function fromBase32(text: string): Uint8Array | undefined {
  const bytes = new Uint8Array(Math.floor((text.length * 5) / 8))
  let bits = 0
  let held = 0
  let at = 0
  for (const character of text) {
    const value = BASE32.indexOf(character)
    if (value < 0) return undefined
    held = (held << 5) | value
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes[at++] = (held >>> bits) & 255
      held &= (1 << bits) - 1
    }
  }
  return bytes
}

export function pack(value: unknown): string {
  return toBase64Url(deflateSync(new TextEncoder().encode(JSON.stringify(value)), { level: 9 }))
}

/**
 * The value packed bytes hold, or nothing when they are not a packed value,
 * were damaged, or would inflate past `maxBytes`.
 */
export function unpackBytes(compressed: Uint8Array | undefined, maxBytes: number): unknown {
  if (!compressed) return undefined
  try {
    // One byte more than allowed: fflate fills the buffer and stops, so a full buffer means "too large".
    const inflated = inflateSync(compressed, { out: new Uint8Array(maxBytes + 1) })
    if (inflated.length > maxBytes) return undefined
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(inflated)) as unknown
  } catch {
    // Not deflate, cut short, not UTF-8 or not JSON: all the same to the caller, who reports a damaged code.
    return undefined
  }
}

/** The value a packed text holds, with the same limits. */
export function unpack(text: string, maxBytes: number): unknown {
  return unpackBytes(fromBase64Url(text), maxBytes)
}
