/**
 * A session being hosted: the game master's logic (host.ts) tied to its line
 * to the relay. What the relay says becomes events; what the logic wants
 * said goes out on the line; what must outlive the page is handed over to be
 * kept. The screen is told the session and the state of the line each time
 * either changes.
 */
import { BattleRuleError, type BattleSetup, type BattleSnapshot, type RoundResult } from '../../battle/contract.ts'
import type { DataPack } from '../../data/types.ts'
import type { Grant } from '../../domain/grants.ts'
import type { RewardDefaults } from '../../domain/rewards.ts'
import { type RelayLink, type RelayLinkOptions, openRelayLink, roomUrl } from '../../network/relay-link.ts'
import { CLOSED } from '../../shared/protocol/relay.ts'
import { encodeMessage } from '../../shared/protocol/session.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import type { Hosting } from '../../storage/session-keys.ts'
import { seedFrom } from '../battle/fight-setup.ts'
import type { Fight, FightCommand, FightEngine, TableView } from '../battle/fight.ts'
import { type FightTable, type HostEvent, type HostSession, type HostStep, type LaunchRefusal, hostStep, launchFor, openSession, rewardsOf, tableOf } from './host.ts'

/** How the game master's line to the relay stands: on its way, there, dropped and coming back, or over and why. */
export type HostLine = 'connecting' | 'up' | 'down' | 'replaced' | 'notHost' | 'update' | 'ended'

export interface HostView {
  session: HostSession
  line: HostLine
  /** The fight as the game master is shown it, while one is on. */
  table?: TableView
}

/** A battle the engine has started: what the fight drives, what happened as the Pokémon entered, and the way to keep it. */
export type StartedBattle = FightEngine & { opening: RoundResult; snapshot(): BattleSnapshot }

/** A fight as it is kept between two visits: the table around it, and the engine's own state. */
export interface KeptFight {
  fight: Fight
  battle: BattleSnapshot
}

export interface LaunchOptions {
  /** How long players get each round; nothing for no timer. */
  timerSeconds?: number
  /** The characters who take part, when not the whole party. */
  only?: readonly string[]
}

export interface HostRunOptions {
  campaign: CampaignDocument
  pack: DataPack
  /** The room, its secret, and the party as this device remembers it. */
  hosting: Hosting
  /** The site's address, where the relay lives. */
  origin: string
  onChange: (view: HostView) => void
  /** A character's copy joined the campaign: the copies to be kept in it, in the place of those it has. */
  onCharacters: (characters: CampaignDocument['characters']) => void
  /** Who is in the party changed. To be remembered for the next visit. */
  onMembers: (members: Hosting['members']) => void
  /** Opens the line. The real one by default; a test passes its own. */
  open?: (options: RelayLinkOptions) => RelayLink
  /** Starts a battle. By default the real engine, which is downloaded then: only a game master who launches a fight needs it. */
  startBattle?: (setup: BattleSetup) => Promise<StartedBattle>
  /** Brings a kept battle back. By default the real engine; it refuses a battle kept by another version of itself (decision 139). */
  restoreBattle?: (snapshot: BattleSnapshot) => Promise<StartedBattle>
  /** The fight changed: what to keep so that it survives the page, or nothing once it is over. */
  onFight?: (kept: KeptFight | undefined) => void
  /** Random bytes, for the seed of a fight. The browser's own by default. */
  random?: (length: number) => Uint8Array
  /** The clock, in milliseconds. */
  now?: () => number
}

export interface HostRun {
  view(): HostView
  approve(peer: string, keep: 'theirs' | 'mine'): void
  decline(peer: string): void
  remove(peer: string): void
  /** Takes in the campaign as the device now keeps it, after another screen changed it while the session went on. */
  refresh(campaign: CampaignDocument): void
  /**
   * Launches an encounter of the campaign for the party (decision 143): the
   * fight is on, and told to the players, once this settles with nothing.
   * Otherwise it settles with why there is no fight.
   */
  launch(encounterId: string, options?: LaunchOptions): Promise<LaunchRefusal | 'engine' | undefined>
  /** The game master's own command in the fight. Gives back why it changed nothing, when it did not. */
  command(command: FightCommand): string | undefined
  /**
   * Takes up a fight kept from an earlier visit. Settles with 'stale' when it
   * was kept by another version of the battle engine and cannot be played on
   * (decision 139), with nothing once the fight is on again.
   */
  resume(kept: KeptFight): Promise<'stale' | undefined>
  /** What the encounter being fought is worth to each character of the party, with only the enemies defeated so far counted. */
  rewards(): RewardDefaults | undefined
  /** Ends the encounter: everyone who fought is left as the fight left them, and each character named is awarded its amounts. */
  closeFight(awards: Readonly<Record<string, { exp: number; money: number }>>): void
  /** Starts a rest at a Pokémon Center for one character of the party (decision 11). Gives back why it did nothing, when it did not. */
  rest(character: string): string | undefined
  /** Gives one character of the party items, Pokédollars or EXP, or takes items or Pokédollars from it. Gives back why it did nothing, when it did not. */
  grant(character: string, grant: Grant): string | undefined
  /** Ends the session for everyone: the code stops working. */
  end(): void
  /** Leaves the hosting without ending it: players wait, and the session can be taken up again. */
  stop(): void
}

const membersOf = (session: HostSession): Hosting['members'] => session.party.map((member) => ({ peer: member.peer, character: member.character.id }))

function lineAfter(code: number, comingBack: boolean): HostLine {
  if (comingBack) return 'down'
  if (code === CLOSED.replaced) return 'replaced'
  if (code === CLOSED.notHost) return 'notHost'
  if (code === CLOSED.ended) return 'ended'
  return 'update'
}

async function startRealBattle(setup: BattleSetup): Promise<StartedBattle> {
  const { DenbornBattle } = await import('../../battle/denborn-battle.ts')
  return DenbornBattle.start(setup)
}

async function restoreRealBattle(snapshot: BattleSnapshot): Promise<StartedBattle> {
  const { DenbornBattle } = await import('../../battle/denborn-battle.ts')
  return DenbornBattle.restore(snapshot)
}

export function runHost(options: HostRunOptions): HostRun {
  const now = options.now ?? Date.now
  const random = options.random ?? ((length: number) => crypto.getRandomValues(new Uint8Array(length)))
  let session = openSession(options.campaign, options.hosting.members)
  let line: HostLine = 'connecting'
  /** The engine playing the fight, while one is on. */
  let engine: StartedBattle | undefined
  /** Wakes the session when the fight's timer runs out. */
  let alarm: ReturnType<typeof setTimeout> | undefined

  const table = (): FightTable | undefined => (engine ? { engine, now: now() } : undefined)
  const view = (): HostView => {
    const shown = tableOf(session, options.pack, table())
    return { session, line, ...(shown ? { table: shown } : {}) }
  }

  const apply = (event: HostEvent): HostStep => {
    const before = session
    const step = hostStep(session, event, options.pack, table())
    session = step.session
    for (const { to, message } of step.send) link.send({ t: 'send', to, body: encodeMessage(message) })
    // The copies of the characters are this session's to write; the rest of the campaign belongs to other screens.
    if (event.on !== 'campaign' && session.campaign.characters !== before.campaign.characters) options.onCharacters(session.campaign.characters)
    if (JSON.stringify(membersOf(session)) !== JSON.stringify(membersOf(before))) options.onMembers(membersOf(session))
    // Kept after everything that changes it, so that a page that closes loses nothing of the fight. Over, it is kept no more.
    if (session.fight !== before.fight) {
      if (session.fight && engine) options.onFight?.({ fight: session.fight, battle: engine.snapshot() })
      else {
        engine = undefined
        options.onFight?.(undefined)
      }
    }
    watchTimer()
    options.onChange(view())
    return step
  }

  /** The session hears nothing while everyone thinks: when the timer is running, the clock itself is made an event. */
  const watchTimer = (): void => {
    clearTimeout(alarm)
    const deadline = session.fight?.timer.deadline
    if (deadline !== undefined) alarm = setTimeout(() => apply({ on: 'clock' }), Math.max(0, deadline - now()))
  }

  const link = (options.open ?? openRelayLink)({
    url: roomUrl(options.hosting.code, options.origin),
    hello: { t: 'host', secret: options.hosting.secret },
    // Connected is not yet hosting: the line is up once the relay says the room is this game master's.
    onUp: () => undefined,
    onFrame: (frame) => {
      if (frame.t === 'hosting') {
        line = 'up'
        options.onChange(view())
      } else if (frame.t === 'peer') {
        apply({ on: 'peer', peer: frame.peer, present: frame.present })
      } else if (frame.t === 'msg' && frame.from !== undefined) {
        apply({ on: 'message', from: frame.from, body: frame.body })
      }
    },
    onDown: (code, comingBack) => {
      line = lineAfter(code, comingBack)
      apply({ on: 'offline' })
    },
  })

  return {
    view,
    approve: (peer, keep) => void apply({ on: 'approve', peer, keep }),
    decline: (peer) => void apply({ on: 'decline', peer }),
    remove: (peer) => void apply({ on: 'remove', peer }),
    refresh: (campaign) => void apply({ on: 'campaign', campaign }),
    launch: async (encounterId, launch = {}) => {
      const made = launchFor(session, encounterId, seedFrom(random(8)), launch.only)
      if (!made.ok) return made.problem
      let started: StartedBattle
      try {
        started = await (options.startBattle ?? startRealBattle)(made.setup)
      } catch (error) {
        // The engine refused the battle itself: a Pokémon it does not know, a line it cannot hold.
        if (error instanceof BattleRuleError) return 'engine'
        throw error
      }
      // The session went on while the engine was fetched: another launch may have got there first.
      if (session.fight) return 'fight-on'
      engine = started
      apply({ on: 'launched', start: { ...made.start, timerSeconds: launch.timerSeconds, opening: started.opening } })
      return undefined
    },
    command: (command) => apply({ on: 'fight', command }).refused,
    resume: async (kept) => {
      let restored: StartedBattle
      try {
        restored = await (options.restoreBattle ?? restoreRealBattle)(kept.battle)
      } catch (error) {
        if (error instanceof BattleRuleError) return 'stale'
        throw error
      }
      if (session.fight) return undefined
      engine = restored
      apply({ on: 'resumed', fight: kept.fight })
      return undefined
    },
    rewards: () => rewardsOf(session, options.pack, table()),
    closeFight: (awards) => void apply({ on: 'closeFight', awards }),
    rest: (character) => apply({ on: 'rest', character }).refused,
    grant: (character, grant) => apply({ on: 'grant', character, grant }).refused,
    end: () => {
      // Said to the relay when it can be heard; either way this device hosts that room no more.
      link.send({ t: 'end' })
      link.close()
      line = 'ended'
      apply({ on: 'offline' })
      clearTimeout(alarm)
    },
    stop: () => {
      clearTimeout(alarm)
      link.close()
    },
  }
}
