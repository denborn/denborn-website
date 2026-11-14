/**
 * A set of species as a row of bits, one per National Pokédex number
 * (DECISIONS.md 2.1): 151 species take 19 bytes instead of over a thousand
 * characters of names. Bit 0 is number 1. Numbers do not change from one
 * data pack to the next, so a mask means the same species everywhere.
 */
import { fromBase64Url, toBase64Url } from './packing.ts'

export function numbersToMask(numbers: readonly number[]): string {
  const highest = Math.max(0, ...numbers)
  const bytes = new Uint8Array(Math.ceil(highest / 8))
  for (const number of numbers) {
    const bit = number - 1
    bytes[bit >> 3] = (bytes[bit >> 3] ?? 0) | (1 << (bit & 7))
  }
  return toBase64Url(bytes)
}

/** The numbers a mask holds, in order; nothing when the text is not a mask. */
export function maskToNumbers(mask: string): number[] | undefined {
  const bytes = fromBase64Url(mask)
  if (!bytes) return undefined
  const numbers: number[] = []
  bytes.forEach((byte, index) => {
    for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) numbers.push(index * 8 + bit + 1)
  })
  return numbers
}
