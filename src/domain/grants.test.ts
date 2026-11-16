import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import { MONEY_MAX } from './after-fight'
import { maxHpOf } from './character-check'
import { granted } from './grants'
import { progressPack } from './progress-pack'
import { newcomer } from './test-pack'

describe('what the game master gives or takes by hand (decisions 5 and 170)', () => {
  const character = newcomer({ bag: [{ item: 'tonic', quantity: 2 }], money: 500 })

  it('adds items to the Bag and takes them from it', () => {
    const result = granted(character, { items: [{ item: 'tonic', quantity: 3 }, { item: 'phoenix', quantity: 1 }] }, progressPack)
    expect(result).toMatchObject({ ok: true, character: { bag: [{ item: 'tonic', quantity: 5 }, { item: 'phoenix', quantity: 1 }], revision: character.revision + 1 } })
    expect(granted(character, { items: [{ item: 'tonic', quantity: -2 }] }, progressPack)).toMatchObject({ ok: true, character: { bag: [] } })
  })

  it('adds and takes Pokédollars, never below nothing nor above what a sheet holds', () => {
    expect(granted(character, { money: 250 }, progressPack)).toMatchObject({ ok: true, character: { money: 750 } })
    expect(granted(character, { money: -500 }, progressPack)).toMatchObject({ ok: true, character: { money: 0 } })
    expect(granted(character, { money: -501 }, progressPack)).toEqual({ ok: false, problem: 'money' })
    expect(granted(character, { money: MONEY_MAX }, progressPack)).toEqual({ ok: false, problem: 'money' })
    expect(granted(character, { money: 0.5 }, progressPack)).toEqual({ ok: false, problem: 'money' })
  })

  it('adds EXP, the level and the HP following at once, and never takes EXP back', () => {
    const hurt = newcomer({ hp: 4 })
    const result = granted(hurt, { exp: expForLevel(9) - hurt.exp }, progressPack)
    const gain = result.ok ? (maxHpOf(result.character, progressPack) ?? 0) - (maxHpOf(hurt, progressPack) ?? 0) : 0
    expect(gain).toBeGreaterThan(0)
    expect(result).toMatchObject({ ok: true, character: { level: 9, exp: expForLevel(9), hp: 4 + gain, revision: hurt.revision + 1 } })
    expect(granted(character, { exp: -1 }, progressPack)).toEqual({ ok: false, problem: 'exp' })
  })

  it('gives everything asked at once, or nothing', () => {
    const all = granted(character, { items: [{ item: 'tonic', quantity: -1 }], money: -100, exp: 10 }, progressPack)
    expect(all).toMatchObject({ ok: true, character: { bag: [{ item: 'tonic', quantity: 1 }], money: 400, exp: character.exp + 10, revision: character.revision + 1 } })
    // One part that cannot be done, and none is.
    expect(granted(character, { items: [{ item: 'tonic', quantity: 1 }, { item: 'phoenix', quantity: -1 }], money: 100 }, progressPack)).toEqual({ ok: false, problem: 'not-enough' })
  })

  it('says what cannot be done: an item the game data lacks, more than the Bag holds or takes, nothing at all', () => {
    expect(granted(character, { items: [{ item: 'nothing', quantity: 1 }] }, progressPack)).toEqual({ ok: false, problem: 'unknown-item' })
    expect(granted(character, { items: [{ item: 'tonic', quantity: -3 }] }, progressPack)).toEqual({ ok: false, problem: 'not-enough' })
    expect(granted(character, { items: [{ item: 'tonic', quantity: 998 }] }, progressPack)).toEqual({ ok: false, problem: 'bag-full' })
    expect(granted(character, {}, progressPack)).toEqual({ ok: false, problem: 'nothing' })
    expect(granted(character, { items: [{ item: 'tonic', quantity: 0 }], money: 0, exp: 0 }, progressPack)).toEqual({ ok: false, problem: 'nothing' })
  })

  it('reaches a dead character\'s sheet too: its Bag can go to the others', () => {
    const dead = newcomer({ hp: 0, condition: { state: 'dead' }, bag: [{ item: 'phoenix', quantity: 1 }] })
    expect(granted(dead, { items: [{ item: 'phoenix', quantity: -1 }] }, progressPack)).toMatchObject({ ok: true, character: { bag: [], condition: { state: 'dead' } } })
  })
})
