import { describe, expect, it } from 'vitest'
import { DenbornBattle } from '../../battle/denborn-battle'
import { newcomer } from '../../domain/test-pack'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Encounter, Enemy } from '../../shared/schema/encounter'
import { fightSetup, seedFrom } from './fight-setup'

const SPREAD = { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }

/** A character of a species the real engine knows. */
const hero = (id: string, changes: Partial<CharacterDocument> = {}): CharacterDocument =>
  newcomer({ id, species: 'pikachu', ability: 'static', nature: 'jolly', level: 20, ivs: SPREAD, evs: SPREAD, moves: [{ id: 'tackle', ppUps: 0, pp: 35 }], hp: 30, ...changes })

const foe = (id: string, changes: Partial<Enemy> = {}): Enemy => ({
  id,
  species: 'geodude',
  gender: 'M',
  level: 12,
  ability: 'sturdy',
  ivs: SPREAD,
  evs: SPREAD,
  moves: [{ id: 'tackle', ppUps: 3 }],
  agony: false,
  class: 'minion',
  ...changes,
})

const encounter = (...enemies: Enemy[]): Encounter => ({ id: 'encounter-0001', name: 'Test', enemies, bag: [] })
const SEED = '1,2,3,4'

describe('the battle an encounter makes', () => {
  it('puts on the line, in the party\'s order, the characters who can fight; the downed and the dead sit out (decision 51)', () => {
    const party = [
      hero('hero-one-0001'),
      hero('hero-down-001', { hp: 0, condition: { state: 'downed', stacks: 2 } }),
      hero('hero-two-0001'),
      hero('hero-dead-001', { hp: 0, condition: { state: 'dead' } }),
    ]
    const launch = fightSetup(encounter(foe('enemy-one-001'), foe('enemy-two-001')), party, SEED)
    expect(launch).toMatchObject({ ok: true, fighting: ['hero-one-0001', 'hero-two-0001'], sittingOut: ['hero-down-001', 'hero-dead-001'] })
    if (!launch.ok) return
    expect(launch.setup.players.map((combatant) => combatant.id)).toEqual(['hero-one-0001', 'hero-two-0001'])
    expect(launch.setup.enemies.map((combatant) => combatant.id)).toEqual(['enemy-one-001', 'enemy-two-001'])
  })

  it('is not made when nobody can fight, or when two on the field could not be told apart', () => {
    const down = hero('hero-down-001', { hp: 0, condition: { state: 'downed', stacks: 1 } })
    expect(fightSetup(encounter(foe('enemy-one-001')), [down], SEED)).toEqual({ ok: false, problem: 'nobody-can-fight' })
    expect(fightSetup(encounter(foe('enemy-one-001')), [], SEED)).toEqual({ ok: false, problem: 'nobody-can-fight' })
    expect(fightSetup(encounter(foe('same-id-00001')), [hero('same-id-00001')], SEED)).toEqual({ ok: false, problem: 'same-id' })
  })

  it('brings a character in as it stands, and an enemy whole (decision 58)', () => {
    const worn = hero('hero-one-0001', { hp: 7, status: 'par', heldItem: 'charcoal', moves: [{ id: 'tackle', ppUps: 1, pp: 3 }] })
    const launch = fightSetup(encounter(foe('enemy-one-001', { heldItem: 'leftovers', agony: true })), [worn], SEED)
    if (!launch.ok) throw new Error(launch.problem)
    const battle = DenbornBattle.start(launch.setup)

    expect(battle.combatant('hero-one-0001')).toMatchObject({ hp: 7, status: 'par', item: 'charcoal', moves: [{ id: 'tackle', pp: 3, maxPp: 42 }] })
    const enemy = battle.combatant('enemy-one-001')
    expect(enemy).toMatchObject({ item: 'leftovers', status: '', moves: [{ id: 'tackle', pp: 56, maxPp: 56 }] })
    expect(enemy.hp).toBe(enemy.maxHp)
    // Players' Pokémon always go through Agony; an enemy only when the game master said so.
    expect(launch.setup.players.map((combatant) => combatant.agony)).toEqual([true])
    expect(launch.setup.enemies.map((combatant) => combatant.agony)).toEqual([true])
    expect(fightSetup(encounter(foe('enemy-one-001')), [worn], SEED)).toMatchObject({ setup: { enemies: [{ agony: false }] } })
  })

  it('starts a character whose campaign makes natures neutral with no stat moved', () => {
    const plain = fightSetup(encounter(foe('enemy-one-001')), [{ ...hero('hero-one-0001'), nature: undefined }], SEED)
    const hasty = fightSetup(encounter(foe('enemy-one-001')), [hero('hero-one-0001', { nature: 'hasty' })], SEED)
    if (!plain.ok || !hasty.ok) throw new Error('The battle was not made')
    const order = (launch: typeof plain) => DenbornBattle.start(launch.setup).turnOrder({})
    // Level 20 Pikachu against level 12 Geodude: faster either way; what matters is that the engine takes both.
    expect(order(plain)).toEqual(order(hasty))
  })
})

describe('a seed for the engine', () => {
  it('is four numbers of 16 bits, read from eight bytes', () => {
    expect(seedFrom(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe('258,772,1286,1800')
    expect(seedFrom(new Uint8Array([255, 255, 0, 0, 0, 1, 128, 0]))).toBe('65535,0,1,32768')
  })
})
