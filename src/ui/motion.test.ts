import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEX, DURATION, EASE, TITLE } from './motion'

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function token(name: string): string {
  const match = new RegExp(`--dn-${name}:\\s*([^;]+);`).exec(tokens)
  if (!match?.[1]) throw new Error(`tokens.css has no --dn-${name}`)
  return match[1].trim()
}

// The numbers exist twice, once for CSS and once for script. This is what keeps them the same.
describe('motion tokens', () => {
  it.each(Object.entries(DURATION))('duration "%s" is the same in script and in CSS', (name, seconds) => {
    expect(token(name)).toBe(`${Math.round(seconds * 1000)}ms`)
  })

  it.each(Object.entries(TITLE))('title screen timing "%s" is the same in script and in CSS', (name, seconds) => {
    expect(token(`title-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`)
  })

  it.each(Object.entries(DEX))('Pokédex timing "%s" is the same in script and in CSS', (name, seconds) => {
    expect(token(`dex-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`)
  })

  it.each(Object.entries(EASE))('easing "%s" is the same in script and in CSS', (name, curve) => {
    expect(token(`ease-${name}`)).toBe(`cubic-bezier(${curve.join(', ')})`)
  })
})
