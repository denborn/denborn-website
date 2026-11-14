import { describe, expect, it } from 'vitest'
import type { BagEffect } from '../game-rules/bag-effects'
import { type BattleSnapshot, BattleRuleError, DenbornBattle, type MoveChoice, type RoundAction } from './denborn-battle'
import { bag, enemy, move, player, round, seedNumber, start, timeline } from './test-kit'
import { ADAPTER_VERSION } from './versions'

/** A small generator for the test's own choices, separate from the battle's random numbers. */
function chooser(seed: number) {
  let state = seed >>> 0
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return Math.floor((state / 4294967296) * n)
  }
}

const ITEMS: BagEffect[] = [{ heal: 30 }, { revive: 'half' }, { cure: 'all' }, { boost: { stat: 'atk', stages: 2 } }]

function newBattle(seed: string): DenbornBattle {
  return start(
    [
      player('ace', 'Dragonite', ['outrage', 'thunderwave', 'raindance', 'roost', 'extremespeed']),
      player('sage', 'Alakazam', ['psychic', 'futuresight', 'reflect', 'disable', 'trickroom']),
      player('tank', 'Snorlax', ['bodyslam', 'rest', 'earthquake', 'yawn', 'protect']),
    ],
    [
      enemy('boss', 'Gyarados', ['waterfall', 'thrash', 'surf', 'bounce', 'taunt'], { level: 60, agony: true }),
      enemy('imp', 'Gengar', ['shadowball', 'hypnosis', 'willowisp', 'sludgebomb', 'confuseray']),
    ],
    { seed },
  )
}

function pickMove(battle: DenbornBattle, id: string, pick: (n: number) => number): MoveChoice | null {
  // A move that needs a target cannot be locked while nobody is in its reach.
  const usable = battle.request(id).moves.filter((option) => !option.disabled && (!option.needsTarget || option.targets.length > 0))
  const option = usable[pick(usable.length)]
  if (!option || option.id === 'struggle') return null
  const target = option.targets[pick(Math.max(option.targets.length, 1))]
  return target === undefined ? { move: option.id } : { move: option.id, target }
}

/** One round of legal, varied choices: moves, Bag uses, Struggle, an extra boss move, Run and Switch. */
function playRound(battle: DenbornBattle, pick: (n: number) => number): string[] {
  const everyone = battle.combatants()
  const standing = (side: string) => everyone.filter((c) => c.side === side && !c.downed && !c.dead)

  const [first, second] = standing('players')
  if (first && second && pick(4) === 0) battle.exchangeSpeed(first.id, second.id)
  if (first && second && pick(5) === 0) battle.run(first.id, second.position)

  const actions: Record<string, RoundAction> = {}
  const extraMoves: Record<string, MoveChoice[]> = {}
  for (const combatant of everyone) {
    const request = battle.request(combatant.id)
    if (!request.canAct || request.forced) continue
    const roll = pick(8)
    const choice = roll > 1 ? pickMove(battle, combatant.id, pick) : null
    if (choice) {
      actions[combatant.id] = { type: 'move', ...choice }
    } else if (roll === 0) {
      const allies = everyone.filter((other) => other.side === combatant.side && !other.dead)
      const target = allies[pick(allies.length)] ?? combatant
      actions[combatant.id] = bag('item', target.id, ITEMS[pick(ITEMS.length)] ?? { heal: 30 })
    } else {
      actions[combatant.id] = { type: 'struggle' }
    }
    if (combatant.id === 'boss' && pick(3) === 0) {
      const again = pickMove(battle, 'boss', pick)
      if (again) extraMoves.boss = [again]
    }
  }
  return battle.resolveRound({ actions, extraMoves }).log
}

function play(seed: string, choiceSeed: number, interrupt: boolean) {
  let battle = newBattle(seed)
  const pick = chooser(choiceSeed)
  const log = [...battle.opening.log]
  let largest = 0
  const over = (current: DenbornBattle) => current.ended
  for (let n = 0; n < 25 && !over(battle); n++) {
    log.push(...playRound(battle, pick))
    if (interrupt && !over(battle)) {
      // Through text, as a save file or the browser's storage would hold it.
      const text = JSON.stringify(battle.snapshot())
      largest = Math.max(largest, text.length)
      battle = DenbornBattle.restore(JSON.parse(text) as BattleSnapshot)
    }
  }
  return { log, final: battle.combatants(), outcome: battle.outcome, rounds: battle.round, largest }
}

describe('saving and resuming a battle', () => {
  it('plays out exactly as if it had never been interrupted', () => {
    let rounds = 0
    let sawDowned = false
    for (let n = 1; n <= 24; n++) {
      const straight = play(seedNumber(n), n, false)
      const resumed = play(seedNumber(n), n, true)

      expect(resumed.log, `seed ${n}`).toEqual(straight.log)
      expect(resumed.final).toEqual(straight.final)
      expect(resumed.outcome).toBe(straight.outcome)
      rounds += straight.rounds
      sawDowned ||= straight.log.some((entry) => entry.startsWith('|denborn|downed|'))
    }
    // The sweep is only worth something if real fights happened.
    expect(rounds).toBeGreaterThan(24 * 5)
    expect(sawDowned).toBe(true)
  })

  it('keeps a Speed exchange made before the save', () => {
    const battle = start(
      [player('fast', 'Jolteon', ['tackle']), player('slow', 'Snorlax', ['tackle'])],
      [enemy('foe', 'Chansey', ['tackle'])],
    )
    battle.exchangeSpeed('fast', 'slow')
    const resumed = DenbornBattle.restore(battle.snapshot())

    const movers = timeline(resumed, round(resumed)).filter((step) => step.startsWith('move')).map((step) => step.split(' ')[1])
    expect(movers).toEqual(['slow', 'foe', 'fast'])
  })

  it('keeps what a downed Pokémon needs to be revived as it was', () => {
    const battle = start(
      [player('victim', 'Koffing', ['tackle'], { hp: 1 }), player('medic', 'Chansey', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle', 'earthquake'])],
    )
    round(battle, { brute: move('tackle', 'victim') })

    const resumed = DenbornBattle.restore(JSON.parse(JSON.stringify(battle.snapshot())) as BattleSnapshot)
    expect(resumed.combatant('victim')).toMatchObject({ downed: true, stacks: 3 })

    round(resumed, { medic: bag('item', 'victim', { revive: 'full' }) })
    const quake = round(resumed, { brute: move('earthquake') })
    expect(quake.log.some((entry) => entry.startsWith('|-immune|') && entry.includes('Levitate'))).toBe(true)
  })

  it('only hands out the lines that came after the save', () => {
    const battle = newBattle('1,2,3,4')
    round(battle)
    const resumed = DenbornBattle.restore(battle.snapshot())
    expect(resumed.opening).toEqual({ log: [], events: [] })
  })

  it('refuses a save made by another engine or adapter version, or for another format', () => {
    const snapshot = newBattle('1,2,3,4').snapshot()
    const refused = (changed: Partial<BattleSnapshot>) => {
      try {
        DenbornBattle.restore({ ...snapshot, ...changed })
      } catch (error) {
        return error instanceof BattleRuleError ? error.code : String(error)
      }
      return 'accepted'
    }
    expect(refused({})).toBe('accepted')
    expect(refused({ engine: '0.0.1' })).toBe('snapshot-version')
    expect(refused({ adapter: ADAPTER_VERSION + 1 })).toBe('snapshot-version')
    expect(refused({ format: 'gen9doublescustomgame' })).toBe('snapshot-version')
  })

  it('refuses a save whose engine state names another format', () => {
    const snapshot = newBattle('1,2,3,4').snapshot()
    const state = { ...(snapshot.state as Record<string, unknown>), formatid: 'gen9doublescustomgame' }
    expect(() => DenbornBattle.restore({ ...snapshot, state })).toThrow(/instead of/)
  })
})
