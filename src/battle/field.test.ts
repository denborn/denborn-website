import { describe, expect, it } from 'vitest'
import { enemy, move, player, round, start } from './test-kit'

describe('what is in effect on the battlefield', () => {
  it('is nothing when the fight begins', () => {
    const battle = start([player('one', 'Machamp', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])])
    expect(battle.field()).toEqual({ rooms: [], sides: { players: [], enemies: [] }, pokemon: { one: [], foe: [] } })
  })

  it('names the weather, the terrain and the rooms, with the turns each has left', () => {
    const battle = start(
      [player('one', 'Machamp', ['raindance']), player('two', 'Jolteon', ['electricterrain'])],
      [enemy('foe', 'Chansey', ['trickroom'])],
    )
    round(battle, { one: move('raindance'), two: move('electricterrain'), foe: move('trickroom') })
    const first = battle.field()
    expect(first).toMatchObject({ weather: { id: 'raindance' }, terrain: { id: 'electricterrain' }, rooms: [{ id: 'trickroom' }] })
    const turns = [first.weather?.turns, first.terrain?.turns, first.rooms[0]?.turns]
    expect(turns.every((left) => left !== undefined && left >= 1 && left <= 5)).toBe(true)

    round(battle)
    const second = battle.field()
    expect([second.weather?.turns, second.terrain?.turns, second.rooms[0]?.turns]).toEqual(turns.map((left) => (left ?? 0) - 1))
  })

  it('tells each side\'s conditions apart, with the layers of what is laid several times', () => {
    const battle = start([player('one', 'Machamp', ['reflect'])], [enemy('foe', 'Chansey', ['spikes'])])
    round(battle, { one: move('reflect'), foe: move('spikes') })
    round(battle, { foe: move('spikes') })
    const { sides } = battle.field()
    // The enemy's Spikes lie on the players' side, beside the players' own Reflect.
    expect(sides.players).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'reflect' }), { id: 'spikes', layers: 2 }]))
    expect(sides.players.find((effect) => effect.id === 'reflect')?.turns).toBeGreaterThan(0)
    expect(sides.enemies).toEqual([])
  })

  it('tells what sits on one Pokémon, and nothing of one that is down', () => {
    const battle = start([player('one', 'Venusaur', ['leechseed']), player('two', 'Machamp', ['tackle'], { hp: 1 })], [enemy('foe', 'Chansey', ['tackle'])])
    round(battle, { one: move('leechseed', 'foe'), foe: move('tackle', 'two') })
    const { pokemon } = battle.field()
    expect(pokemon.foe).toEqual(expect.arrayContaining([{ id: 'leechseed' }]))
    expect(pokemon.one).toEqual([])
    expect(pokemon).not.toHaveProperty('two')
  })
})
