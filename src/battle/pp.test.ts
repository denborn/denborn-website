/**
 * A move's maximum PP on the sheet must be the engine's: the app computes it
 * with src/game-rules/pp.ts, the engine with its own formula when a battle
 * starts. Every move of the engine is compared, at every number of PP Ups.
 */
import { Battle, Dex, toID } from '@pkmn/sim'
import { expect, it } from 'vitest'
import { PP_UPS_MAX, maxPp } from '../game-rules/pp'

it('maximum PP: the app and the engine agree for every move and every number of PP Ups', () => {
  const battle = new Battle({ formatid: toID('gen9customgame') })
  const moves = Dex.moves.all()
  expect(moves.length).toBeGreaterThan(0)
  for (const move of moves) {
    for (let ppUps = 0; ppUps <= PP_UPS_MAX; ppUps++) {
      expect(maxPp(move.pp, ppUps, Boolean(move.noPPBoosts)), `${move.name} with ${ppUps} PP Ups`).toBe(battle.calculatePP(move, ppUps))
    }
  }
})
