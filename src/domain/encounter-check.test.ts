import { describe, expect, it } from 'vitest'
import type { DataPack } from '../data/types'
import type { Encounter, Enemy } from '../shared/schema/encounter'
import { encounter as encounterSchema } from '../shared/schema/encounter'
import { checkEncounter, checkEnemy } from './encounter-check'
import { rewardDefaults } from './rewards'
import { newcomer, testPack, testRules } from './test-pack'

/** A golem the test rules allow: level 20, nothing spent, one move of its species. */
const golem = (changes: Partial<Enemy> = {}): Enemy => ({
  id: 'enemy-0001',
  species: 'stonegolem',
  gender: 'N',
  level: 20,
  nature: 'bold',
  ability: 'sturdy',
  ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [{ id: 'tackle', ppUps: 0 }],
  agony: false,
  class: 'minion',
  ...changes,
})

const fight = (changes: Partial<Encounter> = {}): Encounter => ({ id: 'encounter-0001', name: 'The quarry', enemies: [golem()], bag: [], ...changes })

/** The test pack's species and items, which the tests below change one of. */
const { sparkmouse, stonegolem } = testPack.species
const { potion } = testPack.items
if (!sparkmouse || !stonegolem || !potion) throw new Error('The test pack lost a species or an item these tests stand on')

/** The test pack with one item that works from the Bag. */
const pack: DataPack = { ...testPack, items: { ...testPack.items, potion: { ...potion, bag: { heal: 20 } } } }

describe('an enemy', () => {
  it('is built under the same rules as a character', () => {
    expect(checkEnemy(golem(), testRules(), testPack)).toEqual([])
    expect(checkEnemy(golem({ ability: 'zap' }), testRules(), testPack)).toEqual([{ kind: 'ability' }])
    // Level 20 gives 62 TV.
    expect(checkEnemy(golem({ ivs: { hp: 31, atk: 31, def: 1, spa: 0, spd: 0, spe: 0 } }), testRules(), testPack)).toEqual([{ kind: 'training', problem: { kind: 'over-budget', by: 1 } }])
    expect(checkEnemy(golem({ moves: [{ id: 'spark', ppUps: 0 }] }), testRules(), testPack)).toEqual([{ kind: 'move-not-eligible', move: 'spark' }])
    expect(checkEnemy(golem({ nature: undefined }), testRules({ natures: 'neutral' }), testPack)).toEqual([])
  })

  it('may be of any species the game data has, playable in the campaign or not', () => {
    expect(checkEnemy(golem(), testRules({ species: ['sparkmouse'] }), testPack)).toEqual([])
  })

  it('goes by its species’ name, or by a name that follows the rules of names', () => {
    expect(checkEnemy(golem({ nickname: 'Old Stone' }), testRules(), testPack)).toEqual([])
    expect(checkEnemy(golem({ nickname: ' Old Stone' }), testRules(), testPack)).toEqual([{ kind: 'nickname', problem: 'untidy' }])
  })
})

describe('an encounter', () => {
  it('says which enemy on the line is wrong, and what is wrong with it', () => {
    const problems = checkEncounter(fight({ enemies: [golem(), golem({ id: 'enemy-0002', gender: 'F' })] }), testRules(), testPack)
    expect(problems).toEqual([{ kind: 'enemy', at: 1, problem: { kind: 'gender' } }])
  })

  it('needs each enemy to be told from the others', () => {
    expect(checkEncounter(fight({ enemies: [golem(), golem()] }), testRules(), testPack)).toEqual([{ kind: 'repeated-enemy', id: 'enemy-0001' }])
  })

  it('takes in its Bag only items that do something from a Bag, each once', () => {
    expect(checkEncounter(fight({ bag: [{ item: 'potion', quantity: 3 }] }), testRules(), pack)).toEqual([])
    expect(checkEncounter(fight({ bag: [{ item: 'rope', quantity: 1 }, { item: 'gem', quantity: 1 }, { item: 'potion', quantity: 1 }, { item: 'potion', quantity: 2 }] }), testRules(), pack)).toEqual([
      { kind: 'not-a-bag-item', item: 'rope' },
      { kind: 'unknown-item', item: 'gem' },
      { kind: 'repeated-item', item: 'potion' },
    ])
  })

  it('holds one to six enemies', () => {
    const line = (count: number) => encounterSchema.safeParse(fight({ enemies: Array.from({ length: count }, (_, index) => golem({ id: `enemy-000${index}` })) })).success
    expect([0, 1, 6, 7].map(line)).toEqual([false, true, true, false])
  })
})

describe('what an encounter is worth', () => {
  /** A mouse that evolves at level 16 into the golem, for the test. */
  const evolving: DataPack = { ...testPack, species: { ...testPack.species, sparkmouse: { ...sparkmouse, evolutions: [{ to: 'stonegolem', method: 'level', level: 16 }] } } }
  const hero = (id: string, level: number) => newcomer({ id, level })

  it('gives each character its own EXP by its level, a fifth more once it could have evolved, and the same Pokédollars to all', () => {
    const boss = fight({ enemies: [golem({ class: 'boss' }), golem({ id: 'enemy-0002', level: 10 })] })
    const worth = rewardDefaults(boss, [hero('hero-low-01', 10), hero('hero-high-1', 15), hero('hero-ready-1', 16)], evolving)
    // Base EXP 50 in the test pack: the level 20 enemy is worth 200 before the levels are weighed, the level 10 one 100.
    expect(worth.money).toBe(20 * 120 + 10 * 16)
    expect(worth.exp['hero-low-01']).toBeGreaterThan(worth.exp['hero-high-1'] ?? 0)
    // One level apart, the higher earns less from the levels; the bonus for not having evolved more than makes up for it.
    expect(worth.exp['hero-ready-1']).toBeGreaterThan(worth.exp['hero-high-1'] ?? 0)
    expect(Object.keys(worth.exp)).toEqual(['hero-low-01', 'hero-high-1', 'hero-ready-1'])
  })

  it('counts a way of evolving that is not by level for nothing', () => {
    const byItem: DataPack = { ...testPack, species: { ...testPack.species, sparkmouse: { ...sparkmouse, evolutions: [{ to: 'stonegolem', method: 'item', item: 'rope' }] } } }
    expect(rewardDefaults(fight(), [hero('hero-item-01', 50)], byItem).exp).toEqual(rewardDefaults(fight(), [hero('hero-item-01', 50)], testPack).exp)
  })
})
