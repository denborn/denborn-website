import { describe, expect, it } from 'vitest'
import { TEXT_PACE, TEXT_SPEEDS, pickTextSpeed } from './text-speed'

describe('the speed of the battle\'s text', () => {
  it('is the one the device kept, and normal when it kept none or something else', () => {
    expect(pickTextSpeed('fast')).toBe('fast')
    expect(pickTextSpeed('slow')).toBe('slow')
    expect(pickTextSpeed(null)).toBe('normal')
    expect(pickTextSpeed('lightning')).toBe('normal')
  })

  it('goes faster from slow to fast, for the letters and for how long a sentence stays', () => {
    const [slow, normal, fast] = TEXT_SPEEDS.map((speed) => TEXT_PACE[speed])
    if (!slow || !normal || !fast) throw new Error('There are three speeds')
    expect(slow.lettersPerSecond).toBeLessThan(normal.lettersPerSecond)
    expect(normal.lettersPerSecond).toBeLessThan(fast.lettersPerSecond)
    expect(slow.saidMs).toBeGreaterThan(normal.saidMs)
    expect(normal.saidMs).toBeGreaterThan(fast.saidMs)
  })
})
