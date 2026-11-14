import { describe, expect, it } from 'vitest'
import { effectProblem } from './bag-table.ts'

describe('checking a Bag effect row', () => {
  it('accepts every kind of effect the Bag action can apply', () => {
    const rows = [
      { heal: 20 },
      { heal: 'full', cure: 'all', cureConfusion: true },
      { heal: { fraction: 0.25 } },
      { cure: ['psn', 'tox'] },
      { revive: 'half' },
      { reviveAll: true },
      { restorePp: { amount: 'full', scope: 'one' } },
      { boost: { stat: 'spe', stages: 2 } },
      { crit: true },
      { guard: true },
    ]
    for (const row of rows) expect(effectProblem(row), JSON.stringify(row)).toBeNull()
  })

  it('refuses a row the Bag action could not apply', () => {
    const rows = [
      {},
      { heal: 0 },
      { heal: { fraction: 2 } },
      { cure: ['hungry'] },
      { cure: [] },
      { revive: 'quarter' },
      { restorePp: { amount: 10, scope: 'some' } },
      { boost: { stat: 'hp', stages: 1 } },
      { boost: { stat: 'atk', stages: 0 } },
      { crit: false },
      { explode: true },
      'potion',
    ]
    for (const row of rows) expect(effectProblem(row), JSON.stringify(row)).not.toBeNull()
  })
})
