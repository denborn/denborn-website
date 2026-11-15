/**
 * A fight inside a live session, end to end but for the network: the game
 * master's side and two players' sides, each the real logic and the real
 * runner, joined by a relay the test plays. Every message goes through the
 * wire's form and the receiver's checks; the fight is played by the real
 * engine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DenbornBattle } from '../../battle/denborn-battle'
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
import { runHost } from '../session/run-host'
import { runGuest } from '../session/run-guest'

// A pack of the test's own, with two species the real engine knows: the characters must pass the
// session's checks and fight in the engine.
const pack: DataPack = {
  ...testPack,
  species: {
    machamp: species('machamp', 68, { genders: ['M', 'F'], abilities: ['guts'], baseStats: { hp: 90, atk: 130, def: 80, spa: 65, spd: 85, spe: 55 }, learnset: [{ move: 'tackle', level: 1 }, { move: 'splash', level: 1 }] }),
    snorlax: species('snorlax', 143, { genders: ['M', 'F'], abilities: ['immunity'], baseStats: { hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30 }, learnset: [{ move: 'tackle', level: 1 }, { move: 'splash', level: 1 }] }),
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
const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: pack.version, name: 'Test', rulesHistory: [rules], characters: [], encounters: [encounter] }

/** What the wire does to a message: only what JSON carries arrives. */
const wired = (body: unknown): unknown => JSON.parse(JSON.stringify(body)) as unknown

/** The game master and players at one table, with the test in the relay's place. */
function table(options: { timerSeconds?: number } = {}) {
  let host: RelayLinkOptions | undefined
  /** Each player's device as the relay knows it: its line, and whether it is connected. */
  const devices = new Map<string, { line: RelayLinkOptions; online: boolean }>()
  const toHost = (peer: string, body: unknown): void => host?.onFrame({ t: 'msg', from: peer, body: wired(body) })
  /** The battles the engine was asked to start, by their seed. */
  const battles: string[] = []

  const gm = runHost({
    campaign,
    pack,
    hosting: { code: 'ABCDEF', secret: 'host-secret-0123456789abcdef', members: [] },
    origin: 'https://denborn.test',
    onChange: () => undefined,
    onCharacters: () => undefined,
    onMembers: () => undefined,
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
  host?.onFrame({ t: 'hosting', peers: [] })

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
      onKeep: () => undefined,
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
  const bob = player('peer-bob', BOB)
  const launch = () => gm.launch(encounter.id, options.timerSeconds === undefined ? {} : { timerSeconds: options.timerSeconds })
  return { gm, ann, bob, launch, view: () => gm.view(), toHost, battles }
}

const lock = (move: string, target?: string): Intent => ({ do: 'lock', choice: { do: 'move', move, ...(target ? { target } : {}) } })

afterEach(() => {
  vi.useRealTimers()
})

describe('a fight inside a session', () => {
  it('is launched by the game master, told to every player, and played when the last Pokémon is locked', async () => {
    const { gm, ann, bob, launch, view } = table()
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

  it('refuses a launch that makes no fight, and a second one while a fight is on', async () => {
    const { gm, launch, battles } = table()
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
    const { gm, ann, bob, launch, view, toHost } = table()
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
    const { gm, ann, bob, launch, view } = table({ timerSeconds: 60 })
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
