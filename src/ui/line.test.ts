import { describe, expect, it } from 'vitest'
import { neighbourSlot } from './line'

describe('browsing a line', () => {
  it('moves one Pokémon to the left or to the right', () => {
    expect(neighbourSlot(['standing', 'standing', 'downed'], 1, 1)).toBe(2)
    expect(neighbourSlot(['standing', 'standing', 'downed'], 1, -1)).toBe(0)
  })

  it('stops at both ends of the line', () => {
    expect(neighbourSlot(['standing', 'standing'], 1, 1)).toBeUndefined()
    expect(neighbourSlot(['standing', 'standing'], 0, -1)).toBeUndefined()
  })

  it('steps over the empty slots of dead Pokémon', () => {
    expect(neighbourSlot(['standing', 'gone', 'gone', 'downed'], 0, 1)).toBe(3)
    expect(neighbourSlot(['gone', 'standing', 'standing'], 1, -1)).toBeUndefined()
  })
})
