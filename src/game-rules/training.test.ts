import { describe, expect, it } from 'vitest'
import type { StatSpread } from './stats'
import { TV_MAX, type Training, checkTraining, tvBudget, tvCeiling, tvLeft, tvOf, tvPlaced, withTv } from './training'

const spread = (values: Partial<StatSpread> = {}): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...values })
const trained = (ivs: Partial<StatSpread> = {}, evs: Partial<StatSpread> = {}): Training => ({ ivs: spread(ivs), evs: spread(evs) })
const none = trained()

describe('the TV a level gives', () => {
  it('is its IV budget and a quarter of its EV budget, rounded down', () => {
    // Level 5: 9 IVs and 25 EVs. Level 100: 186 and 510.
    expect([tvBudget(1), tvBudget(5), tvBudget(50), tvBudget(100)]).toEqual([2, 15, 156, 313])
  })
})

describe('the TV of a stat', () => {
  it('counts one for an IV and one for four EVs, and nothing for EVs short of a fourth', () => {
    expect(tvOf(trained({ hp: 5, atk: 31 }, { hp: 40, atk: 252, def: 3 }))).toEqual(spread({ hp: 15, atk: TV_MAX, def: 0 }))
    expect(tvPlaced(trained({ hp: 5, atk: 31 }, { hp: 40, atk: 252, def: 3 }))).toBe(15 + 94)
  })

  it('fills the IVs first, then the EVs four at a time', () => {
    expect(withTv(none, 'spe', 20)).toEqual(trained({ spe: 20 }))
    expect(withTv(none, 'spe', 40)).toEqual(trained({ spe: 31 }, { spe: 36 }))
    expect(withTv(none, 'spe', TV_MAX)).toEqual(trained({ spe: 31 }, { spe: 252 }))
  })

  it('empties the EVs first when lowered, then the IVs', () => {
    const full = withTv(none, 'atk', 50)
    expect(withTv(full, 'atk', 35)).toEqual(trained({ atk: 31 }, { atk: 16 }))
    expect(withTv(full, 'atk', 10)).toEqual(trained({ atk: 10 }))
  })

  it('stays between 0 and 94, in whole points, and leaves the other stats alone', () => {
    const start = trained({ hp: 7 }, { def: 12 })
    expect(tvOf(withTv(start, 'spa', 500)).spa).toBe(TV_MAX)
    expect(tvOf(withTv(start, 'spa', -3)).spa).toBe(0)
    expect(tvOf(withTv(start, 'spa', 12.4)).spa).toBe(12)
    expect(withTv(start, 'spa', 12)).toMatchObject({ ivs: { hp: 7 }, evs: { def: 12 } })
  })

  it('never lowers the IVs or the EVs of a Pokémon made before TV when it is raised', () => {
    // 5 IVs and 40 EVs, as they could be placed apart: 15 TV.
    const before = trained({ hp: 5 }, { hp: 40 })
    expect(withTv(before, 'hp', 18)).toEqual(trained({ hp: 8 }, { hp: 40 }))
    // 250 EVs leave room for two more, not four: the last TV takes them.
    const nearlyFull = trained({ spe: 31 }, { spe: 250 })
    expect(tvOf(nearlyFull).spe).toBe(93)
    expect(withTv(nearlyFull, 'spe', TV_MAX)).toEqual(trained({ spe: 31 }, { spe: 252 }))
  })

  it('can go as high as what is left to place allows, and no higher than 94', () => {
    // Level 5 gives 15.
    expect(tvCeiling(none, 'hp', 5)).toBe(15)
    const some = withTv(none, 'atk', 10)
    expect(tvLeft(some, 5)).toBe(5)
    expect(tvCeiling(some, 'hp', 5)).toBe(5)
    expect(tvCeiling(some, 'atk', 5)).toBe(15)
    expect(tvCeiling(none, 'hp', 100)).toBe(TV_MAX)
    // More placed than the level gives: nothing goes up, and what is there is not asked down.
    expect(tvCeiling(withTv(none, 'atk', 20), 'atk', 5)).toBe(20)
  })
})

describe('a Pokémon’s training', () => {
  it('may leave TV unplaced, or place all of it', () => {
    expect(checkTraining(none, 50)).toEqual([])
    expect(checkTraining(withTv(none, 'hp', 15), 5)).toEqual([])
  })

  it('may put in one stat more IVs than the level’s IV budget, while the TV fits', () => {
    // Level 5 has 9 IVs to its name and 15 TV.
    expect(checkTraining(trained({ spe: 15 }), 5)).toEqual([])
  })

  it('is refused over the level’s TV, with by how much', () => {
    expect(checkTraining(trained({ spe: 15 }, { atk: 4 }), 5)).toEqual([{ kind: 'over-budget', by: 1 }])
  })

  it('is refused with IVs or EVs past what a stat takes, even within the budget', () => {
    expect(checkTraining(trained({ spe: 32 }), 100)).toEqual([{ kind: 'above-max', part: 'ivs', stat: 'spe', max: 31 }])
    expect(checkTraining(trained({}, { atk: 253 }), 100)).toEqual([{ kind: 'above-max', part: 'evs', stat: 'atk', max: 252 }])
  })

  it('is refused with negative or fractional points', () => {
    expect(checkTraining(trained({ hp: -1 }, { def: 2.5 }), 100)).toEqual([
      { kind: 'below-zero', part: 'ivs', stat: 'hp' },
      { kind: 'not-whole', part: 'evs', stat: 'def' },
    ])
  })

  it('still fits when IVs and EVs each fitted their own budget, as before TV', () => {
    // Level 30: 55 IVs and 153 EVs then; 55 + 38 TV now. EVs spread thin count for less TV, never more.
    const before = trained({ hp: 31, atk: 24 }, { hp: 3, atk: 3, def: 3, spa: 48, spd: 48, spe: 48 })
    expect(checkTraining(before, 30)).toEqual([])
  })
})
