// Probe 1: what the stock engine does when a move is run against a fainted target.
//
// The stock engine never does this by itself (it drops fainted Pokémon when it
// picks targets), so each case hands the fainted Pokémon to the engine directly.
// Denborn needs it because a downed Pokémon stays hittable (Agony rule 4).
import { capture, doubles, faintNow, heading, row, set, show } from './lib.mjs'

const ATTACKER_MOVES = [
  'tackle',
  'earthquake',
  'thunderbolt',
  'thunder',
  'highjumpkick',
  'hyperbeam',
  'doubleedge',
  'gigadrain',
  'closecombat',
  'knockoff',
  'surf',
  'toxic',
]

function scenario({ victim, attackerItem = '', seed = '1,2,3,4' } = {}) {
  const battle = doubles(
    [
      set('Mew', 'Synchronize', ATTACKER_MOVES, { item: attackerItem }),
      set('Chansey', 'Natural Cure', ['softboiled']),
    ],
    [victim ?? set('Snorlax', 'Thick Fat', ['tackle']), set('Blastoise', 'Torrent', ['wideguard', 'tackle'])],
    seed,
  )
  const [p1, p2] = battle.sides
  return { battle, attacker: p1.active[0], ally: p1.active[1], victim: p2.active[0], other: p2.active[1], p2 }
}

const STEPS = [
  'hitStepInvulnerabilityEvent',
  'hitStepTryHitEvent',
  'hitStepTypeImmunity',
  'hitStepTryImmunity',
  'hitStepAccuracy',
]

function runSteps(label, moveId, options = {}) {
  const s = scenario(options)
  if (!options.keepStanding) faintNow(s.battle, s.victim)
  options.before?.(s)
  const move = s.battle.dex.getActiveMove(moveId)
  s.battle.setActiveMove(move, s.attacker, s.victim)
  for (const step of STEPS) {
    const { result, log } = capture(s.battle, () => s.battle.actions[step]([s.victim], s.attacker, move))
    row(label, moveId, step.replace('hitStep', ''), show(result), log.join(' ') || '-')
  }
}

heading('A. Each hit step, handed a fainted target (results are per target: true passes, false stops)')
row('target', 'move', 'step', 'result', 'log lines')
row('---', '---', '---', '---', '---')
runSteps('standing Koffing (Levitate)', 'earthquake', {
  victim: set('Koffing', 'Levitate', ['tackle']),
  keepStanding: true,
})
runSteps('fainted Koffing (Levitate)', 'earthquake', { victim: set('Koffing', 'Levitate', ['tackle']) })
runSteps('fainted Sandshrew (Ground type)', 'thunderbolt', { victim: set('Sandshrew', 'Sand Veil', ['tackle']) })
runSteps('fainted Gastly (Ghost type)', 'tackle', { victim: set('Gastly', 'Levitate', ['lick']) })
runSteps('fainted Snorlax', 'toxic')
runSteps('fainted Snorlax, its side under Wide Guard', 'earthquake', {
  before: (s) => s.p2.addSideCondition('wideguard', s.other),
})
runSteps('fainted Snorlax, its side under Wide Guard', 'tackle', {
  before: (s) => s.p2.addSideCondition('wideguard', s.other),
})
runSteps('fainted Snorlax, its side under Quick Guard', 'tackle', {
  before: (s) => {
    s.p2.addSideCondition('quickguard', s.other)
  },
})

heading('B. Accuracy step against a fainted target, 2000 rolls of Thunder (70% accurate)')
{
  const s = scenario()
  faintNow(s.battle, s.victim)
  const move = s.battle.dex.getActiveMove('thunder')
  s.battle.setActiveMove(move, s.attacker, s.victim)
  let hits = 0
  const rolls = 2000
  for (let i = 0; i < rolls; i++) {
    if (s.battle.actions.hitStepAccuracy([s.victim], s.attacker, move)[0]) hits++
  }
  console.log(`hits: ${hits} of ${rolls} (${((100 * hits) / rolls).toFixed(1)}%)`)
}

/**
 * Uses a whole move with the engine's target picking bypassed, so the fainted
 * Pokémon really is the target. Reports what happened to the user.
 */
function wholeMove(label, moveId, options = {}) {
  const s = scenario(options)
  faintNow(s.battle, s.victim)
  options.before?.(s)
  const targets = options.alsoStanding ? [s.victim, s.other] : [s.victim]
  s.attacker.getMoveTargets = () => ({ targets, pressureTargets: [] })
  const hpBefore = s.attacker.hp
  const otherBefore = s.other.hp
  const { result, log } = capture(s.battle, () => s.battle.actions.useMove(moveId, s.attacker, { target: s.victim }))
  const boosts = Object.entries(s.attacker.boosts)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
  row(
    label,
    moveId,
    show(result),
    String(s.attacker.hp - hpBefore),
    Object.keys(s.attacker.volatiles).join(',') || '-',
    boosts.join(',') || '-',
    options.alsoStanding ? String(s.other.hp - otherBefore) : '-',
    log.join(' '),
  )
}

heading('C. A whole move whose only target is fainted (target picking bypassed)')
row('case', 'move', 'useMove returns', 'user HP change', 'user volatiles', 'user boosts', 'standing foe HP change', 'log lines')
row('---', '---', '---', '---', '---', '---', '---', '---')
wholeMove('plain damaging move', 'tackle')
wholeMove('user holds Life Orb', 'tackle', { attackerItem: 'Life Orb' })
wholeMove('crash-on-miss move', 'highjumpkick')
wholeMove('recharge move', 'hyperbeam')
wholeMove('recoil move', 'doubleedge')
wholeMove('draining move', 'gigadrain')
wholeMove('move that lowers the user', 'closecombat')
wholeMove('item-removing move', 'knockoff', { victim: set('Snorlax', 'Thick Fat', ['tackle'], { item: 'Leftovers' }) })
wholeMove('status move', 'toxic')
wholeMove('immune type', 'thunderbolt', { victim: set('Sandshrew', 'Sand Veil', ['tackle']) })

heading('D. A spread move with one fainted and one standing target (target picking bypassed)')
row('case', 'move', 'useMove returns', 'user HP change', 'user volatiles', 'user boosts', 'standing foe HP change', 'log lines')
row('---', '---', '---', '---', '---', '---', '---', '---')
wholeMove('fainted + standing', 'surf', { alsoStanding: true })
{
  // Reference: the same Surf against the standing foe alone, same seed.
  const s = scenario()
  faintNow(s.battle, s.victim)
  s.attacker.getMoveTargets = () => ({ targets: [s.other], pressureTargets: [] })
  const before = s.other.hp
  const { result, log } = capture(s.battle, () => s.battle.actions.useMove('surf', s.attacker, { target: s.other }))
  row('standing alone (reference)', 'surf', show(result), '0', '-', '-', String(s.other.hp - before), log.join(' '))
}
