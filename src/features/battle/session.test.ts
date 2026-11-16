/**
 * A fight inside a live session, end to end but for the network: the game
 * master's side and two players' sides, each the real logic and the real
 * runner, joined by a relay the test plays. Every message goes through the
 * wire's form and the receiver's checks; the fight is played by the real
 * engine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BattleRuleError, DenbornBattle } from '../../battle/denborn-battle'
import type { DataPack } from '../../data/types'
import { maxHpOf } from '../../domain/character-check'
import { move, newcomer, species, testPack, testRules } from '../../domain/test-pack'
import type { RelayLink, RelayLinkOptions } from '../../network/relay-link'
import type { Intent } from '../../shared/protocol/battle'
import { type HostMessage, encodeMessage } from '../../shared/protocol/session'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Encounter } from '../../shared/schema/encounter'
import { type GuestState, guestStep } from '../session/guest'
import { type HostRunOptions, type KeptFight, runHost } from '../session/run-host'
import { runGuest } from '../session/run-guest'

// A pack of the test's own, with two species the real engine knows: the characters must pass the
// session's checks and fight in the engine.
const pack: DataPack = {
  ...testPack,
  species: {
    machamp: species('machamp', 68, { genders: ['M', 'F'], abilities: ['guts'], baseStats: { hp: 90, atk: 130, def: 80, spa: 65, spd: 85, spe: 55 }, learnset: [{ move: 'tackle', level: 1 }, { move: 'splash', level: 1 }] }),
    snorlax: species('snorlax', 143, { genders: ['M', 'F'], abilities: ['immunity'], baseStats: { hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30 }, learnset: [{ move: 'tackle', level: 1 }, { move: 'splash', level: 1 }] }),
    // The enemies, for what defeating them is worth.
    chansey: species('chansey', 113, { genders: ['F'], abilities: ['naturalcure'], baseStats: { hp: 250, atk: 5, def: 5, spa: 35, spd: 105, spe: 50 }, learnset: [] }),
    caterpie: species('caterpie', 10, { genders: ['M', 'F'], abilities: ['shielddust'], baseStats: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 }, learnset: [] }),
  },
  moves: { ...testPack.moves, tackle: move('tackle', 35), splash: move('splash', 40) },
  items: { ...testPack.items, potion: { ...testPack.items.potion, bag: { heal: 20 } } } as DataPack['items'],
}
const rules = testRules({ species: ['machamp', 'snorlax'] })

function hero(id: string, speciesId: string, ability: string): CharacterDocument {
  const character: CharacterDocument = { ...newcomer({ id, species: speciesId, ability, moves: [{ id: 'tackle', ppUps: 0, pp: 35 }, { id: 'splash', ppUps: 0, pp: 40 }], hp: 1 }), heldItem: undefined }
  return { ...character, hp: maxHpOf(character, pack) ?? 1 }
}
const ANN = hero('hero-ann-0001', 'machamp', 'guts')
const BOB = hero('hero-bob-0001', 'snorlax', 'immunity')
const FOE = 'enemy-foe-0001'

const encounter: Encounter = {
  id: 'encounter-0001',
  name: 'The quarry',
  enemies: [
    { id: FOE, species: 'chansey', gender: 'F', level: 5, ability: 'naturalcure', ivs: ANN.ivs, evs: ANN.evs, moves: [{ id: 'tackle', ppUps: 0 }, { id: 'splash', ppUps: 0 }], agony: false, class: 'boss' },
  ],
  bag: [],
}
/** An encounter that is soon won: one frail enemy. */
const skirmish: Encounter = {
  id: 'encounter-0002',
  name: 'The ditch',
  enemies: [{ id: 'enemy-bug-0001', species: 'caterpie', gender: 'M', level: 1, ability: 'shielddust', ivs: ANN.ivs, evs: ANN.evs, moves: [{ id: 'tackle', ppUps: 0 }], agony: false, class: 'minion' }],
  bag: [],
}
/** Two enemies, for what the game master does between them. */
const pair: Encounter = {
  id: 'encounter-0003',
  name: 'The gate',
  enemies: [
    { ...skirmish.enemies[0], id: 'enemy-slow-0001', species: 'snorlax', ability: 'immunity', level: 5 } as Encounter['enemies'][number],
    { ...skirmish.enemies[0], id: 'enemy-fast-0001', species: 'caterpie', level: 5 } as Encounter['enemies'][number],
  ],
  bag: [],
}
const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: pack.version, name: 'Test', rulesHistory: [rules], characters: [], encounters: [encounter, skirmish, pair] }

/** What the wire does to a message: only what JSON carries arrives. */
const wired = (body: unknown): unknown => JSON.parse(JSON.stringify(body)) as unknown

/** The game master and players at one table, with the test in the relay's place. Bob comes as given, when the test needs him otherwise. */
function table(options: { timerSeconds?: number; bob?: CharacterDocument } = {}) {
  let host: RelayLinkOptions | undefined
  /** Each player's device as the relay knows it: its line, and whether it is connected. */
  const devices = new Map<string, { line: RelayLinkOptions; online: boolean }>()
  const toHost = (peer: string, body: unknown): void => host?.onFrame({ t: 'msg', from: peer, body: wired(body) })
  /** The battles the engine was asked to start, by their seed. */
  const battles: string[] = []

  /** What the game master's side handed over to be kept: the characters' copies, who is in the party, the fight. */
  const kept: { characters: CampaignDocument['characters']; members: { peer: string; character: string }[]; fights: (KeptFight | undefined)[]; copies: Record<string, CharacterDocument[]> } = { characters: [], members: [], fights: [], copies: {} }
  const hostWith = (remembered: boolean, restoreBattle?: HostRunOptions['restoreBattle']) => runHost({
    campaign: remembered ? { ...campaign, characters: kept.characters } : campaign,
    pack,
    hosting: { code: 'ABCDEF', secret: 'host-secret-0123456789abcdef', members: remembered ? kept.members : [] },
    origin: 'https://denborn.test',
    onChange: () => undefined,
    onCharacters: (characters) => {
      kept.characters = characters
    },
    onMembers: (members) => {
      kept.members = members
    },
    onFight: (fight) => kept.fights.push(fight),
    ...(restoreBattle ? { restoreBattle } : {}),
    open: (given): RelayLink => {
      host = given
      return {
        send: (frame) => {
          if (frame.t !== 'send') return true
          for (const [peer, device] of devices) if (device.online && (!frame.to || frame.to.includes(peer))) device.line.onFrame({ t: 'msg', body: wired(frame.body) })
          return true
        },
        close: () => undefined,
      }
    },
    startBattle: (setup) => {
      battles.push(setup.seed)
      return Promise.resolve(DenbornBattle.start(setup))
    },
    random: () => new Uint8Array(8).fill(7),
    now: () => Date.now(),
  })
  let gm = hostWith(false)
  host?.onFrame({ t: 'hosting', peers: [] })
  /** The game master's app closes and opens again: a new run, with what the first one handed over, and every device there says its piece again. */
  const reopen = (restoreBattle?: HostRunOptions['restoreBattle']) => {
    gm.stop()
    gm = hostWith(true, restoreBattle)
    host?.onFrame({ t: 'hosting', peers: [...devices.keys()] })
    for (const device of devices.values()) device.line.onFrame({ t: 'host', present: true })
    return gm
  }

  /** A player's device: it comes into the room, asks with its character, and is let in. */
  function player(peer: string, character: CharacterDocument) {
    /** Everything the device sent the game master, as it left. */
    const sent: unknown[] = []
    let ids = 0
    const run = runGuest({
      code: 'ABCDEF',
      origin: 'https://denborn.test',
      token: `token-of-${peer}-0123456789`,
      dataPackVersion: pack.version,
      character: { ...character, rules },
      onChange: () => undefined,
      onKeep: (copy) => {
        ;(kept.copies[peer] ??= []).push(copy)
      },
      open: (line): RelayLink => {
        devices.set(peer, { line, online: true })
        return {
          send: (frame) => {
            if (frame.t !== 'send' || !devices.get(peer)?.online) return false
            sent.push(frame.body)
            toHost(peer, frame.body)
            return true
          },
          close: () => undefined,
        }
      },
      newId: () => `intent-${peer}-${String(ids++).padStart(4, '0')}`,
    })
    const device = devices.get(peer)
    if (!device) throw new Error('The device never opened its line')
    const arrives = (): void => {
      device.online = true
      host?.onFrame({ t: 'peer', peer, present: true })
      device.line.onFrame({ t: 'joined', peer, host: true })
    }
    arrives()
    gm.approve(peer, 'theirs')
    const member = () => {
      const state = run.state()
      return state.at === 'in' ? state : undefined
    }
    return {
      run,
      /** The fight as this device was last told it. */
      fight: () => member()?.fight,
      /** What became of the last intent that was answered. */
      answer: () => member()?.answer,
      /** What the device was told its character was awarded. */
      rewards: () => member()?.rewards,
      /** The party as this device was last told it, and its own entry in it. */
      party: () => member()?.party,
      me: () => member()?.party.members.find((entry) => entry.character.id === member()?.party.you),
      /** What became of the last change it asked of a sheet, and what the game master last gave or took. */
      changed: () => member()?.changed,
      granted: () => member()?.granted,
      /** The copies of its character the device was given to keep, in order. */
      copies: () => kept.copies[peer] ?? [],
      /** Something the device sent arrives a second time: the last thing by default, or the one `back` before the end. */
      again: (back = 1): void => toHost(peer, sent.at(-back)),
      /** Its connection drops: the relay tells the game master, and nothing reaches the device. */
      drops: (): void => {
        device.online = false
        host?.onFrame({ t: 'peer', peer, present: false })
        device.line.onDown(1006, true)
      },
      /** It is back: the same device, with the same character. */
      returns: arrives,
    }
  }

  const ann = player('peer-ann', ANN)
  const bob = player('peer-bob', options.bob ?? BOB)
  const launch = (id = encounter.id) => gm.launch(id, options.timerSeconds === undefined ? {} : { timerSeconds: options.timerSeconds })
  return { gm: () => gm, ann, bob, launch, view: () => gm.view(), toHost, battles, kept, reopen }
}

const lock = (move: string, target?: string): Intent => ({ do: 'lock', choice: { do: 'move', move, ...(target ? { target } : {}) } })

afterEach(() => {
  vi.useRealTimers()
})

describe('a fight inside a session', () => {
  it('is launched by the game master, told to every player, and played when the last Pokémon is locked', async () => {
    const { gm: master, ann, bob, launch, view } = table()
    const gm = master()
    expect(ann.fight()).toBeUndefined()
    expect(await launch()).toBeUndefined()

    // Both players are told the same fight: both lines, their own choices to make, the enemy's sheet without its class.
    expect(view().table).toMatchObject({ round: 1, ready: false, classes: { [FOE]: 'boss' } })
    expect(ann.fight()).toMatchObject({ encounter: { name: 'The quarry' }, round: 1, order: [ANN.id, BOB.id] })
    expect(ann.fight()?.combatants.map((combatant) => combatant.id)).toEqual([ANN.id, BOB.id, FOE])
    expect(Object.keys(ann.fight()?.requests ?? {})).toEqual([ANN.id, BOB.id])
    expect(ann.fight()?.enemies).toEqual([expect.not.objectContaining({ class: expect.anything() as unknown })])
    expect(bob.fight()).toEqual(ann.fight())

    // A player's intent is carried out by the game master's side, answered, and shown to the teammate (decision 146).
    const first = ann.run.intend(lock('tackle', FOE))
    expect(ann.answer()).toEqual({ id: first })
    expect(view().table?.locked[ANN.id]).toMatchObject({ choice: { do: 'move', move: 'tackle', target: FOE }, by: 'self' })
    expect(bob.fight()?.locked[ANN.id]).toMatchObject({ choice: { do: 'move', move: 'tackle', target: FOE } })

    // One the fight's rules refuse is answered with why, and changes nothing.
    const refused = bob.run.intend(lock('tackle'))
    expect(bob.answer()).toEqual({ id: refused, refused: 'target-required' })
    expect(view().table?.locked[BOB.id]).toBeUndefined()

    // The enemy's locked action stays with the game master.
    expect(gm.command({ do: 'lock', who: FOE, choice: { do: 'move', move: 'tackle', target: ANN.id } })).toBeUndefined()
    expect(Object.keys(ann.fight()?.locked ?? {})).toEqual([ANN.id])
    expect(view().table?.round).toBe(1)

    // The last lock plays the round; everyone is told what happened.
    bob.run.intend(lock('splash'))
    expect(view().table).toMatchObject({ round: 2, locked: {} })
    expect(ann.fight()).toMatchObject({ round: 2, locked: {}, last: { round: 1 } })
    expect(ann.fight()?.last.log.some((line) => line.startsWith('|move|'))).toBe(true)
    expect(ann.fight()?.combatants.find((combatant) => combatant.id === FOE)?.hp).toBeLessThan(view().table?.combatants.find((combatant) => combatant.id === FOE)?.maxHp ?? 0)
    expect(bob.fight()).toEqual(ann.fight())
  })

  it('tells everyone the new order when two teammates exchange Speed', async () => {
    const { ann, bob, launch } = table()
    await launch()
    expect(ann.fight()?.order).toEqual([ANN.id, BOB.id])
    bob.run.intend({ do: 'switch', with: ANN.id })
    expect(ann.fight()?.asks).toEqual([{ kind: 'switch', from: BOB.id, to: ANN.id }])
    ann.run.intend({ do: 'answer', kind: 'switch', from: BOB.id, accept: true })
    expect(ann.fight()?.order).toEqual([BOB.id, ANN.id])
    expect(bob.fight()?.order).toEqual([BOB.id, ANN.id])
  })

  it('refuses a launch that makes no fight, and a second one while a fight is on', async () => {
    const { gm: master, launch, battles } = table()
    const gm = master()
    expect(await gm.launch('encounter-none')).toBe('no-encounter')
    expect(await gm.launch(encounter.id, { only: [] })).toBe('nobody-can-fight')
    expect(battles).toEqual([])
    expect(await launch()).toBeUndefined()
    expect(await launch()).toBe('fight-on')
    // Only the fight that is on was ever started, with the seed drawn for it.
    expect(battles).toEqual(['1799,1799,1799,1799'])
    expect(gm.command({ do: 'play' })).toBe('not-ready')
  })

  it('carries an intent out once, however many times it arrives', async () => {
    const { ann, launch, view } = table()
    await launch()
    ann.run.intend(lock('splash'))
    const unlock = ann.run.intend({ do: 'unlock' })
    expect(view().table?.locked[ANN.id]).toBeUndefined()

    // The same intent again, as a device sends it when it is not sure it was heard: answered as done, not refused as a second unlock would be.
    ann.again()
    expect(ann.answer()).toEqual({ id: unlock })

    // And not done again: locked anew, the old unlock arriving once more takes nothing back.
    ann.run.intend(lock('splash'))
    ann.again(2)
    expect(view().table?.locked[ANN.id]).toBeDefined()
  })

  it('does not carry out an intent made for a round already played, nor one from who is not in the party', async () => {
    const { gm: master, ann, bob, launch, view, toHost } = table()
    const gm = master()
    await launch()
    ann.run.intend(lock('splash'))
    bob.run.intend(lock('splash'))
    gm.command({ do: 'lock', who: FOE, choice: { do: 'move', move: 'splash' } })
    expect(view().table?.round).toBe(2)

    // Sent during round 1, heard in round 2.
    toHost('peer-ann', encodeMessage({ t: 'intent', id: 'intent-late-0001', round: 1, intent: lock('splash') }))
    expect(ann.answer()).toEqual({ id: 'intent-late-0001', refused: 'stale' })
    expect(view().table?.locked).toEqual({})

    // One made now, for the round being chosen, is carried out.
    const now = ann.run.intend(lock('splash'))
    expect(ann.answer()).toEqual({ id: now })
    expect(Object.keys(view().table?.locked ?? {})).toEqual([ANN.id])

    // A device that is in the room and not in the party has no Pokémon to speak for.
    toHost('peer-stranger', encodeMessage({ t: 'intent', id: 'intent-odd-00001', round: 2, intent: lock('splash') }))
    expect(Object.keys(view().table?.locked ?? {})).toEqual([ANN.id])
  })

  it('holds the timer for a player who is away, lets the game master choose for them, and tells them the fight when they are back', async () => {
    vi.useFakeTimers()
    const { gm: master, ann, bob, launch, view } = table({ timerSeconds: 60 })
    const gm = master()
    await launch()
    expect(view().table?.timer).toMatchObject({ seconds: 60, running: true })

    bob.drops()
    expect(view().table?.timer.running).toBe(false)
    expect(ann.fight()?.timer.running).toBe(false)
    // Not the game master's to choose while the player is there; theirs once the player is away (decision 16).
    expect(gm.command({ do: 'lock', who: ANN.id, choice: { do: 'struggle' } })).toBe('not-yours')
    expect(gm.command({ do: 'lock', who: BOB.id, choice: { do: 'struggle' } })).toBeUndefined()
    expect(view().table?.timer.running).toBe(true)

    bob.returns()
    expect(bob.fight()).toMatchObject({ round: 1, locked: { [BOB.id]: { by: 'gm' } } })
  })

  it('is no longer shown to a player once the game master says there is none, or tells the party without it', async () => {
    const { ann, launch } = table()
    await launch()
    const told = ann.run.state()
    if (told.at !== 'in' || !told.fight) throw new Error('Ann was not told the fight')
    const mine = { character: { ...ANN, rules }, dataPackVersion: pack.version }
    const hears = (state: GuestState, message: HostMessage): GuestState => guestStep(state, { on: 'message', body: wired(encodeMessage(message)) }, mine).state

    // The fight was closed.
    expect(hears(told, { t: 'fight', fight: null })).not.toHaveProperty('fight')

    // The game master's app started over. What the device knew stays on screen until the game master speaks;
    // the party is then told from the beginning again, with no fight: there is none any more.
    const back = guestStep(guestStep(told, { on: 'host', present: false }, mine).state, { on: 'host', present: true }, mine).state
    expect(back).toHaveProperty('fight')
    const after = hears(back, { t: 'party', party: { ...told.party, revision: 0 } })
    expect(after).toMatchObject({ at: 'in', party: { revision: 0 } })
    expect(after).not.toHaveProperty('fight')
  })

  it('ends with everyone left as the fight left them, the whole party awarded, and each player told (decisions 136, 159 to 161)', async () => {
    const { gm: master, ann, bob, launch, view, kept } = table()
    const gm = master()
    await launch(skirmish.id)
    expect(gm.rewards()).toMatchObject({ money: 0, exp: { [ANN.id]: 0, [BOB.id]: 0 } })

    // Ann attacks until the enemy is out; Bob waits; the enemy hits Ann.
    for (let round = 0; round < 12 && view().table?.outcome === undefined; round++) {
      ann.run.intend(lock('tackle', 'enemy-bug-0001'))
      bob.run.intend({ do: 'lock', choice: { do: 'wait' } })
      gm.command({ do: 'lock', who: 'enemy-bug-0001', choice: { do: 'move', move: 'tackle', target: ANN.id } })
    }
    expect(view().table?.outcome).toBe('players')
    // Only now is the enemy worth something: to every character of the party, each its own amount.
    const worth = gm.rewards()
    expect(worth?.money).toBeGreaterThan(0)
    expect(worth?.exp[ANN.id]).toBeGreaterThan(0)
    expect(worth?.exp[BOB.id]).toBeGreaterThan(0)
    const spent = view().table?.combatants.find((combatant) => combatant.id === ANN.id)
    if (!spent || !worth) throw new Error('The fight has no Ann')

    // The game master gives Ann enough to pass a level, and Bob Pokédollars only.
    const toNext = (ANN.level + 1) ** 3 - ANN.exp
    gm.closeFight({ [ANN.id]: { exp: toNext, money: 100 }, [BOB.id]: { exp: 0, money: 100 } })
    expect(view().table).toBeUndefined()
    expect(view().session.fight).toBeUndefined()
    expect(kept.fights.at(-1)).toBeUndefined()

    const [annNow, bobNow] = view().session.party.map((member) => member.character)
    // The PP Ann spent stay spent; her level rose with her EXP, and her HP with it.
    expect(annNow?.moves.find((slot) => slot.id === 'tackle')?.pp).toBe(spent.moves.find((slot) => slot.id === 'tackle')?.pp)
    expect(annNow?.moves.find((slot) => slot.id === 'tackle')?.pp).toBeLessThan(35)
    expect(annNow).toMatchObject({ level: ANN.level + 1, exp: ANN.exp + toNext, money: ANN.money + 100 })
    expect(annNow?.hp).toBeGreaterThanOrEqual(spent.hp)
    expect(bobNow).toMatchObject({ level: BOB.level, exp: BOB.exp, money: BOB.money + 100, hp: BOB.hp })
    // The copies are the campaign's, and each player's own device is given its own to keep.
    expect(kept.characters.map((copy) => copy.money)).toEqual([ANN.money + 100, BOB.money + 100])
    expect(ann.copies().at(-1)).toMatchObject({ id: ANN.id, level: ANN.level + 1 })

    // Each player is told what their character got, and sees no fight any more.
    expect(ann.fight()).toBeUndefined()
    expect(ann.rewards()).toEqual({ encounter: 'The ditch', exp: toNext, money: 100, level: { from: ANN.level, to: ANN.level + 1 } })
    expect(bob.rewards()).toEqual({ encounter: 'The ditch', exp: 0, money: 100 })
    ann.run.rewardsRead()
    expect(ann.rewards()).toBeUndefined()
    // Another encounter can be launched.
    expect(await launch()).toBeUndefined()
  })

  it('is kept after every change, and taken up again where it was when the game master\'s app opens again', async () => {
    const { ann, bob, launch, view, kept, reopen } = table()
    await launch()
    ann.run.intend(lock('tackle', FOE))
    const before = view().table
    const saved = kept.fights.at(-1)
    if (!saved || !before) throw new Error('The fight was not kept')
    expect(saved.fight.locked[ANN.id]).toBeDefined()

    const again = reopen((snapshot) => Promise.resolve(DenbornBattle.restore(snapshot)))
    expect(again.view().table).toBeUndefined()
    expect(await again.resume(saved)).toBeUndefined()
    // The same round, the same lock, everyone's HP as it was; and the players, back in the party, are told the fight again.
    const after = again.view().table
    expect(after).toMatchObject({ round: before.round, locked: { [ANN.id]: { choice: { move: 'tackle' } } } })
    expect(after?.combatants).toEqual(before.combatants)
    expect(ann.fight()).toMatchObject({ round: before.round, locked: { [ANN.id]: { by: 'self' } } })

    // And it plays on: the last locks play the round.
    bob.run.intend(lock('splash'))
    again.command({ do: 'lock', who: FOE, choice: { do: 'move', move: 'splash' } })
    expect(again.view().table?.round).toBe(before.round + 1)
  })

  it('is kept again when only the engine changed: a Speed exchange between enemies survives the app closing', async () => {
    const { gm: master, launch, view, kept } = table()
    await launch(pair.id)
    const order = view().table?.order.filter((id) => id.startsWith('enemy-'))
    const keptBefore = kept.fights.length
    expect(master().command({ do: 'switch', who: 'enemy-slow-0001', with: 'enemy-fast-0001' })).toBeUndefined()
    expect(view().table?.order.filter((id) => id.startsWith('enemy-'))).toEqual([...(order ?? [])].reverse())
    expect(kept.fights.length).toBe(keptBefore + 1)
    const saved = kept.fights.at(-1)
    if (!saved) throw new Error('The fight was not kept')
    expect(DenbornBattle.restore(saved.battle).turnOrder({}).filter((id) => id.startsWith('enemy-'))).toEqual([...(order ?? [])].reverse())
  })

  it('is not taken up again when it was kept by another version of the battle engine (decision 139)', async () => {
    const { launch, kept, reopen } = table()
    await launch()
    const saved = kept.fights.at(-1)
    if (!saved) throw new Error('The fight was not kept')
    const again = reopen(() => Promise.reject(new BattleRuleError('snapshot-version', 'Kept by another engine')))
    expect(await again.resume(saved)).toBe('stale')
    expect(again.view().table).toBeUndefined()
    // Nothing of it stands in the way of starting the encounter again.
    expect(await again.launch(encounter.id)).toBeUndefined()
  })

  it('wakes by itself when the timer runs out', async () => {
    vi.useFakeTimers()
    const { ann, launch, view } = table({ timerSeconds: 30 })
    await launch()
    vi.advanceTimersByTime(29_999)
    expect(view().table?.timer.expired).toBe(false)
    vi.advanceTimersByTime(1)
    expect(view().table).toMatchObject({ timer: { expired: true }, locked: { [ANN.id]: { by: 'timer' }, [BOB.id]: { by: 'timer' } } })
    expect(ann.fight()?.timer.expired).toBe(true)
    // Players choose no more: the answer says so.
    const late = ann.run.intend(lock('splash'))
    expect(ann.answer()).toEqual({ id: late, refused: 'closed' })
  })
})

describe('a character\'s progress during a session (milestone 7)', () => {
  const HURT = { ...BOB, hp: 5 }
  const potion = { do: 'item', item: 'potion', target: BOB.id } as const

  it('makes a change a player asks on the game master\'s side, once, and tells everyone the sheets it changed', () => {
    const { ann, bob, view, kept } = table({ bob: HURT })
    const asked = ann.run.change(potion)
    expect(ann.changed()).toEqual({ id: asked })
    // The item left Ann's Bag and healed Bob: both copies changed, in the session and in the campaign.
    expect(view().session.party.map((member) => [member.character.hp, member.character.bag])).toEqual([[ANN.hp, [{ item: 'potion', quantity: 2 }]], [25, BOB.bag]])
    expect(kept.characters.find((character) => character.id === BOB.id)?.hp).toBe(25)
    // Each device is told the party, and is given the copy of its own character to keep.
    expect(bob.party()?.members.map((member) => member.character.hp)).toEqual([ANN.hp, 25])
    expect(bob.copies().at(-1)).toMatchObject({ id: BOB.id, hp: 25 })
    expect(ann.copies().at(-1)).toMatchObject({ id: ANN.id, bag: [{ item: 'potion', quantity: 2 }] })

    // The same request arriving again is answered and not made again.
    ann.again()
    expect(view().session.party[1]?.character.hp).toBe(25)
    expect(ann.changed()).toEqual({ id: asked })
  })

  it('answers with the rule\'s own word when a change cannot be made, and changes nothing', () => {
    const { ann, view } = table()
    const before = view().session
    const asked = ann.run.change(potion)
    // Bob is at full HP: the item would do nothing.
    expect(ann.changed()).toEqual({ id: asked, refused: 'no-effect' })
    expect(view().session.party).toEqual(before.party)
    expect(view().session.revision).toBe(before.revision)
  })

  it('leaves the sheets alone while a fight is on', async () => {
    const { ann, launch, view } = table({ bob: HURT })
    await launch()
    const asked = ann.run.change(potion)
    expect(ann.changed()).toEqual({ id: asked, refused: 'fight-on' })
    expect(view().session.party[1]?.character.hp).toBe(5)
    expect(view().session.party[0]?.character.bag).toEqual(ANN.bag)
  })

  it('rests a character when the game master says so, and lets its player choose its Ability and moves again, once', () => {
    const { gm: master, ann, bob, view } = table({ bob: { ...HURT, status: 'psn' } })
    const gm = master()
    // Before any rest, moves are not chosen again.
    bob.run.change({ do: 'reselect', ability: 'immunity', moves: ['splash'] })
    expect(bob.changed()?.refused).toBe('not-resting')

    expect(gm.rest(BOB.id)).toBeUndefined()
    expect(view().session.party[1]?.character).toMatchObject({ hp: maxHpOf(BOB, pack) })
    expect(view().session.party[1]?.character.status).toBeUndefined()
    // Bob's player is told the rest is open; Ann's sees it too, and her own character is not resting.
    expect(bob.me()?.resting).toBe(true)
    expect(ann.party()?.members.map((member) => member.resting)).toEqual([false, true])

    const chosen = bob.run.change({ do: 'reselect', ability: 'immunity', moves: ['splash'] })
    expect(bob.changed()).toEqual({ id: chosen })
    expect(view().session.party[1]?.character.moves).toEqual([{ id: 'splash', ppUps: 0, pp: 40 }])
    expect(bob.me()?.resting).toBe(false)
    bob.run.change({ do: 'reselect', ability: 'immunity', moves: ['tackle'] })
    expect(bob.changed()?.refused).toBe('not-resting')
  })

  it('closes every rest when a fight begins', async () => {
    const { gm: master, ann, launch } = table()
    master().rest(ANN.id)
    expect(ann.me()?.resting).toBe(true)
    await launch()
    expect(ann.me()?.resting).toBe(false)
  })

  it('tells the game master why a rest or a grant did nothing', async () => {
    const { gm: master, launch, view } = table()
    const gm = master()
    const before = view().session
    expect(gm.rest('hero-nobody-0001')).toBe('unknown-character')
    expect(gm.grant(ANN.id, { items: [{ item: 'potion', quantity: -4 }] })).toBe('not-enough')
    expect(gm.grant('hero-nobody-0001', { money: 5 })).toBe('unknown-character')
    expect(view().session).toEqual(before)
    await launch()
    expect(gm.rest(ANN.id)).toBe('fight-on')
    expect(gm.grant(ANN.id, { money: 5 })).toBe('fight-on')
  })

  it('gives what the game master grants, tells that player what it was, and everyone the sheet', () => {
    const { gm: master, ann, bob, view } = table()
    const exp = 1000
    expect(master().grant(ANN.id, { exp, money: -100, items: [{ item: 'potion', quantity: 2 }] })).toBeUndefined()
    const after = view().session.party[0]?.character
    expect(after).toMatchObject({ exp: ANN.exp + exp, money: ANN.money - 100, bag: [{ item: 'potion', quantity: 5 }] })
    expect(after?.level).toBeGreaterThan(ANN.level)
    expect(ann.granted()).toEqual({ exp, money: -100, items: [{ item: 'potion', quantity: 2 }], level: { from: ANN.level, to: after?.level } })
    // Only the one it was given to is told what was given; everyone sees the sheet.
    expect(bob.granted()).toBeUndefined()
    expect(bob.party()?.members[0]?.character.level).toBe(after?.level)
    ann.run.grantedRead()
    expect(ann.granted()).toBeUndefined()
  })
})
