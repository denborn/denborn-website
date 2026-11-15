import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import { type FightLeft, afterFight, awarded } from './after-fight'
import { maxHpOf } from './character-check'
import { newcomer, testPack } from './test-pack'

const left = (changes: Partial<FightLeft> = {}): FightLeft => ({ hp: 9, status: '', downed: false, dead: false, stacks: 0, moves: [{ id: 'tackle', pp: 30 }], itemSpent: false, ...changes })
const hero = newcomer({ status: 'par', bag: [{ item: 'potion', quantity: 3 }] })

describe('a character as a fight left it (decisions 58 and 136)', () => {
  it('keeps the HP, the PP and the status the fight ended with, and what is left of its bag', () => {
    const after = afterFight(hero, left({ hp: 7, status: 'brn' }), [{ item: 'potion', quantity: 1 }])
    expect(after).toMatchObject({ hp: 7, status: 'brn', condition: { state: 'standing' }, moves: [{ id: 'tackle', pp: 30 }], bag: [{ item: 'potion', quantity: 1 }], revision: hero.revision + 1 })
    // A status that was cured in the fight is gone from the sheet too.
    expect(afterFight(hero, left(), [])).not.toHaveProperty('status')
  })

  it('stays downed with its stacks, or dead, at 0 HP and with no status', () => {
    const downed = afterFight(hero, left({ hp: 0, downed: true, stacks: 2, status: 'psn' }), [])
    expect(downed).toMatchObject({ hp: 0, condition: { state: 'downed', stacks: 2 } })
    expect(downed).not.toHaveProperty('status')
    expect(afterFight(hero, left({ hp: 0, dead: true }), [])).toMatchObject({ hp: 0, condition: { state: 'dead' } })
  })

  it('loses a held item that was eaten or used up, and keeps one that was only taken from it', () => {
    expect(afterFight(hero, left({ itemSpent: true }), [])).not.toHaveProperty('heldItem')
    expect(afterFight(hero, left({ itemSpent: false }), []).heldItem).toBe(hero.heldItem)
  })

  it('leaves alone the PP of a move the fight says nothing of', () => {
    expect(afterFight(hero, left({ moves: [] }), []).moves).toEqual(hero.moves)
  })
})

describe('a character awarded EXP and Pokédollars', () => {
  it('adds both, and stays at its level while the next is not reached', () => {
    const after = awarded(hero, 10, 250, testPack)
    expect(after).toMatchObject({ exp: hero.exp + 10, money: hero.money + 250, level: hero.level, hp: hero.hp, revision: hero.revision + 1 })
  })

  it('rises to the level its EXP gives at once, its HP rising by what its maximum gained (decision 161)', () => {
    const hurt = { ...hero, hp: hero.hp - 4 }
    const after = awarded(hurt, expForLevel(8) - hurt.exp, 0, testPack)
    expect(after.level).toBe(8)
    const gained = (maxHpOf(after, testPack) ?? 0) - (maxHpOf(hurt, testPack) ?? 0)
    expect(gained).toBeGreaterThan(0)
    expect(after.hp).toBe(hurt.hp + gained)
    // Its moves and the points already placed do not move.
    expect(after).toMatchObject({ moves: hurt.moves, ivs: hurt.ivs, evs: hurt.evs, attributes: hurt.attributes })
  })

  it('leaves a Pokémon at 0 HP there, whatever level it reaches', () => {
    const down = { ...hero, hp: 0, condition: { state: 'downed' as const, stacks: 2 } }
    expect(awarded(down, expForLevel(10), 0, testPack)).toMatchObject({ level: 10, hp: 0 })
  })

  it('stops at level 100 and at the most a character can carry, and takes nothing away', () => {
    const after = awarded(hero, 5_000_000, 5_000_000_000, testPack)
    expect(after).toMatchObject({ level: 100, exp: expForLevel(100), money: 999_999_999 })
    expect(awarded(hero, -50, -50, testPack)).toMatchObject({ exp: hero.exp, money: hero.money })
  })
})
