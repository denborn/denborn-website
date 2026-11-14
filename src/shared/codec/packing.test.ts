import { describe, expect, it } from 'vitest'
import { fromBase32, fromBase64Url, pack, toBase32, toBase64Url, unpack } from './packing'
import { maskToNumbers, numbersToMask } from './species-mask'

describe('packing a value into a short text', () => {
  it('gives the value back, accents and all', () => {
    const value = { name: 'Éclair-2', list: [1, 2, 3], nested: { text: 'Où ça ?' } }
    expect(unpack(pack(value), 10_000)).toEqual(value)
  })

  it('uses only characters that are safe in a link', () => {
    expect(pack({ bytes: Array.from({ length: 300 }, (_, index) => (index * 7) % 256) })).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('writes any bytes and reads them back', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index)
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes)
  })

  it('writes any bytes in capitals and digits, of any length, and reads them back', () => {
    for (let length = 0; length <= 40; length++) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 89 + length * 17) % 256)
      const text = toBase32(bytes)
      expect(text).toMatch(/^[A-Z2-7]*$/)
      expect(fromBase32(text)).toEqual(bytes)
    }
    expect(fromBase32('abc')).toBeUndefined()
  })

  it.each(['not base64 !', 'AAAA', pack({ a: 1 }).slice(0, -4), ''])('gives nothing for a text that is not a packed value: %j', (text) => {
    expect(unpack(text, 10_000)).toBeUndefined()
  })

  it('gives nothing for a value that would inflate past the limit', () => {
    // A long run of the same letter packs very small: the classic way to exhaust memory.
    const bomb = pack('x'.repeat(100_000))
    expect(bomb.length).toBeLessThan(1000)
    expect(unpack(bomb, 10_000)).toBeUndefined()
    expect(unpack(bomb, 200_000)).toBe('x'.repeat(100_000))
  })
})

describe('a set of species as a row of bits', () => {
  it.each([[[]], [[1]], [[8, 9]], [[1, 4, 7, 25, 150, 151]], [[151]]])('gives %j back', (numbers) => {
    expect(maskToNumbers(numbersToMask(numbers))).toEqual(numbers)
  })

  it('takes 19 bytes for all of the first 151, whatever their order', () => {
    const all = Array.from({ length: 151 }, (_, index) => 151 - index)
    const bytes = fromBase64Url(numbersToMask(all))
    expect(bytes?.length).toBe(19)
    expect(maskToNumbers(numbersToMask(all))).toEqual([...all].reverse())
  })

  it('gives nothing for a text that is not a mask', () => {
    expect(maskToNumbers('not a mask!')).toBeUndefined()
  })
})
