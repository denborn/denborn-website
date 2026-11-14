import { readFileSync } from 'node:fs'
import { Battle, type PokemonSet, toID } from '@pkmn/sim'
import { describe, expect, it } from 'vitest'

const ROOT = new URL('../../', import.meta.url)

function readJson(path: string): { version: string; dependencies: Record<string, string> } {
  return JSON.parse(readFileSync(new URL(path, ROOT), 'utf8')) as {
    version: string
    dependencies: Record<string, string>
  }
}

const ENGINE_PACKAGES = ['@pkmn/sim', '@pkmn/dex', '@pkmn/data'] as const

describe('engine packages', () => {
  // Owner rule: the three packages are always upgraded together, to one exact version.
  it('are pinned to one exact version and installed at that version', () => {
    const pinned = readJson('package.json').dependencies
    const pins = ENGINE_PACKAGES.map((name) => pinned[name])
    const installed = ENGINE_PACKAGES.map((name) => readJson(`node_modules/${name}/package.json`).version)

    expect(new Set(pins).size, `pins differ: ${pins.join(', ')}`).toBe(1)
    expect(pins[0]).toMatch(/^\d+\.\d+\.\d+$/)
    expect(installed).toEqual(pins)
  })
})

function set(species: string, ability: string, moves: string[]): PokemonSet {
  return {
    name: species,
    species,
    item: '',
    ability,
    moves,
    nature: 'Hardy',
    gender: 'M',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
  }
}

/** Plays a whole battle with default choices and returns its log without wall-clock lines. */
function playToEnd(seed: `${number},${number},${number},${number}`): string[] {
  const battle = new Battle({ formatid: toID('gen9customgame'), seed })
  // Inaccurate moves, so the outcome depends on the random number stream.
  battle.setPlayer('p1', { name: 'One', team: [set('Pikachu', 'Static', ['thunder', 'irontail'])] })
  battle.setPlayer('p2', { name: 'Two', team: [set('Squirtle', 'Torrent', ['hydropump', 'megakick'])] })
  for (let turn = 0; !battle.ended && turn < 200; turn++) battle.makeChoices()
  expect(battle.ended, 'battle did not finish').toBe(true)
  return battle.log.filter((line) => !line.startsWith('|t:|'))
}

describe('engine determinism', () => {
  // Saving and resuming a battle relies on this: the same seed and the same inputs
  // must always produce the same battle, in this toolchain.
  it('replays the same battle from the same seed', () => {
    expect(playToEnd('1,2,3,4')).toEqual(playToEnd('1,2,3,4'))
  })

  it('produces a different battle from a different seed', () => {
    expect(playToEnd('1,2,3,4')).not.toEqual(playToEnd('4,3,2,1'))
  })
})
