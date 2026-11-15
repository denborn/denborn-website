import { describe, expect, it } from 'vitest'
import { BattleRuleError, type CombatantSetup, type DenbornBattle } from '../../battle/denborn-battle'
import { enemy, player, start } from '../../battle/test-kit'
import type { BagEffect } from '../../game-rules/bag-effects'
import type { ItemStack } from '../../shared/schema/common'
import type { Enemy } from '../../shared/schema/encounter'
import { type Author, type Choice, type FightCommand, type FightContext, type FightEngine, type FightStep, fightStep, isReady, openFight, partyView, tableView } from './fight'

// Made up for the tests: real items get their effects from the data pack.
const EFFECTS: Record<string, BagEffect> = { medicine: { heal: 20 } }

interface TableOptions {
  timerSeconds?: number
  bags?: Record<string, ItemStack[]>
  enemyBag?: ItemStack[]
  sheets?: Enemy[]
  /** Stands in for the engine, to see what the table does when the engine refuses. */
  wrap?: (engine: DenbornBattle) => FightEngine
}

/** A fight being played: the real engine, the table around it, and a clock the test moves. */
function table(players: CombatantSetup[], enemies: CombatantSetup[], options: TableOptions = {}) {
  const battle = start(players, enemies)
  const engine = options.wrap ? options.wrap(battle) : battle
  const absent = new Set<string>()
  let now = 0
  const context = (): FightContext => ({ engine, bagEffect: (item) => EFFECTS[item], absent, now })
  let fight = openFight(
    { encounter: { id: 'encounter-0001', name: 'Test' }, enemies: options.sheets ?? [], bags: options.bags ?? {}, enemyBag: options.enemyBag ?? [], timerSeconds: options.timerSeconds, opening: battle.opening },
    context(),
  )
  const say = (author: Author, command: FightCommand): FightStep => {
    const step = fightStep(fight, author, command, context())
    fight = step.fight
    return step
  }
  return {
    battle,
    absent,
    say,
    /** A player locks for their own Pokémon. */
    locks: (who: string, choice: Choice) => say({ player: who }, { do: 'lock', who, choice }),
    /** The game master locks for an enemy. */
    gmLocks: (who: string, choice: Choice) => say('gm', { do: 'lock', who, choice }),
    /** Moves the clock to `seconds` and lets the table see it. */
    at: (seconds: number) => {
      now = seconds * 1000
      return say('gm', { do: 'clock' })
    },
    fight: () => fight,
    ready: () => isReady(fight, context()),
    view: () => tableView(fight, context()),
    party: () => partyView(fight, context()),
    slot: (id: string) => battle.combatant(id).position,
  }
}

const tackle = (target: string): Choice => ({ do: 'move', move: 'tackle', target })
const splash: Choice = { do: 'move', move: 'splash' }
const wait: Choice = { do: 'wait' }

/** One player's Pokémon against one enemy. */
const duel = (options?: TableOptions) => table([player('ann', 'Machamp', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])], options)
/** Two players' Pokémon against one enemy. Speeds: ann > foe > bob. */
const pair = (options?: TableOptions) =>
  table([player('ann', 'Machamp', ['tackle']), player('bob', 'Snorlax', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])], options)

describe('locking a round', () => {
  it('plays the round when the last Pokémon locks, and not before', () => {
    const game = duel()
    const first = game.locks('ann', tackle('foe'))
    expect(first.played).toBeUndefined()
    expect(game.fight().round).toBe(1)
    expect(game.ready()).toBe(false)

    const last = game.gmLocks('foe', tackle('ann'))
    expect(last.played).toMatchObject({ round: 1 })
    expect(game.fight()).toMatchObject({ round: 2, locked: {}, last: { round: 1 } })
    expect(game.battle.combatant('foe').hp).toBeLessThan(game.battle.combatant('foe').maxHp)
  })

  it('lets a locked action be taken back and changed until then', () => {
    const game = pair()
    game.locks('ann', tackle('foe'))
    expect(game.say({ player: 'ann' }, { do: 'unlock', who: 'ann' }).refused).toBeUndefined()
    expect(game.fight().locked).toEqual({})
    expect(game.say({ player: 'ann' }, { do: 'unlock', who: 'ann' }).refused).toBe('not-locked')

    game.locks('ann', tackle('foe'))
    game.locks('ann', wait)
    expect(game.fight().locked.ann).toMatchObject({ choice: wait, by: 'self' })
  })

  it('takes a command only from who may give it', () => {
    const game = pair()
    // A player speaks for their own Pokémon, never for a teammate's or an enemy's.
    expect(game.say({ player: 'ann' }, { do: 'lock', who: 'bob', choice: splash }).refused).toBe('not-yours')
    expect(game.say({ player: 'ann' }, { do: 'lock', who: 'foe', choice: splash }).refused).toBe('not-yours')
    // The game master speaks for the enemies, not for a player who is there.
    expect(game.say('gm', { do: 'lock', who: 'ann', choice: splash }).refused).toBe('not-yours')
    expect(game.say({ player: 'ann' }, { do: 'play' }).refused).toBe('not-yours')
    expect(game.say('gm', { do: 'lock', who: 'nobody', choice: splash }).refused).toBe('unknown-combatant')
    expect(game.fight().locked).toEqual({})
  })

  it('refuses a lock for the engine\'s own reason, and keeps what was locked before', () => {
    const game = duel()
    game.locks('ann', splash)
    expect(game.locks('ann', { do: 'move', move: 'tackle' }).refused).toBe('target-required')
    expect(game.locks('ann', { do: 'move', move: 'surf' }).refused).toBe('unknown-move')
    expect(game.fight().locked.ann?.choice).toEqual(splash)
  })

  it('does not wait for a Pokémon locked into a move: it has no choice', () => {
    const game = table([player('ann', 'Machamp', ['tackle'])], [enemy('foe', 'Snorlax', ['outrage'])])
    game.locks('ann', splash)
    game.gmLocks('foe', { do: 'move', move: 'outrage' })
    expect(game.view().requests.foe?.forced).toBe('outrage')
    expect(game.gmLocks('foe', wait).refused).toBe('locked')
    expect(game.locks('ann', splash).played).toMatchObject({ round: 2 })
  })

  it('waits for the game master to play a round in which nobody has a choice', () => {
    const game = table([player('ann', 'Machamp', ['outrage'])], [enemy('foe', 'Snorlax', ['outrage'])])
    game.locks('ann', { do: 'move', move: 'outrage' })
    expect(game.gmLocks('foe', { do: 'move', move: 'outrage' }).played).toMatchObject({ round: 1 })
    // Both are locked into Outrage: the round is ready, and is not played by itself.
    expect(game.ready()).toBe(true)
    expect(game.fight().round).toBe(2)
    expect(game.say('gm', { do: 'play' }).played).toMatchObject({ round: 2 })
  })

  it('does not play a round that is not ready', () => {
    const game = duel()
    expect(game.say('gm', { do: 'play' }).refused).toBe('not-ready')
  })

  it('lets a Pokémon wait (decision 137)', () => {
    const game = duel()
    game.locks('ann', wait)
    const round = game.gmLocks('foe', splash).played
    expect(round?.events).toContainEqual({ type: 'wait', id: 'ann' })
  })

  it('gives the round back to the Pokémon the engine names when it refuses the round', () => {
    const refusing = (engine: DenbornBattle): FightEngine => ({
      get round() { return engine.round },
      get ended() { return engine.ended },
      get outcome() { return engine.outcome },
      combatants: () => engine.combatants(),
      request: (id) => engine.request(id),
      checkAction: (id, action, extras) => { engine.checkAction(id, action, extras) },
      turnOrder: (locked) => engine.turnOrder(locked),
      run: (id, position) => { engine.run(id, position) },
      exchangeSpeed: (first, second) => { engine.exchangeSpeed(first, second) },
      resolveRound: () => { throw new BattleRuleError('engine-refused', 'Refused for the test', 'ann') },
    })
    const game = duel({ wrap: refusing })
    game.locks('ann', splash)
    const step = game.gmLocks('foe', splash)
    expect(step).toMatchObject({ refused: 'engine-refused', fight: { takenBack: ['ann'] } })
    expect(step.played).toBeUndefined()
    expect(Object.keys(game.fight().locked)).toEqual(['foe'])
    expect(game.fight().round).toBe(1)
  })
})

describe('a player who is away (decision 16)', () => {
  it('may be given Struggle, or an action of the game master\'s choice', () => {
    const game = pair()
    // Struggle is nobody's to choose while the player is there.
    expect(game.locks('ann', { do: 'struggle' }).refused).toBe('not-yours')
    expect(game.say('gm', { do: 'lock', who: 'ann', choice: { do: 'struggle' } }).refused).toBe('not-yours')
    expect(game.gmLocks('foe', { do: 'struggle' }).refused).toBe('not-yours')

    game.absent.add('ann')
    expect(game.say('gm', { do: 'lock', who: 'ann', choice: { do: 'struggle' } }).refused).toBeUndefined()
    expect(game.fight().locked.ann).toMatchObject({ choice: { do: 'struggle' }, by: 'gm' })
    expect(game.say('gm', { do: 'lock', who: 'ann', choice: tackle('foe') }).refused).toBeUndefined()
    expect(game.fight().locked.ann).toMatchObject({ choice: tackle('foe'), by: 'gm' })

    // Back at the table, the player may change what was chosen for them.
    game.absent.delete('ann')
    expect(game.locks('ann', wait).refused).toBeUndefined()
    expect(game.fight().locked.ann).toMatchObject({ choice: wait, by: 'self' })
  })
})

describe('the Bag', () => {
  const hurt = () => [player('ann', 'Machamp', ['tackle'], { hp: 50 })]
  const medicine = (target: string): Choice => ({ do: 'bag', item: 'medicine', target })

  it('loses an item only when it was used', () => {
    const game = table(hurt(), [enemy('foe', 'Chansey', ['tackle'])], { bags: { ann: [{ item: 'medicine', quantity: 2 }] } })
    game.locks('ann', medicine('ann'))
    game.gmLocks('foe', splash)
    expect(game.battle.combatant('ann').hp).toBe(70)
    expect(game.fight().bags.ann).toEqual([{ item: 'medicine', quantity: 1 }])

    // On a Pokémon with nothing to heal the item cannot be used: the turn is taken, the item stays.
    game.locks('ann', medicine('foe'))
    expect(game.gmLocks('foe', splash).played?.events).toContainEqual({ type: 'bag', user: 'ann', item: 'medicine', target: 'foe', outcome: 'failed' })
    expect(game.fight().bags.ann).toEqual([{ item: 'medicine', quantity: 1 }])

    game.locks('ann', medicine('ann'))
    game.gmLocks('foe', splash)
    expect(game.fight().bags.ann).toEqual([])
    expect(game.locks('ann', medicine('ann')).refused).toBe('no-item')
  })

  it('refuses an item the Pokémon\'s side does not have, or that does nothing from a Bag', () => {
    const game = table(hurt(), [enemy('foe', 'Chansey', ['tackle'])], { bags: { ann: [{ item: 'rope', quantity: 1 }] }, enemyBag: [{ item: 'medicine', quantity: 1 }] })
    // The enemies' Bag is not the players'.
    expect(game.locks('ann', medicine('ann')).refused).toBe('no-item')
    expect(game.locks('ann', { do: 'bag', item: 'rope', target: 'ann' }).refused).toBe('no-item')
  })

  it('is shared by the enemies: an item one of them has locked is not there for the next', () => {
    const game = table(hurt(), [enemy('one', 'Chansey', ['tackle']), enemy('two', 'Snorlax', ['tackle'])], { enemyBag: [{ item: 'medicine', quantity: 1 }] })
    expect(game.gmLocks('one', medicine('one')).refused).toBeUndefined()
    expect(game.gmLocks('two', medicine('two')).refused).toBe('no-item')
    // The one who holds it may aim it elsewhere.
    expect(game.gmLocks('one', medicine('two')).refused).toBeUndefined()
  })

  it('takes what an enemy used from the enemies\' Bag, and nothing from the players\'', () => {
    const game = table(hurt(), [enemy('foe', 'Chansey', ['tackle'], { hp: 50 })], { bags: { ann: [{ item: 'medicine', quantity: 1 }] }, enemyBag: [{ item: 'medicine', quantity: 2 }] })
    game.locks('ann', splash)
    game.gmLocks('foe', medicine('foe'))
    expect(game.fight().enemyBag).toEqual([{ item: 'medicine', quantity: 1 }])
    expect(game.fight().bags.ann).toEqual([{ item: 'medicine', quantity: 1 }])
  })
})

describe('Run: trading places', () => {
  it('asks a living ally first, and happens when that ally agrees', () => {
    const game = pair()
    expect(game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' }).refused).toBeUndefined()
    expect(game.fight().asks).toEqual([{ kind: 'run', from: 'ann', to: 'bob' }])
    expect([game.slot('ann'), game.slot('bob')]).toEqual([0, 1])

    // Only the one who was asked answers.
    expect(game.say({ player: 'ann' }, { do: 'answer', who: 'bob', kind: 'run', from: 'ann', accept: true }).refused).toBe('not-yours')
    expect(game.say({ player: 'bob' }, { do: 'answer', who: 'bob', kind: 'run', from: 'ann', accept: true }).refused).toBeUndefined()
    expect([game.slot('ann'), game.slot('bob')]).toEqual([1, 0])
    expect(game.fight().asks).toEqual([])
    expect(game.say({ player: 'bob' }, { do: 'answer', who: 'bob', kind: 'run', from: 'ann', accept: true }).refused).toBe('no-such-ask')
  })

  it('does not happen when the ally says no, or when the ask is taken back', () => {
    const game = pair()
    game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' })
    game.say({ player: 'bob' }, { do: 'answer', who: 'bob', kind: 'run', from: 'ann', accept: false })
    expect(game.fight().asks).toEqual([])

    game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' })
    game.say({ player: 'ann' }, { do: 'withdraw', who: 'ann', kind: 'run' })
    expect(game.fight().asks).toEqual([])
    expect([game.slot('ann'), game.slot('bob')]).toEqual([0, 1])
  })

  it('is for a Pokémon that has not locked, with an ally of its own line', () => {
    const game = pair()
    game.locks('ann', splash)
    expect(game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' }).refused).toBe('locked-first')
    expect(game.say({ player: 'ann' }, { do: 'switch', who: 'ann', with: 'bob' }).refused).toBe('locked-first')
    expect(game.say({ player: 'bob' }, { do: 'run', who: 'bob', with: 'foe' }).refused).toBe('not-allies')
  })

  it('takes back a locked action whose target the swap put out of reach', () => {
    // Four against one: only the two in the middle reach the lone enemy.
    const game = table(
      [player('ann', 'Machamp', ['tackle']), player('bob', 'Snorlax', ['tackle']), player('cat', 'Jolteon', ['tackle']), player('dan', 'Pikachu', ['tackle'])],
      [enemy('foe', 'Chansey', ['tackle'])],
    )
    expect(game.locks('ann', tackle('foe')).refused).toBe('bad-target')
    game.locks('bob', tackle('foe'))
    game.locks('cat', tackle('foe'))

    game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' })
    // The ask is Bob's to answer, not a third player's.
    expect(game.say({ player: 'cat' }, { do: 'answer', who: 'cat', kind: 'run', from: 'ann', accept: true }).refused).toBe('no-such-ask')
    const step = game.say({ player: 'bob' }, { do: 'answer', who: 'bob', kind: 'run', from: 'ann', accept: true })
    // Bob now stands at the end of the line; Cat did not move.
    expect(step.fight.takenBack).toEqual(['bob'])
    expect(Object.keys(game.fight().locked)).toEqual(['cat'])
    expect(game.locks('ann', tackle('foe')).refused).toBeUndefined()
    // Told until Bob locks again, or the round is played.
    expect(game.party().takenBack).toEqual(['bob'])
    game.locks('bob', splash)
    expect(game.fight().takenBack).toEqual([])
  })

  it('needs nobody\'s leave for a dead ally\'s slot, is refused with a downed ally, and is not for a downed Pokémon', () => {
    // Ann goes down in round 1 and loses her last Agony stack in round 3.
    const game = table(
      [player('ann', 'Machamp', ['tackle'], { hp: 1 }), player('bob', 'Snorlax', ['tackle'])],
      [enemy('foe', 'Jolteon', ['tackle'])],
    )
    game.locks('ann', splash)
    game.locks('bob', splash)
    game.gmLocks('foe', tackle('ann'))
    expect(game.battle.combatant('ann').downed).toBe(true)
    expect(game.say({ player: 'bob' }, { do: 'run', who: 'bob', with: 'ann' }).refused).toBe('downed-ally')
    expect(game.say({ player: 'ann' }, { do: 'run', who: 'ann', with: 'bob' }).refused).toBe('cannot-run')
    expect(game.say({ player: 'bob' }, { do: 'switch', who: 'bob', with: 'ann' }).refused).toBe('cannot-switch')

    for (let round = 2; round <= 3 && !game.battle.combatant('ann').dead; round++) {
      game.locks('bob', splash)
      game.gmLocks('foe', tackle('ann'))
    }
    expect(game.battle.combatant('ann').dead).toBe(true)
    expect(game.say({ player: 'bob' }, { do: 'run', who: 'bob', with: 'ann' }).refused).toBeUndefined()
    expect(game.fight().asks).toEqual([])
    expect([game.slot('ann'), game.slot('bob')]).toEqual([1, 0])
  })

  it('is the game master\'s alone for the enemies: no ask, for places as for Speed (decision 138)', () => {
    // Speeds: quick > slow.
    const game = table([player('ann', 'Machamp', ['tackle'])], [enemy('quick', 'Jolteon', ['tackle']), enemy('slow', 'Snorlax', ['tackle'])])
    expect(game.say('gm', { do: 'run', who: 'quick', with: 'slow' }).refused).toBeUndefined()
    expect([game.slot('quick'), game.slot('slow')]).toEqual([1, 0])
    expect(game.view().order).toEqual(['quick', 'ann', 'slow'])
    expect(game.say('gm', { do: 'switch', who: 'quick', with: 'slow' }).refused).toBeUndefined()
    expect(game.view().order).toEqual(['slow', 'ann', 'quick'])
    expect(game.fight().asks).toEqual([])
  })
})

describe('Switch: exchanging Speed for the round', () => {
  it('happens once the ally agrees, and shows in the order', () => {
    const game = pair()
    expect(game.party().order).toEqual(['ann', 'bob'])
    game.say({ player: 'bob' }, { do: 'switch', who: 'bob', with: 'ann' })
    expect(game.party().order).toEqual(['ann', 'bob'])
    game.say({ player: 'ann' }, { do: 'answer', who: 'ann', kind: 'switch', from: 'bob', accept: true })
    expect(game.party().order).toEqual(['bob', 'ann'])

    // For this round only.
    game.locks('ann', splash)
    game.locks('bob', splash)
    game.gmLocks('foe', splash)
    expect(game.party().order).toEqual(['ann', 'bob'])
  })
})

describe('the timer (decisions 14 and 15)', () => {
  it('gives Struggle to a player\'s Pokémon that has not chosen, closes the players\' choices, and waits for the enemies', () => {
    const game = pair({ timerSeconds: 60 })
    game.locks('ann', splash)
    game.say({ player: 'bob' }, { do: 'run', who: 'bob', with: 'ann' })
    expect(game.at(59).fight.locked.bob).toBeUndefined()

    const step = game.at(60)
    expect(step.played).toBeUndefined()
    expect(game.fight().locked.bob).toEqual({ choice: { do: 'struggle' }, extra: [], by: 'timer' })
    expect(game.fight().locked.ann).toMatchObject({ choice: splash })
    expect(game.fight().asks).toEqual([])
    // Players choose no more this round.
    expect(game.say({ player: 'ann' }, { do: 'unlock', who: 'ann' }).refused).toBe('closed')
    expect(game.locks('bob', splash).refused).toBe('closed')

    // The round is played once the game master has locked every enemy.
    expect(game.gmLocks('foe', splash).played).toMatchObject({ round: 1 })
    expect(game.battle.combatant('foe').hp).toBeLessThan(game.battle.combatant('foe').maxHp)
  })

  it('leaves a player with Struggle when their target goes out of reach after time is up', () => {
    // One against four: only the two enemies in the middle are in reach.
    const game = table(
      [player('ann', 'Machamp', ['tackle'])],
      [enemy('edge', 'Chansey', ['tackle']), enemy('near', 'Snorlax', ['tackle']), enemy('mid', 'Jolteon', ['tackle']), enemy('far', 'Pikachu', ['tackle'])],
      { timerSeconds: 60 },
    )
    game.locks('ann', tackle('near'))
    game.at(60)
    // The game master moves the target to the end of its line: the player cannot choose again.
    const step = game.say('gm', { do: 'run', who: 'near', with: 'edge' })
    expect(step.fight.takenBack).toEqual(['ann'])
    expect(game.fight().locked.ann).toEqual({ choice: { do: 'struggle' }, extra: [], by: 'timer' })
  })

  it('plays the round at once when it runs out with every enemy locked', () => {
    const game = pair({ timerSeconds: 60 })
    game.gmLocks('foe', splash)
    expect(game.at(60).played).toMatchObject({ round: 1 })
  })

  it('counts anew each round', () => {
    const game = duel({ timerSeconds: 60 })
    game.at(50)
    game.locks('ann', splash)
    game.gmLocks('foe', splash)
    expect(game.view().timer).toMatchObject({ running: true, left: 60_000, expired: false })
    expect(game.at(109).fight.timer.expired).toBe(false)
    expect(game.at(110).fight.timer.expired).toBe(true)
  })

  it('stops while the game master holds it, and picks up with what was left', () => {
    const game = duel({ timerSeconds: 60 })
    game.at(10)
    game.say('gm', { do: 'pause' })
    expect(game.at(500).fight.timer).toMatchObject({ expired: false, paused: true })
    expect(game.view().timer).toMatchObject({ running: false, left: 50_000 })

    game.say('gm', { do: 'resume' })
    expect(game.at(549).fight.timer.expired).toBe(false)
    expect(game.at(550).fight.timer.expired).toBe(true)
  })

  it('is held while a player who still has to choose is away, until they are back or chosen for', () => {
    const game = pair({ timerSeconds: 60 })
    game.at(10)
    game.absent.add('bob')
    game.at(10)
    expect(game.at(300).fight.timer.expired).toBe(false)

    // The game master chooses for the absent player: nobody away is waited for any more.
    game.say('gm', { do: 'lock', who: 'bob', choice: { do: 'struggle' } })
    expect(game.at(349).fight.timer.expired).toBe(false)
    const step = game.at(350)
    expect(step.fight.timer.expired).toBe(true)
    expect(step.fight.locked.ann).toMatchObject({ by: 'timer' })
  })

  it('runs for the length the game master sets, from then on, or not at all', () => {
    const game = duel()
    expect(game.at(100_000).fight.timer.expired).toBe(false)
    game.say('gm', { do: 'timer', seconds: 30 })
    expect(game.view().timer).toMatchObject({ seconds: 30, running: true, left: 30_000 })
    game.say('gm', { do: 'timer', seconds: undefined })
    expect(game.at(200_000).fight.timer.expired).toBe(false)
    expect(game.say({ player: 'ann' }, { do: 'timer', seconds: 5 }).refused).toBe('not-yours')
  })
})

describe('what each side is shown', () => {
  it('shows players both lines in full, and of the choices only their own party\'s', () => {
    const game = table(
      [player('ann', 'Machamp', ['tackle']), player('bob', 'Snorlax', ['tackle'])],
      [enemy('foe', 'Chansey', ['tackle'])],
      { bags: { ann: [{ item: 'medicine', quantity: 1 }], bob: [] }, enemyBag: [{ item: 'medicine', quantity: 3 }], sheets: [{ id: 'foe', species: 'chansey', class: 'boss' } as Enemy] },
    )
    game.locks('ann', tackle('foe'))
    game.gmLocks('foe', tackle('ann'))
    game.say({ player: 'bob' }, { do: 'switch', who: 'bob', with: 'ann' })

    const seen = game.party()
    expect(seen.combatants.map((combatant) => combatant.id)).toEqual(['ann', 'bob', 'foe'])
    expect(Object.keys(seen.locked)).toEqual(['ann'])
    expect(Object.keys(seen.requests)).toEqual(['ann', 'bob'])
    expect(seen.order).toEqual(['ann', 'bob'])
    expect(seen.asks).toEqual([{ kind: 'switch', from: 'bob', to: 'ann' }])
    expect(seen).not.toHaveProperty('enemyBag')
    expect(seen).not.toHaveProperty('classes')
    // Their sheets, without the game master's label (decision 133).
    expect(seen.enemies).toEqual([{ id: 'foe', species: 'chansey' }])
    expect(JSON.stringify(seen)).not.toContain('"foe":{"choice"')

    // The game master is shown everything.
    const all = game.view()
    expect(Object.keys(all.locked)).toEqual(['ann', 'foe'])
    expect(all.order).toEqual(['ann', 'foe', 'bob'])
    expect(all.enemyBag).toEqual([{ item: 'medicine', quantity: 3 }])
    expect(all.classes).toEqual({ foe: 'boss' })
    expect(all.ready).toBe(false)
  })
})

describe('the end of a fight', () => {
  it('is said as soon as the engine says it, and nothing more is taken', () => {
    const game = table([player('ann', 'Machamp', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'], { hp: 1 })])
    game.locks('ann', tackle('foe'))
    const step = game.gmLocks('foe', splash)
    expect(step.fight.outcome).toBe('players')
    expect(game.locks('ann', splash).refused).toBe('over')
    expect(game.ready()).toBe(false)
    expect(game.view().timer.running).toBe(false)
  })
})
