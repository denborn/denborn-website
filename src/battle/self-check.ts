/**
 * A short battle the GM's device can run to check that the engine works there.
 *
 * It is loaded on demand, like every use of the engine: the page that players
 * open never downloads it up front.
 */
import { type CombatantSetup, DenbornBattle } from './denborn-battle'
import { ENGINE_VERSION } from './versions'

const STATS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const NONE = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

function fighter(id: string, species: string, ability: string, agony: boolean): CombatantSetup {
  return {
    id,
    species,
    level: 50,
    gender: 'N',
    ability,
    nature: 'Hardy',
    ivs: STATS,
    evs: NONE,
    moves: [{ id: 'tackle' }],
    agony,
  }
}

export interface SelfCheckResult {
  engineVersion: string
  rounds: number
}

/** Plays a fixed one-on-one fight to its end and throws if the engine does not get there. */
export function runEngineSelfCheck(): SelfCheckResult {
  const battle = DenbornBattle.start({
    seed: '1,2,3,4',
    players: [fighter('player', 'Pikachu', 'Static', true)],
    enemies: [fighter('enemy', 'Rattata', 'Guts', false)],
  })
  for (let round = 0; round < 100 && !battle.ended; round++) {
    battle.resolveRound({
      actions: {
        player: { type: 'move', move: 'tackle', target: 'enemy' },
        enemy: { type: 'move', move: 'tackle', target: 'player' },
      },
    })
  }
  if (!battle.ended) throw new Error('The check battle did not finish')
  return { engineVersion: ENGINE_VERSION, rounds: battle.round }
}
