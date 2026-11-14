import { describe, expect, it } from 'vitest'
import { QR_MAX_SIDE, qrSide } from './qr-size'

/** Text of capitals and digits, as a code's QR form is, without repeats a QR code could squeeze. */
function text(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let state = 7
  let out = ''
  for (let index = 0; index < length; index++) {
    state = (state * 48271) % 2147483647
    out += alphabet.charAt(Math.floor(state / 65536) % 32)
  }
  return out
}

describe('the largest QR code shown', () => {
  it('holds a short text in a small code', () => {
    expect(qrSide(text(20))).toBeLessThan(30)
  })

  it('grows with the text, up to 101 squares a side and no further', () => {
    const sides = [200, 600, 1000, 1300].map((length) => qrSide(text(length)) ?? 0)
    expect([...sides].sort((a, b) => a - b)).toEqual(sides)
    expect(Math.max(...sides)).toBeLessThanOrEqual(QR_MAX_SIDE)
  })

  it('gives no code at all for a text that would need a finer one', () => {
    // Find where the limit falls, then check that one character more gets nothing.
    let length = 1000
    while (qrSide(text(length + 1)) !== undefined) length++
    expect(qrSide(text(length))).toBe(QR_MAX_SIDE)
    expect(qrSide(text(length + 1))).toBeUndefined()
    expect(qrSide(text(length + 500))).toBeUndefined()
  })
})
