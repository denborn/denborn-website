import { describe, expect, it } from 'vitest'
import { incomingKind } from './incoming-link'
import { createTitleGate, opensOnTitle } from './title-gate'

describe('a link that carries a code', () => {
  it('is told apart by how its code starts, in small letters or in capitals', () => {
    expect(incomingKind('dnc1.abc')).toBe('character')
    expect(incomingKind('DNC1.ABC')).toBe('character')
    expect(incomingKind('DNJ1.K7QW2M')).toBe('join')
    expect(incomingKind('dnr1.abc')).toBe('creation')
  })

  it('is not one of the app’s when it starts otherwise, or is empty', () => {
    expect(incomingKind('')).toBeUndefined()
    expect(incomingKind('section-2')).toBeUndefined()
    expect(incomingKind('dncx')).toBeUndefined()
    expect(incomingKind('xdnc1.abc')).toBeUndefined()
  })
})

describe('the title screen', () => {
  it('opens a visit that starts on the home', () => {
    expect(opensOnTitle('/', '')).toBe(true)
    expect(opensOnTitle('/', '#')).toBe(true)
    expect(opensOnTitle('/', '#anything-else')).toBe(true)
  })

  it('does not open a visit that starts on another page, or on a link that carries a code', () => {
    expect(opensOnTitle('/options', '')).toBe(false)
    expect(opensOnTitle('/characters/new', '')).toBe(false)
    expect(opensOnTitle('/', '#DNJ1.K7QW2M')).toBe(false)
    expect(opensOnTitle('/', '#dnc1.abc')).toBe(false)
    expect(opensOnTitle('/', '#dnr1.abc')).toBe(false)
  })

  it('shows until it is passed, tells those who listen once, and stays passed', () => {
    const gate = createTitleGate(true)
    let told = 0
    gate.subscribe(() => told++)
    expect(gate.showing()).toBe(true)

    gate.pass()
    gate.pass()
    expect(gate.showing()).toBe(false)
    expect(told).toBe(1)
  })

  it('has nothing to pass on a visit it did not open', () => {
    const gate = createTitleGate(false)
    let told = 0
    gate.subscribe(() => told++)
    gate.pass()
    expect(gate.showing()).toBe(false)
    expect(told).toBe(0)
  })
})
