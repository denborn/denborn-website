// Probe 3: does saving and restoring the engine's state every turn give exactly
// the same battle as never interrupting it?
//
// Denborn saves an unfinished battle and must resume it without rerolling
// anything. The engine's own input log cannot replay Denborn's custom actions,
// so the save has to be a state snapshot (Battle.toJSON / Battle.fromJSON).
import { Battle, Dex, toID } from '@pkmn/sim'
import { heading, set } from './lib.mjs'

const TEAMS = [
  [
    [
      set('Venusaur', 'Overgrow', ['leechseed', 'solarbeam', 'toxic', 'protect', 'sludgebomb', 'sunnyday']),
      set('Snorlax', 'Thick Fat', ['bodyslam', 'rest', 'yawn', 'curse', 'substitute', 'earthquake']),
    ],
    [
      set('Dragonite', 'Inner Focus', ['outrage', 'thunderwave', 'raindance', 'thunder', 'roost', 'dragondance']),
      set('Alakazam', 'Magic Guard', ['psychic', 'futuresight', 'encore', 'disable', 'reflect', 'trickroom']),
    ],
  ],
  [
    [
      set('Gengar', 'Cursed Body', ['shadowball', 'hypnosis', 'destinybond', 'perishsong', 'willowisp', 'hex']),
      set('Chansey', 'Natural Cure', ['softboiled', 'toxic', 'seismictoss', 'wish', 'lightscreen', 'healbell']),
    ],
    [
      set('Gyarados', 'Intimidate', ['waterfall', 'taunt', 'icefang', 'bounce', 'thrash', 'hurricane']),
      set('Jolteon', 'Volt Absorb', ['thunderbolt', 'yawn', 'pinmissile', 'doublekick', 'agility', 'batonpass']),
    ],
  ],
  [
    [
      set('Machamp', 'No Guard', ['dynamicpunch', 'bulkup', 'rockslide', 'knockoff', 'focusenergy', 'crosschop']),
      set('Starmie', 'Natural Cure', ['surf', 'icebeam', 'rapidspin', 'recover', 'psyshock', 'hail']),
    ],
    [
      set('Arcanine', 'Intimidate', ['flareblitz', 'extremespeed', 'willowisp', 'morningsun', 'crunch', 'roar']),
      set('Exeggutor', 'Chlorophyll', ['sleeppowder', 'gigadrain', 'explosion', 'stunspore', 'woodhammer', 'synthesis']),
    ],
  ],
]

/** A small generator for picking choices, independent of the battle's own random stream. */
function chooser(seed) {
  let state = seed >>> 0
  return (n) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return Math.floor((state / 4294967296) * n)
  }
}

const SINGLE_TARGET = new Set(['normal', 'any', 'adjacentFoe'])

/** Chooses a move for every active Pokémon on both sides, then lets the engine play the turn. */
function chooseAll(battle, pick) {
  for (const side of battle.sides) {
    for (const pokemon of side.active) {
      if (pokemon.fainted) continue
      const moves = pokemon.getMoveRequestData().moves.filter((m) => !m.disabled)
      let done = false
      for (let attempt = 0; attempt < 12 && !done; attempt++) {
        const move = moves[pick(moves.length)]
        // A Pokémon locked into a move is offered it without target information.
        const target = move.target ?? battle.dex.moves.get(move.id).target
        let loc = 0
        if (SINGLE_TARGET.has(target)) loc = 1 + pick(side.foe.active.length)
        else if (target === 'adjacentAlly') loc = -(1 + ((pokemon.position + 1) % side.active.length))
        else if (target === 'adjacentAllyOrSelf') loc = -(1 + pick(side.active.length))
        done = side.chooseMove(move.id, loc)
        // The engine wants some target for a locked move (it then reuses the original one).
        if (!done && side.choice.error.includes('needs a target')) done = side.chooseMove(move.id, 1)
      }
      if (!done) throw new Error(`no legal choice for ${pokemon.name}: ${side.choice.error}`)
    }
  }
  battle.commitChoices()
}

function comparable(log) {
  return log.filter((line) => !line.startsWith('|t:|'))
}

/** Plays a battle to the end or to 40 turns. With `interrupt`, the battle is saved and restored after every turn. */
function play(formatid, teams, seed, interrupt, afterStart) {
  let battle = new Battle({ formatid: toID(formatid), seed })
  battle.setPlayer('p1', { name: 'P1', team: teams[0] })
  battle.setPlayer('p2', { name: 'P2', team: teams[1] })
  if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default')
  afterStart?.(battle)
  const pick = chooser(Number(seed.split(',')[0]) * 65536 + Number(seed.split(',')[1]))
  let largest = 0
  let largestWithoutLog = 0
  for (let turn = 0; turn < 40 && !battle.ended; turn++) {
    chooseAll(battle, pick)
    if (interrupt && !battle.ended) {
      const text = JSON.stringify(battle.toJSON())
      largest = Math.max(largest, text.length)
      largestWithoutLog = Math.max(largestWithoutLog, text.length - JSON.stringify(battle.log).length)
      battle = Battle.fromJSON(text)
      battle.restart(() => {})
    }
  }
  return { battle, log: comparable(battle.log), largest, largestWithoutLog }
}

function spreadSeed(i) {
  return [7919, 104729, 1299709, 15485863].map((prime) => (i * prime) % 65536).join(',')
}

function compare(title, formatid, teamSets, seeds, afterStart, check) {
  let same = 0
  let total = 0
  let turns = 0
  let largest = 0
  let largestWithoutLog = 0
  let firstDifference = null
  let problem = null
  for (const teams of teamSets) {
    for (let i = 1; i <= seeds; i++) {
      const seed = spreadSeed(i)
      total++
      try {
        const straight = play(formatid, teams, seed, false, afterStart)
        const resumed = play(formatid, teams, seed, true, afterStart)
        turns += straight.battle.turn
        largest = Math.max(largest, resumed.largest)
        largestWithoutLog = Math.max(largestWithoutLog, resumed.largestWithoutLog)
        const equal =
          straight.log.length === resumed.log.length && straight.log.every((line, n) => line === resumed.log[n])
        if (equal) same++
        else if (!firstDifference) {
          const at = straight.log.findIndex((line, n) => line !== resumed.log[n])
          firstDifference = `seed ${seed}, line ${at}: straight "${straight.log[at]}" / resumed "${resumed.log[at]}"`
        }
        problem ??= check?.(resumed.battle) ?? null
      } catch (error) {
        problem ??= `seed ${seed}: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  console.log(`### ${title}`)
  console.log(`- identical battles: ${same} of ${total} (average ${(turns / total).toFixed(1)} turns each)`)
  if (firstDifference) console.log(`- first difference: ${firstDifference}`)
  if (problem) console.log(`- problem: ${problem}`)
  console.log(`- largest snapshot: ${(largest / 1024).toFixed(1)} KiB, of which ${((largest - largestWithoutLog) / 1024).toFixed(1)} KiB is the log`)
  console.log('')
}

heading('A. Stock doubles format: restore after every turn vs. never interrupted')
compare('Stock [Gen 9] Doubles Custom Game', 'gen9doublescustomgame', TEAMS, 70)

heading('B. A registered custom format with an overridden method, custom data and resized lines')

Dex.formats.extend([
  {
    name: '[Gen 9] Denborn Probe',
    mod: 'gen9',
    gameType: 'doubles',
    ruleset: [],
    battle: {
      // Overridden engine method: the probe only checks that it is still in place after a restore.
      getActionSpeed(action) {
        Battle.prototype.getActionSpeed.call(this, action)
        this.formatData.speedCalls = (this.formatData.speedCalls ?? 0) + 1
      },
    },
    onBegin() {
      // Lines of different lengths: every Pokémon of each team is active.
      for (const side of this.sides) {
        side.active = new Array(side.pokemon.length).fill(null)
        side.slotConditions = Array.from({ length: side.pokemon.length }, () => ({}))
      }
    },
  },
])

// Three against one, with plain data attached to a Pokémon the way Denborn's adapter will.
const UNEQUAL = [
  [
    [TEAMS[0][0][0], TEAMS[0][0][1], TEAMS[1][0][1]],
    [set('Snorlax', 'Thick Fat', ['bodyslam', 'rest', 'earthquake', 'rockslide', 'curse', 'yawn'], { level: 80 })],
  ],
]

compare(
  'Custom format, 3 active against 1',
  'gen9denbornprobe',
  UNEQUAL,
  70,
  (battle) => {
    battle.sides[0].active[0].m.denborn = { stacks: 3, note: 'plain data' }
  },
  (battle) => {
    if (battle.format.id !== 'gen9denbornprobe') return `restored with format ${battle.format.id}`
    if (battle.sides[0].active.length !== 3 || battle.sides[1].active.length !== 1) {
      return `line lengths after restore: ${battle.sides.map((side) => side.active.length).join(' / ')}`
    }
    if (!(battle.formatData.speedCalls > 0)) return 'overridden method was not in place after restore'
    const kept = battle.sides[0].pokemon.find((p) => p.m.denborn)
    if (kept?.m.denborn.stacks !== 3) return 'custom Pokémon data was lost'
    return null
  },
)

heading('C. Restoring when the custom format is not registered')
{
  const battle = new Battle({ formatid: toID('gen9denbornprobe'), seed: '1,2,3,4' })
  battle.setPlayer('p1', { name: 'P1', team: UNEQUAL[0][0] })
  battle.setPlayer('p2', { name: 'P2', team: UNEQUAL[0][1] })
  const state = battle.toJSON()
  state.formatid = 'gen9formatthatdoesnotexist'
  try {
    const restored = Battle.fromJSON(JSON.stringify(state))
    console.log(`- restore did not throw; format.exists = ${restored.format.exists}, format.id = ${restored.format.id}, gameType = ${restored.gameType}`)
  } catch (error) {
    console.log(`- restore threw: ${error instanceof Error ? error.message : String(error)}`)
  }
}
