/**
 * The sheet's stats must be the battle's stats. The app computes them with
 * src/game-rules/stats.ts; the engine computes its own when a battle starts.
 * This test builds Pokémon at random and requires the two to agree exactly.
 */
import { Battle, Dex, type PokemonSet, toID } from '@pkmn/sim'
import { describe, expect, it } from 'vitest'
import { STAT_IDS, type StatSpread, computeStats } from '../game-rules/stats'

/** A small seeded generator, so that a failure can be reproduced. */
function generator(seed: number): (below: number) => number {
  let state = seed
  return (below) => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state % below
  }
}

const species = Dex.species.all().filter((entry) => entry.num >= 1 && entry.num <= 151 && !entry.forme)
const natures = Dex.natures.all()

describe('stats: the app and the engine agree', () => {
  it('for 300 random Pokémon of the first 151, at any level, with any points and nature', () => {
    const random = generator(20261114)
    for (let round = 0; round < 300; round++) {
      const chosen = species[random(species.length)]
      const nature = natures[random(natures.length)]
      if (!chosen || !nature) throw new Error('nothing to pick from')
      const level = 1 + random(100)
      const spread = (max: number): StatSpread => ({ hp: random(max + 1), atk: random(max + 1), def: random(max + 1), spa: random(max + 1), spd: random(max + 1), spe: random(max + 1) })
      const ivs = spread(31)
      const evs = spread(252)
      const set: PokemonSet = {
        name: chosen.name,
        species: chosen.name,
        item: '',
        ability: chosen.abilities[0],
        moves: ['splash'],
        nature: nature.name,
        gender: '',
        evs,
        ivs,
        level,
      }
      const battle = new Battle({ formatid: toID('gen9customgame'), seed: '1,2,3,4' })
      battle.setPlayer('p1', { name: 'P1', team: [set] })
      battle.setPlayer('p2', { name: 'P2', team: [set] })
      const pokemon = battle.p1.pokemon[0]
      if (!pokemon) throw new Error('the engine made no Pokémon')
      const engine: StatSpread = { hp: pokemon.maxhp, ...pokemon.storedStats }
      const effect = nature.plus && nature.minus ? { plus: nature.plus, minus: nature.minus } : {}
      const ours = computeStats({ baseStats: chosen.baseStats, ivs, evs, level, nature: effect })
      // On a mismatch the message names the build, so it can be replayed by hand.
      expect(ours, `${chosen.name} L${level} ${nature.name} ${STAT_IDS.map((stat) => `${stat} ${ivs[stat]}/${evs[stat]}`).join(' ')}`).toEqual(engine)
    }
  })
})
