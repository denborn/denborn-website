import { describe, expect, it } from 'vitest'
import { type AttributePoints, type AttributeSheet, attributeScores, checkAttributes, gainedPoints, unplacedPoints } from './attributes'

const points = (values: Partial<AttributePoints>, rest = 0): AttributePoints => ({
  strength: rest,
  dexterity: rest,
  endurance: rest,
  perception: rest,
  charisma: rest,
  intelligence: rest,
  ...values,
})
/** 300 points, 50 in each attribute. */
const even = points({}, 50)
const sheet = (creation: AttributePoints, gained: Partial<AttributePoints> = {}): AttributeSheet => ({ creation, gained: points(gained) })

describe('roleplay attributes at creation', () => {
  it('accepts 300 points shared between 5 and 75', () => {
    expect(checkAttributes(sheet(even), 1)).toEqual([])
    expect(checkAttributes(sheet(points({ strength: 75, dexterity: 75, endurance: 75, perception: 65, charisma: 5, intelligence: 5 })), 1)).toEqual([])
  })

  it('refuses a total that is not exactly 300', () => {
    expect(checkAttributes(sheet(points({ strength: 49 }, 50)), 1)).toEqual([{ kind: 'creation-total', total: 299 }])
    expect(checkAttributes(sheet(points({ strength: 51 }, 50)), 1)).toEqual([{ kind: 'creation-total', total: 301 }])
  })

  it('refuses an attribute under 5 or over 75', () => {
    const problems = checkAttributes(sheet(points({ strength: 76, dexterity: 4, endurance: 70 }, 50)), 1)
    expect(problems).toEqual([
      { kind: 'creation-out-of-range', attribute: 'strength' },
      { kind: 'creation-out-of-range', attribute: 'dexterity' },
    ])
  })
})

describe('points gained with levels', () => {
  it('are one per level above 1', () => {
    expect([gainedPoints(1), gainedPoints(2), gainedPoints(30), gainedPoints(100)]).toEqual([0, 1, 29, 99])
  })

  it('go on top of the creation points', () => {
    expect(attributeScores(sheet(even, { charisma: 12 })).charisma).toBe(62)
  })

  it('may be kept for later', () => {
    const kept = sheet(even, { strength: 10 })
    expect(checkAttributes(kept, 30)).toEqual([])
    expect(unplacedPoints(kept, 30)).toBe(19)
  })

  it('cannot be more than the level gives', () => {
    expect(checkAttributes(sheet(even, { strength: 10 }), 10)).toEqual([{ kind: 'too-many-gained', by: 1 }])
  })

  it('can take an attribute past 75, as far as 95', () => {
    const high = points({ strength: 75, dexterity: 75, endurance: 75, perception: 65, charisma: 5, intelligence: 5 })
    expect(checkAttributes(sheet(high, { strength: 20 }), 30)).toEqual([])
    expect(checkAttributes(sheet(high, { strength: 21 }), 30)).toEqual([{ kind: 'above-cap', attribute: 'strength' }])
  })

  it('cannot be taken back out of an attribute', () => {
    expect(checkAttributes(sheet(even, { strength: -1 }), 30)).toEqual([{ kind: 'gained-below-zero', attribute: 'strength' }])
  })

  it('give a character created at level 30 the same total as one that levelled there', () => {
    const created = sheet(even, { strength: 29 })
    expect(checkAttributes(created, 30)).toEqual([])
    expect(unplacedPoints(created, 30)).toBe(0)
  })
})
