import { describe, expect, it } from 'vitest'
import { createDeviceChoice } from './device-choice'
import { memoryStorage } from './library'

type Pace = 'slow' | 'fast'
const pickPace = (stored: string | null): Pace => (stored === 'fast' ? 'fast' : 'slow')

describe('a choice of the device', () => {
  it('starts from what the device kept, as its own rule reads it', () => {
    const storage = memoryStorage()
    storage.setItem('pace', 'fast')
    expect(createDeviceChoice('pace', pickPace, () => storage).get()).toBe('fast')
    expect(createDeviceChoice('other', pickPace, () => storage).get()).toBe('slow')
  })

  it('keeps a change and tells those who listen, until they stop listening', () => {
    const storage = memoryStorage()
    const choice = createDeviceChoice('pace', pickPace, () => storage)
    let told = 0
    const stop = choice.subscribe(() => told++)

    choice.set('fast')
    expect(choice.get()).toBe('fast')
    expect(storage.getItem('pace')).toBe('fast')
    expect(told).toBe(1)

    stop()
    choice.set('slow')
    expect(told).toBe(1)
  })

  it('tells nobody when the choice is the one it already is', () => {
    const choice = createDeviceChoice('pace', pickPace, () => memoryStorage())
    let told = 0
    choice.subscribe(() => told++)
    choice.set('slow')
    expect(told).toBe(0)
  })

  it('lasts for the visit when the browser refuses its storage', () => {
    const choice = createDeviceChoice('pace', pickPace, () => {
      throw new Error('refused')
    })
    expect(choice.get()).toBe('slow')
    let told = 0
    choice.subscribe(() => told++)
    choice.set('fast')
    expect(choice.get()).toBe('fast')
    expect(told).toBe(1)
  })
})
