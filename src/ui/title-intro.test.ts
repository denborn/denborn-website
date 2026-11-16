import { describe, expect, it } from 'vitest'
import { TITLE_PHASES, nextPhase, phaseLength, reached } from './title-intro'

describe('the title screen intro', () => {
  it('goes from the den in daylight to the storm, one step at a time', () => {
    const seen = ['day' as const]
    for (let step = 0; step < 6; step++) seen.push(nextPhase(seen[seen.length - 1] ?? 'day') as 'day')
    expect(seen).toEqual(['day', 'rising', 'strike', 'named', 'storm', 'storm', 'storm'])
  })

  it('times every step but the storm, which lasts', () => {
    for (const phase of TITLE_PHASES) {
      if (phase === 'storm') expect(phaseLength(phase)).toBeUndefined()
      else expect(phaseLength(phase)).toBeGreaterThan(0)
    }
  })

  it('keeps what each step brought', () => {
    expect(reached('day', 'rising')).toBe(false)
    expect(reached('rising', 'rising')).toBe(true)
    expect(reached('storm', 'rising')).toBe(true)
    expect(reached('named', 'storm')).toBe(false)
  })
})
