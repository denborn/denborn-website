// Shared helpers for the stock-engine probes.
//
// The probes are diagnostics, not tests: they print what the unmodified
// @pkmn/sim does in situations Denborn's rules create, so the owner can rule on
// each case and so an engine upgrade can be compared against the last run.
// Run one with:  node scripts/engine-probes/<name>.mjs
import { Battle, toID } from '@pkmn/sim'

export function set(species, ability, moves, extra = {}) {
  return {
    name: species,
    species,
    item: '',
    ability,
    moves,
    nature: 'Hardy',
    gender: 'N',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
    ...extra,
  }
}

/** A stock Gen 9 doubles battle, advanced past team preview to the first move request. */
export function doubles(p1, p2, seed = '1,2,3,4', formatid = 'gen9doublescustomgame') {
  const battle = new Battle({ formatid: toID(formatid), seed })
  battle.setPlayer('p1', { name: 'P1', team: p1 })
  battle.setPlayer('p2', { name: 'P2', team: p2 })
  if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default')
  return battle
}

/** Faints a Pokémon through the engine's own pipeline, outside any move. */
export function faintNow(battle, pokemon) {
  pokemon.faint()
  battle.resolveFaints()
}

/** Runs `fn` and returns its result together with the log lines it produced. */
export function capture(battle, fn) {
  const before = battle.log.length
  let result
  try {
    result = fn()
  } catch (error) {
    result = `THROWS ${error instanceof Error ? error.message : String(error)}`
  }
  return { result, log: battle.log.slice(before).filter((line) => !line.startsWith('|t:|') && line !== '|') }
}

export function show(value) {
  return JSON.stringify(value, (_key, v) => (v === undefined ? '(undefined)' : v))
}

export function heading(text) {
  console.log(`\n## ${text}\n`)
}

export function row(...cells) {
  console.log(`| ${cells.join(' | ')} |`)
}
