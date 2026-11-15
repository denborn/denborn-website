import { describe, expect, it } from 'vitest'
import { newcomer, testPack } from '../../domain/test-pack'
import type { PlayerFight } from '../../shared/protocol/battle'
import { clockText, fightersOf, reaches } from './fighters'

type Combatant = PlayerFight['combatants'][number]

const on = (id: string, side: Combatant['side'], position: number, changes: Partial<Combatant> = {}): Combatant => ({
  id,
  side,
  position,
  species: 'sparkmouse',
  hp: 10,
  maxHp: 20,
  status: '',
  downed: false,
  dead: false,
  stacks: 0,
  item: '',
  ability: 'zap',
  boosts: {},
  volatiles: [],
  moves: [],
  ...changes,
})

const SPREAD = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const sheet = (id: string, changes: Partial<PlayerFight['enemies'][number]> = {}): PlayerFight['enemies'][number] => ({
  id,
  species: 'stonegolem',
  gender: 'N',
  level: 10,
  ability: 'sturdy',
  ivs: SPREAD,
  evs: SPREAD,
  moves: [{ id: 'tackle', ppUps: 0 }],
  agony: false,
  ...changes,
})

/** Only what the screens read of a fight: who is on the field, and the enemies' sheets. */
const fight = (combatants: Combatant[], enemies: PlayerFight['enemies'] = []): PlayerFight => ({ combatants, enemies }) as PlayerFight

describe('the Pokémon of a fight as the screens draw them', () => {
  it('lists the party first, each line from the left, with the letter of each place', () => {
    const shown = fightersOf(fight([on('foe-2', 'enemies', 1), on('hero-b', 'players', 1), on('foe-1', 'enemies', 0), on('hero-a', 'players', 0)]), [], testPack, 'en')
    expect(shown.map((fighter) => `${fighter.id} ${fighter.letter}`)).toEqual(['hero-a A', 'hero-b B', 'foe-1 A', 'foe-2 B'])
  })

  it('names a character by its nickname, and an enemy by its own or by its species', () => {
    const party = [newcomer({ id: 'hero-a', nickname: 'Volt' })]
    const enemies = [sheet('foe-1', { nickname: 'Old Rock' }), sheet('foe-2')]
    const shown = fightersOf(fight([on('hero-a', 'players', 0), on('foe-1', 'enemies', 0), on('foe-2', 'enemies', 1)], enemies), party, testPack, 'en')
    expect(shown.map((fighter) => fighter.name)).toEqual(['Volt', 'Old Rock', 'stonegolem'])
    expect(shown.map((fighter) => fighter.level)).toEqual([5, 10, 10])
  })

  it('tells a standing Pokémon from a downed one and from the empty place of one that is gone', () => {
    const shown = fightersOf(fight([on('a', 'players', 0), on('b', 'players', 1, { downed: true, stacks: 2 }), on('c', 'players', 2, { dead: true })]), [], testPack, 'en')
    expect(shown.map((fighter) => fighter.state)).toEqual(['standing', 'downed', 'gone'])
  })

  it('shows the species a Pokémon looks like now, and works its stats out from its own sheet', () => {
    const party = [newcomer({ id: 'hero-a', nature: 'bold', level: 20 })]
    const [transformed] = fightersOf(fight([on('hero-a', 'players', 0, { species: 'stonegolem' })]), party, testPack, 'en')
    expect(transformed?.species?.id).toBe('stonegolem')
    // Its own species' Defense, raised by its nature; not the Defense of what it turned into.
    const plain = fightersOf(fight([on('hero-a', 'players', 0)]), [newcomer({ id: 'hero-a', nature: 'plain', level: 20 })], testPack, 'en')[0]
    expect(transformed?.stats?.def).toBeGreaterThan(plain?.stats?.def ?? 0)
    expect(transformed?.stats?.spe).toBe(plain?.stats?.spe)
  })

  it('marks a Pokémon that carries stat changes', () => {
    const shown = fightersOf(fight([on('a', 'players', 0, { boosts: { atk: 2 } }), on('b', 'players', 1)]), [], testPack, 'en')
    expect(shown.map((fighter) => fighter.changed)).toEqual([true, false])
  })

  it('reaches, with a one-target move, the foes that face it and the allies beside it', () => {
    // Four against one: only the two in the middle face the lone foe.
    const shown = fightersOf(fight([on('a', 'players', 0), on('b', 'players', 1), on('c', 'players', 2), on('d', 'players', 3), on('foe', 'enemies', 0)]), [], testPack, 'en')
    const [a, b, c, d, foe] = shown
    if (!a || !b || !c || !d || !foe) throw new Error('Five were put on the field')
    expect([a, b, c, d].map((fighter) => reaches(fighter, foe, shown))).toEqual([false, true, true, false])
    expect(reaches(a, b, shown)).toBe(true)
    expect(reaches(a, c, shown)).toBe(false)
  })
})

describe('the timer as a clock shows it', () => {
  it('counts whole seconds up, in minutes and seconds', () => {
    expect(clockText(60_000)).toBe('1:00')
    expect(clockText(59_001)).toBe('1:00')
    expect(clockText(9_000)).toBe('0:09')
    expect(clockText(1)).toBe('0:01')
    expect(clockText(0)).toBe('0:00')
    expect(clockText(-500)).toBe('0:00')
  })
})
