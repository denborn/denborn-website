import { describe, expect, it } from 'vitest'
import type { BagEffect } from '../game-rules/bag-effects'
import { bag, enemy, eventsOf, move, player, round, start, timeline } from './test-kit'

// The effects below are made up for the tests: real items get theirs from the data pack.
const HEAL_20: BagEffect = { heal: 20 }

/** The order in which Pokémon acted, by move or Bag use. */
function order(battle: ReturnType<typeof start>, result: ReturnType<typeof round>): string[] {
  return timeline(battle, result)
    .filter((step) => step.startsWith('move ') || step.startsWith('bag '))
    .map((step) => step.split(' ').slice(0, 2).join(' '))
}

describe('the Bag action: when it happens', () => {
  it('comes after +2 moves, in Speed order among +1 actions, before ordinary moves', () => {
    // Speeds: sprinter > jab > carrier > walker.
    const battle = start(
      [player('carrier', 'Snorlax', ['tackle'], { hp: 50 }), player('sprinter', 'Jolteon', ['extremespeed'])],
      [enemy('jab', 'Pikachu', ['quickattack']), enemy('walker', 'Slowpoke', ['tackle'])],
    )
    const result = round(battle, {
      carrier: bag('medicine', 'carrier', HEAL_20),
      sprinter: move('extremespeed', 'walker'),
      jab: move('quickattack', 'sprinter'),
      walker: move('tackle', 'sprinter'),
    })
    expect(order(battle, result)).toEqual(['move sprinter', 'move jab', 'bag carrier', 'move walker'])
  })

  it('goes before a slower +1 move', () => {
    const battle = start(
      [player('carrier', 'Jolteon', ['tackle'], { hp: 50 })],
      [enemy('jab', 'Pikachu', ['quickattack'])],
    )
    const result = round(battle, { carrier: bag('medicine', 'carrier', HEAL_20), jab: move('quickattack', 'carrier') })
    expect(order(battle, result)).toEqual(['bag carrier', 'move jab'])
  })

  it('is lost, with nothing shown, when its user goes down first', () => {
    const battle = start(
      [player('carrier', 'Snorlax', ['tackle'], { hp: 1 }), player('ally', 'Chansey', ['tackle'], { hp: 50 })],
      [enemy('sprinter', 'Jolteon', ['extremespeed'])],
    )
    const result = round(battle, {
      carrier: bag('medicine', 'ally', HEAL_20),
      sprinter: move('extremespeed', 'carrier'),
    })
    expect(eventsOf(result, 'bag')).toEqual([])
    expect(battle.combatant('ally').hp).toBe(50)
  })
})

describe('the Bag action: what stops it', () => {
  it('is blocked when its user is asleep, and the item is not used', () => {
    const battle = start(
      [player('sleeper', 'Snorlax', ['tackle'], { hp: 50, status: 'slp' })],
      [enemy('foe', 'Rattata', ['tackle'])],
    )
    const result = round(battle, { sleeper: bag('medicine', 'sleeper', HEAL_20) })

    expect(eventsOf(result, 'bag')).toEqual([
      { type: 'bag', user: 'sleeper', item: 'medicine', target: 'sleeper', outcome: 'blocked' },
    ])
    expect(timeline(battle, result)).toContain('cant sleeper slp')
    expect(battle.combatant('sleeper').hp).toBe(50)
  })

  it('is blocked by a flinch', () => {
    const battle = start(
      [player('carrier', 'Snorlax', ['tackle'], { hp: 50 })],
      [enemy('foe', 'Jolteon', ['fakeout'])],
    )
    const result = round(battle, { carrier: bag('medicine', 'carrier', HEAL_20), foe: move('fakeout', 'carrier') })
    expect(eventsOf(result, 'bag')[0]?.outcome).toBe('blocked')
  })

  it('fails without using the item when the target cannot take it, and still takes the turn', () => {
    const battle = start([player('carrier', 'Snorlax', ['tackle'])], [enemy('foe', 'Rattata', ['tackle'])])
    const result = round(battle, { carrier: bag('medicine', 'carrier', HEAL_20) })

    expect(eventsOf(result, 'bag')[0]?.outcome).toBe('failed')
    expect(timeline(battle, result).some((step) => step.startsWith('move carrier'))).toBe(false)
  })
})

describe('the Bag action: what an item can do', () => {
  function use(effect: BagEffect, setup: Parameters<typeof player>[3] = {}, moveId?: string) {
    const battle = start(
      [player('carrier', 'Chansey', ['tackle']), player('patient', 'Machamp', ['tackle', 'rockslide'], setup)],
      [enemy('foe', 'Rattata', ['tackle'])],
    )
    const result = round(battle, { carrier: bag('item', 'patient', effect, moveId) })
    return { battle, result, patient: battle.combatant('patient'), outcome: eventsOf(result, 'bag')[0]?.outcome }
  }

  it('restores a fixed amount of HP, never above the maximum', () => {
    expect(use({ heal: 20 }, { hp: 50 }).patient.hp).toBe(70)
    const topped = use({ heal: 9999 }, { hp: 50 }).patient
    expect(topped.hp).toBe(topped.maxHp)
    const full = use({ heal: 'full' }, { hp: 1 }).patient
    expect(full.hp).toBe(full.maxHp)
  })

  it('cures the conditions it lists and no other', () => {
    expect(use({ cure: ['par'] }, { status: 'par' }).patient.status).toBe('')
    const wrong = use({ cure: ['par'] }, { status: 'brn' })
    expect(wrong.patient.status).toBe('brn')
    expect(wrong.outcome).toBe('failed')
    expect(use({ cure: 'all' }, { status: 'tox' }).patient.status).toBe('')
  })

  it('counts as used when any part of a combined effect applies', () => {
    const both = use({ heal: 'full', cure: 'all' }, { hp: 10, status: 'psn' })
    expect(both.patient).toMatchObject({ hp: both.patient.maxHp, status: '' })
    // Full HP but poisoned: the cure alone is enough.
    expect(use({ heal: 'full', cure: 'all' }, { status: 'psn' }).outcome).toBe('used')
  })

  it('restores PP to one chosen move or to all of them, never above the maximum', () => {
    const one = use({ restorePp: { amount: 10, scope: 'one' } }, { pp: { tackle: 3, rockslide: 2 } }, 'tackle')
    expect(one.patient.moves.find((slot) => slot.id === 'tackle')?.pp).toBe(13)
    expect(one.patient.moves.find((slot) => slot.id === 'rockslide')?.pp).toBe(2)

    const all = use({ restorePp: { amount: 'full', scope: 'all' } }, { pp: { tackle: 3, rockslide: 2 } })
    for (const slot of all.patient.moves.filter((candidate) => candidate.id !== 'splash')) {
      expect(slot.pp).toBe(slot.maxPp)
    }

    expect(use({ restorePp: { amount: 10, scope: 'all' } }).outcome).toBe('failed')
  })

  it('raises a stat, the critical-hit rate, or guards the side', () => {
    expect(use({ boost: { stat: 'spe', stages: 2 } }).patient.boosts).toEqual({ spe: 2 })
    expect(use({ crit: true }).patient.volatiles).toContain('focusenergy')
    expect(use({ guard: true }).result.log.some((entry) => entry.startsWith('|-sidestart|p1: players|Mist'))).toBe(true)
  })

  it('cures confusion', () => {
    const battle = start(
      [player('carrier', 'Chansey', ['tackle']), player('patient', 'Snorlax', ['tackle'])],
      [enemy('foe', 'Jolteon', ['confuseray'])],
    )
    round(battle, { foe: move('confuseray', 'patient') })
    expect(battle.combatant('patient').volatiles).toContain('confusion')

    round(battle, { carrier: bag('item', 'patient', { cureConfusion: true }) })
    expect(battle.combatant('patient').volatiles).not.toContain('confusion')
  })

  it('revives with half or all HP, and only a downed Pokémon', () => {
    const downed = () => {
      const battle = start(
        [player('carrier', 'Chansey', ['tackle']), player('patient', 'Machamp', ['tackle'], { hp: 1 })],
        [enemy('foe', 'Jolteon', ['tackle'])],
      )
      round(battle, { foe: move('tackle', 'patient') })
      return battle
    }

    const half = downed()
    round(half, { carrier: bag('item', 'patient', { revive: 'half' }) })
    expect(half.combatant('patient').hp).toBe(Math.floor(half.combatant('patient').maxHp / 2))

    const full = downed()
    round(full, { carrier: bag('item', 'patient', { revive: 'full' }) })
    expect(full.combatant('patient').hp).toBe(full.combatant('patient').maxHp)

    // On a standing Pokémon a revival item does nothing.
    expect(use({ revive: 'full' }, { hp: 10 }).outcome).toBe('failed')
  })

  it('revives every downed ally of the user at once, and nobody on the other side', () => {
    const battle = start(
      [
        player('carrier', 'Chansey', ['tackle']),
        player('one', 'Rattata', ['tackle'], { hp: 1 }),
        player('two', 'Rattata', ['tackle'], { hp: 1 }),
      ],
      [enemy('fallen', 'Rattata', ['tackle'], { hp: 1, agony: true }), enemy('foe', 'Jolteon', ['swift', 'tackle'])],
    )
    // From the right-hand enemy slot, Swift reaches "one" and "two" but not the carrier.
    round(battle, { foe: move('swift'), carrier: move('tackle', 'fallen') })
    expect(battle.combatants().filter((combatant) => combatant.downed).map((combatant) => combatant.id).sort()).toEqual([
      'fallen',
      'one',
      'two',
    ])

    round(battle, { carrier: bag('ash', 'carrier', { reviveAll: true }) })
    for (const id of ['one', 'two']) {
      expect(battle.combatant(id)).toMatchObject({ downed: false, hp: battle.combatant(id).maxHp })
    }
    expect(battle.combatant('fallen').downed).toBe(true)
  })

  it('can be used on any Pokémon on the field, and by enemies', () => {
    const battle = start(
      [player('carrier', 'Chansey', ['tackle'], { hp: 50 })],
      [enemy('foe', 'Snorlax', ['tackle'], { hp: 50 })],
    )
    round(battle, { carrier: bag('item', 'foe', HEAL_20), foe: bag('item', 'carrier', HEAL_20) })
    expect(battle.combatant('foe').hp).toBe(70)
    expect(battle.combatant('carrier').hp).toBe(70)
  })
})
