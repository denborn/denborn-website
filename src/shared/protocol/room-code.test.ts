import { describe, expect, it } from 'vitest'
import { ROOM_CODE_ALPHABET, isValidRoomCode, joinCodeIn, joinLink, makeRoomCode, normalizeRoomCode } from './room-code'

/** Deterministic byte source so failures reproduce. */
function bytes(seed: number): Uint8Array {
  let state = seed
  return Uint8Array.from({ length: 5 }, () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state & 0xff
  })
}

const codes = Array.from({ length: 200 }, (_, seed) => makeRoomCode(bytes(seed + 1)))

describe('room codes', () => {
  it('accepts every code it generates', () => {
    for (const code of codes) expect(isValidRoomCode(code), code).toBe(true)
  })

  it('rejects a code with any single symbol mistyped', () => {
    for (const code of codes) {
      for (let i = 0; i < code.length; i++) {
        for (const symbol of ROOM_CODE_ALPHABET) {
          if (symbol === code[i]) continue
          const typo = code.slice(0, i) + symbol + code.slice(i + 1)
          expect(isValidRoomCode(typo), `${code} -> ${typo}`).toBe(false)
        }
      }
    }
  })

  it('rejects a code with two different neighbouring symbols swapped', () => {
    for (const code of codes) {
      for (let i = 0; i < code.length - 1; i++) {
        const a = code.charAt(i)
        const b = code.charAt(i + 1)
        if (a === b) continue
        const swapped = code.slice(0, i) + b + a + code.slice(i + 2)
        expect(isValidRoomCode(swapped), `${code} -> ${swapped}`).toBe(false)
      }
    }
  })

  it('rejects wrong lengths and symbols outside the alphabet', () => {
    const code = codes[0] ?? ''
    expect(isValidRoomCode(code.slice(1))).toBe(false)
    expect(isValidRoomCode(code + code.charAt(0))).toBe(false)
    expect(isValidRoomCode('O' + code.slice(1))).toBe(false)
    expect(isValidRoomCode('')).toBe(false)
  })

  it('normalizes what a player types before validation', () => {
    const code = codes[0] ?? ''
    expect(normalizeRoomCode(`  ${code.toLowerCase()} `)).toBe(code)
  })
})

describe('a join link', () => {
  const code = makeRoomCode(bytes(7))

  it('gives its code back, as the code alone does, however it was typed', () => {
    expect(joinCodeIn(joinLink(code, 'https://denborn.example'))).toBe(code)
    expect(joinCodeIn(`  ${code.toLowerCase()} `)).toBe(code)
    expect(joinCodeIn(joinLink(code, 'https://denborn.example').toLowerCase())).toBe(code)
  })

  it('holds no code when the code is mistyped or the text is something else', () => {
    const wrong = code.slice(0, -1) + (code.endsWith('2') ? '3' : '2')
    expect(joinCodeIn(wrong)).toBeUndefined()
    expect(joinCodeIn(joinLink(wrong, 'https://denborn.example'))).toBeUndefined()
    expect(joinCodeIn('hello')).toBeUndefined()
    expect(joinCodeIn('')).toBeUndefined()
  })
})
