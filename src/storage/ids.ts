/**
 * Ids for campaigns and characters: 12 random bytes written as 16 characters
 * safe in a link. Short, because a character's id travels in its QR code, and
 * with 96 random bits two will not collide.
 */
import { toBase64Url } from '../shared/codec/packing.ts'

export function newId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(12)))
}
