import { describe, expect, it } from 'vitest'
import { skyAt } from './sky'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

describe('how an hour lights a fight’s background', () => {
  it('lays no veil at noon, and the night’s whole at midnight', () => {
    expect(skyAt(12)).toEqual({ veil: undefined, strength: 0 })
    expect(skyAt(0)).toEqual({ veil: 'night', strength: 1 })
  })

  it('goes through the day in order: night, dawn, day, dusk, night', () => {
    const turns = HOURS.map((hour) => skyAt(hour).veil ?? 'day').filter((veil, index, all) => veil !== all[index - 1])
    expect(turns).toEqual(['night', 'dawn', 'day', 'dusk', 'night'])
  })

  it('never shows more than a whole veil nor less than none, and none only by day', () => {
    for (const hour of HOURS) {
      const sky = skyAt(hour)
      expect(sky.strength).toBeGreaterThanOrEqual(0)
      expect(sky.strength).toBeLessThanOrEqual(1)
      expect(sky.strength === 0).toBe(sky.veil === undefined)
    }
  })

  it('counts an hour past the day’s end round, and takes what is no hour for the day', () => {
    expect(skyAt(24)).toEqual(skyAt(0))
    expect(skyAt(-1)).toEqual(skyAt(23))
    expect(skyAt(21.7)).toEqual(skyAt(21))
    expect(skyAt(Number.NaN)).toEqual(skyAt(12))
  })
})
