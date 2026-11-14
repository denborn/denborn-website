import { describe, expect, it } from 'vitest'
import { EV_MAX, IV_MAX, checkEvs, checkIvs, checkSpread, evBudget, ivBudget } from './budgets'
import type { StatSpread } from './stats'

const spread = (values: Partial<StatSpread> = {}): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...values })

describe('IV and EV budgets', () => {
  it('grow with the level and round down', () => {
    expect([ivBudget(1), ivBudget(50), ivBudget(99), ivBudget(100)]).toEqual([1, 93, 184, 186])
    expect([evBudget(1), evBudget(50), evBudget(99), evBudget(100)]).toEqual([5, 255, 504, 510])
  })

  it('accept points left unplaced', () => {
    expect(checkIvs(spread(), 50)).toEqual([])
    expect(checkEvs(spread({ hp: 4 }), 1)).toEqual([])
  })

  it('accept a placement that uses the whole budget', () => {
    expect(checkIvs(spread({ hp: 31, atk: 31, def: 31 }), 50)).toEqual([])
    expect(checkEvs(spread({ atk: 252, spe: 252, hp: 6 }), 100)).toEqual([])
  })

  it('refuse a placement over the budget, and say by how much', () => {
    expect(checkIvs(spread({ hp: 31, atk: 31, def: 31, spa: 1 }), 50)).toEqual([{ kind: 'over-budget', by: 1 }])
    expect(checkEvs(spread({ hp: 6 }), 1)).toEqual([{ kind: 'over-budget', by: 1 }])
  })

  it('refuse a stat above its own limit even within the budget', () => {
    expect(checkIvs(spread({ spe: IV_MAX + 1 }), 100)).toEqual([{ kind: 'above-max', stat: 'spe', max: IV_MAX }])
    expect(checkEvs(spread({ atk: EV_MAX + 1 }), 100)).toEqual([{ kind: 'above-max', stat: 'atk', max: EV_MAX }])
  })

  it('refuse negative and fractional points', () => {
    expect(checkSpread(spread({ hp: -1, def: 2.5 }), 31, 100)).toEqual([
      { kind: 'below-zero', stat: 'hp' },
      { kind: 'not-whole', stat: 'def' },
    ])
  })
})
