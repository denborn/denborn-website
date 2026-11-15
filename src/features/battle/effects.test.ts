import { describe, expect, it } from 'vitest'
import type { FieldView } from '../../battle/contract'
import { type EffectWords, effectsOf, groundOf } from './effects'
import type { Fighter } from './fighters'

// Made-up effects: the games' own names come from the generated texts, which the tests do not read.
const state = (name: string) => ({ name: { en: name, fr: `${name} (fr)` }, text: { en: `${name} does this.`, fr: `${name} fait ceci.` } })
const words: EffectWords = {
  language: 'en',
  states: { raindance: state('Rain'), electricterrain: state('Electric Terrain'), room: state('Room'), wall: state('Wall'), thorns: state('Thorns'), seeded: state('Seeded') },
  own: {},
  statName: (stat) => stat.toUpperCase(),
  turnsLeft: (turns) => `${turns} left`,
  scope: { field: 'Field', foes: 'Foes', party: 'Party' },
  slot: (letter, name) => `${letter}: ${name}`,
}
const fighter = (id: string, side: Fighter['side'], position: number, boosts: Record<string, number> = {}, state: Fighter['state'] = 'standing'): Fighter =>
  ({ id, side, position, letter: 'ABCDEF'.charAt(position), name: id, state, now: { boosts } }) as Fighter
const empty: FieldView = { rooms: [], sides: { players: [], enemies: [] }, pokemon: {} }

describe('the ground and the sky on the plan', () => {
  it('names the terrain, then the weather, each in a type\'s colours', () => {
    expect(groundOf({ ...empty, weather: { id: 'raindance', turns: 3 }, terrain: { id: 'electricterrain' } }, words)).toEqual([
      { id: 'electricterrain', type: 'Electric', name: 'Electric Terrain' },
      { id: 'raindance', type: 'Water', name: 'Rain' },
    ])
    expect(groundOf(empty, words)).toEqual([])
  })
})

describe('everything in effect', () => {
  it('lists the field, the foes\' side, the party\'s, then each Pokémon\'s own, the foes first', () => {
    const field: FieldView = {
      weather: { id: 'raindance', turns: 3 },
      rooms: [{ id: 'room', turns: 2 }],
      sides: { players: [{ id: 'thorns', layers: 2 }], enemies: [{ id: 'wall', turns: 4 }] },
      pokemon: { foe: [{ id: 'seeded' }], hero: [] },
    }
    const listed = effectsOf(field, [fighter('hero', 'players', 1, { atk: 2, spe: -1 }), fighter('foe', 'enemies', 0)], words)
    expect(listed.map((effect) => `${effect.scope} ${effect.letter ?? '-'} ${effect.name} [${effect.lasting ?? ''}]`)).toEqual([
      'field - Rain [3 left]',
      'field - Room [2 left]',
      'foes - Wall [4 left]',
      'party - Thorns ×2 []',
      'foes A Seeded []',
      'party B ATK +2 · SPE -1 []',
    ])
    expect(listed[4]).toMatchObject({ scopeText: 'Foes, A: foe', description: 'Seeded does this.' })
    expect(new Set(listed.map((effect) => effect.id)).size).toBe(listed.length)
  })

  it('leaves out what the games have no name for, and the Pokémon that are gone', () => {
    const field: FieldView = { ...empty, rooms: [{ id: 'bookkeeping' }], pokemon: { foe: [{ id: 'bookkeeping' }, { id: 'seeded' }], gone: [{ id: 'seeded' }] } }
    const listed = effectsOf(field, [fighter('foe', 'enemies', 0), fighter('gone', 'enemies', 1, { atk: 1 }, 'gone')], words)
    expect(listed.map((effect) => effect.name)).toEqual(['Seeded'])
  })

  it('says what an effect does in Denborn\'s own words where it has some', () => {
    const field: FieldView = { ...empty, sides: { players: [{ id: 'wall' }, { id: 'thorns' }], enemies: [] } }
    const listed = effectsOf(field, [], { ...words, own: { wall: 'Here, a wall cuts by a third.' } })
    expect(listed.map((effect) => effect.description)).toEqual(['Here, a wall cuts by a third.', 'Thorns does this.'])
  })

  it('speaks the language asked for', () => {
    expect(effectsOf({ ...empty, rooms: [{ id: 'room' }] }, [], { ...words, language: 'fr' })).toMatchObject([{ name: 'Room (fr)', description: 'Room fait ceci.' }])
  })
})
