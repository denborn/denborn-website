import { describe, expect, it } from 'vitest'
import { MAX_LEVEL } from './exp'
import { type Earner, expFor, expFrom, moneyFor } from './rewards'

const plain = (level: number): Earner => ({ level, couldEvolve: false, holdsLuckyEgg: false })
/** An enemy whose base amount is 400: base EXP 100 at level 20. */
const enemy = { baseExp: 100, level: 20 }

describe('the EXP an enemy is worth', () => {
  it('is its base amount and one more to a Pokémon of its own level', () => {
    expect(expFrom(enemy, plain(20))).toBe(401)
  })

  it('is more to a Pokémon below its level, and less to one above', () => {
    // (50 / 40) to the power 2.5 is 1.7469…; (50 / 70) to the power 2.5 is 0.4312…
    expect(expFrom(enemy, plain(10))).toBe(699)
    expect(expFrom(enemy, plain(40))).toBe(173)
  })

  it('is a fifth more to a Pokémon that could already have evolved, and half as much again with a Lucky Egg', () => {
    expect(expFrom(enemy, { ...plain(20), couldEvolve: true })).toBe(481)
    expect(expFrom(enemy, { ...plain(20), holdsLuckyEgg: true })).toBe(601)
    expect(expFrom(enemy, { level: 20, couldEvolve: true, holdsLuckyEgg: true })).toBe(721)
  })

  it('is nothing to a Pokémon at the highest level', () => {
    expect(expFrom(enemy, plain(MAX_LEVEL))).toBe(0)
  })

  it('adds up over the enemies of an encounter', () => {
    expect(expFor([enemy, enemy, { baseExp: 50, level: 20 }], plain(20))).toBe(401 + 401 + 201)
    expect(expFor([], plain(20))).toBe(0)
  })
})

describe('the Pokédollars an encounter is worth', () => {
  it('are each enemy’s level times its class’s base, added up', () => {
    // The owner's own example: a level 20 boss with two level 15 minions gives 2880.
    expect(moneyFor([{ level: 20, class: 'boss' }, { level: 15, class: 'minion' }, { level: 15, class: 'minion' }])).toBe(2880)
    expect(moneyFor([{ level: 10, class: 'elite' }])).toBe(600)
    expect(moneyFor([])).toBe(0)
  })
})
