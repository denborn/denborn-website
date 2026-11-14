// Probe 2: what the stock engine does when one Pokémon has more than one action
// in a round, and when a custom non-move action is queued at priority +1.
//
// Denborn needs both: the GM can give an enemy extra moves in a round, and a Bag
// action runs at priority +1 in Speed order.
import { Dex, toID } from '@pkmn/sim'
import { Battle } from '@pkmn/sim'
import { capture, heading, set } from './lib.mjs'

const BOSS_MOVES = ['tackle', 'hyperbeam', 'solarbeam', 'outrage', 'protect', 'fakeout', 'extremespeed', 'icywind']

/** The stock doubles format plus one handler, so a queued `event` action has something to run. */
function probeFormat() {
  const base = Dex.formats.get('gen9doublescustomgame')
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, {
    onDenbornProbe(pokemon) {
      this.add('-message', `EVENT ran for ${pokemon.name}`)
    },
  })
}

function scenario(seed = '1,2,3,4') {
  const battle = new Battle({ format: probeFormat(), seed })
  battle.setPlayer('p1', {
    name: 'P1',
    team: [
      set('Jolteon', 'Volt Absorb', ['quickattack', 'thunderbolt', 'fakeout', 'extremespeed', 'tackle', 'icywind']),
      set('Machamp', 'Guts', ['machpunch', 'tackle', 'bulkup']),
    ],
  })
  battle.setPlayer('p2', {
    name: 'P2',
    team: [set('Snorlax', 'Thick Fat', BOSS_MOVES), set('Chansey', 'Natural Cure', ['softboiled', 'tackle'])],
  })
  if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default')
  const [p1, p2] = battle.sides
  return { battle, p1, p2, fast: p1.active[0], slow: p1.active[1], boss: p2.active[0], aide: p2.active[1] }
}

/**
 * Plays one round. `plan.p1` and `plan.p2` list one entry per active Pokémon,
 * `[moveid, targetLoc]`. `plan.extra` lists actions appended after them.
 */
function round(s, plan) {
  const problems = []
  for (const [side, entries] of [
    [s.p1, plan.p1],
    [s.p2, plan.p2],
  ]) {
    for (const [moveid, loc] of entries) {
      if (!side.chooseMove(moveid, loc ?? 0)) problems.push(`${side.id} ${moveid}: ${side.choice.error}`)
    }
  }
  for (const action of plan.extra ?? []) action.pokemon.side.choice.actions.push(action)
  const { result, log } = capture(s.battle, () => s.battle.commitChoices())
  const shown = log.filter((line) =>
    /^\|(move|cant|-fail|-activate|-message|-start|-end|-miss|-singleturn|-prepare|-mustrecharge|faint|-status|-curestatus)\|/.test(
      line,
    ),
  )
  return { problems, thrown: typeof result === 'string' ? result : null, lines: shown }
}

function report(title, notes, outcome) {
  console.log(`### ${title}`)
  for (const problem of outcome.problems) console.log(`- choice refused: ${problem}`)
  if (outcome.thrown) console.log(`- ${outcome.thrown}`)
  for (const line of outcome.lines) console.log(`    ${line}`)
  for (const note of notes) console.log(`- ${note}`)
  console.log('')
}

const DEFAULT_P1 = [
  ['tackle', 1],
  ['tackle', 1],
]
const pp = (pokemon, moveid) => pokemon.moveSlots.find((slot) => slot.id === moveid)?.pp

heading('A. One Pokémon, two move actions in the same round')

{
  const s = scenario()
  const before = pp(s.boss, 'tackle')
  const outcome = round(s, {
    p1: DEFAULT_P1,
    p2: [['tackle', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Healthy: Tackle, then an extra Tackle', [`Tackle PP ${before} -> ${pp(s.boss, 'tackle')}`], outcome)
}

{
  const s = scenario()
  s.boss.setStatus('slp')
  const before = s.boss.statusState.time
  const outcome = round(s, {
    p1: DEFAULT_P1,
    p2: [['tackle', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report(
    'Asleep: two actions',
    [`sleep turns left ${before} -> ${s.boss.status === 'slp' ? s.boss.statusState.time : 'awake'}`],
    outcome,
  )
}

{
  const s = scenario()
  s.boss.addVolatile('confusion')
  const before = s.boss.volatiles.confusion?.time
  const outcome = round(s, {
    p1: DEFAULT_P1,
    p2: [['tackle', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Confused: two actions', [`confusion turns left ${before} -> ${s.boss.volatiles.confusion?.time ?? 'ended'}`], outcome)
}

{
  const s = scenario()
  const outcome = round(s, {
    p1: [
      ['fakeout', 1],
      ['bulkup', 0],
    ],
    p2: [['tackle', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Flinched by a faster Fake Out: two actions', [], outcome)
}

{
  const s = scenario()
  const outcome = round(s, {
    p1: DEFAULT_P1,
    p2: [['protect'], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 1 }],
  })
  report('Protect, then an extra Tackle (both foes attack the boss)', [], outcome)
}

{
  const s = scenario()
  const outcome = round(s, {
    p1: DEFAULT_P1,
    p2: [['tackle', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('fakeout'), targetLoc: 2 }],
  })
  report('Tackle, then Fake Out as the extra action (first round on the field)', [], outcome)
}

{
  const s = scenario()
  const first = round(s, {
    p1: DEFAULT_P1,
    p2: [['hyperbeam', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Hyper Beam, then an extra Tackle in the same round', [`volatiles after: ${Object.keys(s.boss.volatiles).join(',') || '-'}`], first)
  const moves = s.boss.getMoveRequestData().moves.map((m) => `${m.id}${m.disabled ? '(disabled)' : ''}`)
  const second = round(s, {
    p1: DEFAULT_P1,
    p2: [['recharge', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Next round: must recharge, plus an extra Tackle', [`moves offered: ${moves.join(', ')}`], second)
}

{
  const s = scenario()
  const first = round(s, {
    p1: DEFAULT_P1,
    p2: [['solarbeam', 1], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('tackle'), targetLoc: 2 }],
  })
  report('Solar Beam (charging), then an extra Tackle in the same round', [`volatiles after: ${Object.keys(s.boss.volatiles).join(',') || '-'}`], first)
  const moves = s.boss.getMoveRequestData().moves.map((m) => `${m.id}${m.disabled ? '(disabled)' : ''}`)
  report('Next round, moves offered', [moves.join(', ')], { problems: [], thrown: null, lines: [] })
}

{
  const s = scenario()
  const first = round(s, {
    p1: DEFAULT_P1,
    p2: [['outrage'], ['softboiled']],
    extra: [{ choice: 'move', pokemon: s.boss, moveid: toID('outrage') }],
  })
  report(
    'Outrage twice in one round',
    [`locked-move turns left: ${s.boss.volatiles.lockedmove?.duration ?? 'not locked'}`],
    first,
  )
  const offered = s.boss.getMoveRequestData().moves.map((m) => m.id)
  const second = round(s, { p1: DEFAULT_P1, p2: [['tackle', 1], ['softboiled']] })
  report('Next round: asking for Tackle while locked into Outrage', [`moves offered: ${offered.join(', ')}`], second)
}

{
  let mainFirst = 0
  const seeds = 40
  for (let i = 1; i <= seeds; i++) {
    // Seeds spread over the 16-bit range.
    const s = scenario([7919, 104729, 1299709, 15485863].map((prime) => (i * prime) % 65536).join(','))
    s.p1.chooseMove('thunderbolt', 2)
    s.p1.chooseMove('bulkup')
    s.p2.chooseMove('tackle', 1)
    s.p2.chooseMove('softboiled')
    s.p2.choice.actions.push({ choice: 'move', pokemon: s.boss, moveid: toID('icywind'), targetLoc: 1 })
    const { result, log } = capture(s.battle, () => s.battle.commitChoices())
    if (typeof result === 'string') throw new Error(result)
    const bossMoves = log.filter((l) => l.startsWith('|move|p2a: Snorlax|'))
    if (bossMoves[0]?.includes('|Tackle|')) mainFirst++
  }
  console.log('### Order of one Pokémon\'s two same-priority moves (Tackle entered first, Icy Wind second)')
  console.log(`- Tackle went first in ${mainFirst} of ${seeds} seeded rounds`)
  console.log('')
}

heading('B. A custom action queued at priority +1')

function eventFor(pokemon) {
  return { choice: 'event', event: 'DenbornProbe', pokemon, priority: 1 }
}

{
  // Jolteon: Extreme Speed (+2). Machamp: Mach Punch (+1). Snorlax: the event (+1). Chansey: Tackle (0).
  const s = scenario()
  s.p1.chooseMove('extremespeed', 2)
  s.p1.chooseMove('machpunch', 2)
  s.p2.choice.actions.push(eventFor(s.boss))
  s.p2.chooseMove('tackle', 1)
  const { result, log } = capture(s.battle, () => s.battle.commitChoices())
  console.log('### Slow Pokémon (Snorlax) holds the event; a faster +1 move and a +2 move are also queued')
  if (typeof result === 'string') console.log(`- ${result}`)
  for (const line of log.filter((l) => /^\|(move|-message)\|/.test(l))) console.log(`    ${line}`)
  console.log(`- input log entry: ${s.battle.inputLog.at(-1)}`)
  console.log('')
}

{
  // Jolteon holds the event; Machamp uses Mach Punch (+1); Snorlax and Chansey use Tackle (0).
  const s = scenario()
  s.p1.choice.actions.push(eventFor(s.fast))
  s.p1.chooseMove('machpunch', 2)
  s.p2.chooseMove('tackle', 1)
  s.p2.chooseMove('tackle', 1)
  const { result, log } = capture(s.battle, () => s.battle.commitChoices())
  console.log('### Fast Pokémon (Jolteon) holds the event; its slower ally uses a +1 move')
  if (typeof result === 'string') console.log(`- ${result}`)
  for (const line of log.filter((l) => /^\|(move|-message)\|/.test(l))) console.log(`    ${line}`)
  console.log('')
}

{
  // The event holder's Speed drops earlier in the same round: Jolteon (event) is hit by
  // a +2... no such move lowers Speed, so lower it before the round with Icy Wind's effect.
  const s = scenario()
  s.battle.boost({ spe: -6 }, s.fast)
  s.p1.choice.actions.push(eventFor(s.fast))
  s.p1.chooseMove('machpunch', 2)
  s.p2.chooseMove('tackle', 1)
  s.p2.chooseMove('tackle', 1)
  const { log } = capture(s.battle, () => s.battle.commitChoices())
  console.log('### Same, but the event holder is at -6 Speed: it should now act after its ally in the +1 bracket')
  for (const line of log.filter((l) => /^\|(move|-message)\|/.test(l))) console.log(`    ${line}`)
  console.log('')
}

{
  // Under Trick Room the slower Pokémon acts first inside a bracket.
  const s = scenario()
  s.battle.field.addPseudoWeather('trickroom', s.boss)
  s.p1.choice.actions.push(eventFor(s.fast))
  s.p1.chooseMove('machpunch', 2)
  s.p2.chooseMove('tackle', 1)
  s.p2.chooseMove('tackle', 1)
  const { log } = capture(s.battle, () => s.battle.commitChoices())
  console.log('### Under Trick Room: the faster event holder should act after the slower +1 move')
  for (const line of log.filter((l) => /^\|(move|-message)\|/.test(l))) console.log(`    ${line}`)
  console.log('')
}
