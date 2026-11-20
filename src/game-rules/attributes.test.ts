import { describe, expect, it } from 'vitest'
import {
  type AttributePoints,
  type AttributeSheet,
  CREATION_POINTS,
  attributeScores,
  attributeTally,
  checkAttributes,
  creationLeft,
  gainedPoints,
  placeScores,
  scoreCeiling,
  splitAttributes,
  unplacedPoints,
} from './attributes'

const points = (values: Partial<AttributePoints>, rest = 0): AttributePoints => ({
  strength: rest,
  dexterity: rest,
  endurance: rest,
  perception: rest,
  charisma: rest,
  intelligence: rest,
  ...values,
})
/** 300 points, 50 in each attribute: a character made before decision 307. */
const even = points({}, 50)
/** All 265 points of creation placed: 45 in strength, 44 in each of the others. */
const full = points({ strength: 45 }, 44)
/** 180 of the 265 placed, 30 each: 85 kept for later. */
const kept = points({}, 30)
const sheet = (creation: AttributePoints, gained: Partial<AttributePoints> = {}): AttributeSheet => ({ creation, gained: points(gained) })

describe('roleplay attributes at creation', () => {
  it('accepts the 265 points shared between 5 and 75', () => {
    expect(total(full)).toBe(CREATION_POINTS)
    expect(checkAttributes(sheet(full), 1)).toEqual([])
    expect(checkAttributes(sheet(points({ strength: 75, dexterity: 75, endurance: 75, perception: 30, charisma: 5, intelligence: 5 })), 1)).toEqual([])
  })

  it('lets some of the 265 wait, counted with the points to place (decision 307)', () => {
    expect(checkAttributes(sheet(kept), 1)).toEqual([])
    expect(creationLeft(sheet(kept))).toBe(CREATION_POINTS - total(kept))
    expect(unplacedPoints(sheet(kept), 5)).toBe(CREATION_POINTS - total(kept) + 4)
  })

  it('keeps a character made with 300 as it was, with nothing of creation left to place', () => {
    expect(checkAttributes(sheet(even), 1)).toEqual([])
    expect(unplacedPoints(sheet(even), 1)).toBe(0)
  })

  it('refuses more than the 300 a character made before could have', () => {
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

describe('attributes given as one number each', () => {
  it('leave points of the 265 to place, which may wait', () => {
    expect(attributeTally(full, 1)).toEqual({ toPlace: 0, extraUsed: 0, extraLeft: 0 })
    expect(attributeTally(kept, 1)).toEqual({ toPlace: CREATION_POINTS - total(kept), extraUsed: 0, extraLeft: 0 })
  })

  it('use extra points for what goes over 265', () => {
    const over = { ...full, strength: full.strength + 10 }
    expect(attributeTally(over, 30)).toEqual({ toPlace: 0, extraUsed: 10, extraLeft: 19 })
    expect(attributeTally(over, 5).extraLeft).toBe(-6)
  })

  it('count what an attribute has above 75 as extra, even while some of the 265 remain to place', () => {
    // 95 in one attribute: 75 from the 265 and 20 extra. The other five hold 150, so 40 of the 265 are still to place.
    expect(attributeTally(points({ strength: 95 }, 30), 30)).toEqual({ toPlace: 40, extraUsed: 20, extraLeft: 9 })
  })

  it.each([
    ['all placed', full, 1],
    ['some kept for later', kept, 1],
    ['uneven, at the limits', points({ strength: 75, dexterity: 75, endurance: 75, perception: 30, charisma: 5, intelligence: 5 }), 1],
    ['extra points spread around', { ...full, strength: 60, charisma: 55 }, 30],
    ['one attribute at the cap', points({ strength: 95 }, 39), 30],
    ['every extra point of level 100 used', points({ strength: 95, dexterity: 95, endurance: 75 }, 33), 100],
  ])('split into two layers that the rules accept: %s', (_, scores, level) => {
    const tally = attributeTally(scores, level)
    expect(tally.extraLeft).toBeGreaterThanOrEqual(0)
    const split = splitAttributes(scores)
    expect(checkAttributes(split, level)).toEqual([])
    expect(attributeScores(split)).toEqual(scores)
    expect(unplacedPoints(split, level)).toBe(tally.toPlace + tally.extraLeft)
  })
})

describe('points placed after creation (decision 307)', () => {
  it('take creation’s kept points first, up to 75, then the level’s', () => {
    const placed = placeScores(sheet(kept), { ...kept, strength: 80 })
    expect(placed.creation.strength).toBe(75)
    expect(placed.gained.strength).toBe(5)
    expect(checkAttributes(placed, 10)).toEqual([])
    expect(checkAttributes(placed, 5)).toEqual([{ kind: 'too-many-gained', by: 1 }])
  })

  it('stop at 75 with creation’s points alone, and go past it with the level’s', () => {
    expect(scoreCeiling(sheet(kept), kept, 'strength', 1)).toBe(75)
    expect(scoreCeiling(sheet(kept), kept, 'strength', 11)).toBe(85)
  })

  it('share creation’s kept points between attributes: what one takes, another cannot', () => {
    const one = { ...kept, strength: 75 }
    // 45 of the 85 kept went to strength: 40 are left for dexterity, at level 1.
    expect(scoreCeiling(sheet(kept), one, 'dexterity', 1)).toBe(70)
  })

  it('go on top of a character made with 300 by the level’s points only', () => {
    expect(scoreCeiling(sheet(even), even, 'strength', 30)).toBe(79)
    const placed = placeScores(sheet(even), { ...even, strength: 60 })
    expect(placed.creation).toEqual(even)
    expect(placed.gained.strength).toBe(10)
  })
})

function total(scores: AttributePoints): number {
  return Object.values(scores).reduce((sum, value) => sum + value, 0)
}
