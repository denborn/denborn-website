import { describe, expect, it } from 'vitest'
import { evBudget, ivBudget } from './budgets'

describe('IV and EV budgets', () => {
  it('grow with the level and round down', () => {
    expect([ivBudget(1), ivBudget(50), ivBudget(99), ivBudget(100)]).toEqual([1, 93, 184, 186])
    expect([evBudget(1), evBudget(50), evBudget(99), evBudget(100)]).toEqual([5, 255, 504, 510])
  })
})
