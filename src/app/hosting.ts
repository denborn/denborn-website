/**
 * The session this app is hosting, kept above the pages: the game master may
 * look at other screens (prepare an encounter, read a sheet) while the
 * players stay in (decision 143). It ends when the game master ends it; a
 * reload of the app takes it up again from what the device remembers
 * (decision 122).
 */
import { create } from 'zustand'
import type { DataPack } from '../data/types'
import type { Grant } from '../domain/grants'
import type { RewardDefaults } from '../domain/rewards'
import type { FightCommand } from '../features/battle/fight'
import type { LaunchRefusal } from '../features/session/host'
import { type HostRun, type HostView, type KeptFight, runHost } from '../features/session/run-host'
import { sameValue } from '../shared/same-value'
import type { CampaignDocument } from '../shared/schema/campaign'
import type { WriteResult } from '../storage/library'
import { useLibrary } from './library-store'
import { browserStorage } from '../storage/browser'
import { openFightStore } from '../storage/fight-store'
import { memoryStorage } from '../storage/library'
import { sessionKeys } from './session-keys'

export interface Hosted {
  campaignId: string
  /** The join code of the session's room. */
  code: string
  view: HostView
  /** Set when the device could not keep the copy of a character that joined. */
  notKept?: Extract<WriteResult, { ok: false }>['reason']
  /** The encounter being launched, while the battle engine is fetched. */
  launching?: string
  /** Why the last launch made no fight. */
  noLaunch?: LaunchRefusal | 'engine'
  /** A fight kept from an earlier visit that this app's battle engine cannot play on (decision 139): its encounter. */
  stale?: { id: string; name: string }
  /** Set when the device could not keep the fight: it then lasts as long as the page. */
  fightNotKept?: true
  /** How long the relay took to answer the last check of the game master's line, in milliseconds; nothing while that is not known. */
  latency?: number
}

interface HostingState {
  hosted: Hosted | undefined
  /** Hosts a campaign, or goes on hosting it. Hosting another campaign leaves the first one's players waiting. */
  start: (campaignId: string, pack: DataPack) => void
  approve: (peer: string, keep: 'theirs' | 'mine') => void
  decline: (peer: string) => void
  remove: (peer: string) => void
  /** Launches an encounter of the campaign for the party (decision 143). */
  launch: (encounterId: string) => void
  /** The game master's own command in the fight; gives back why it changed nothing, when it did not. */
  command: (command: FightCommand) => string | undefined
  /** What the encounter being fought is worth to each character of the party. */
  rewards: () => RewardDefaults | undefined
  /** Ends the encounter and awards these amounts, by character. */
  closeFight: (awards: Readonly<Record<string, { exp: number; money: number }>>) => void
  /** Starts a rest at a Pokémon Center for a character of the party; gives back why it did nothing, when it did not. */
  rest: (character: string) => string | undefined
  /** Gives a character of the party items, Pokédollars or EXP, or takes from it; gives back why it did nothing, when it did not. */
  grant: (character: string, grant: Grant) => string | undefined
  /** A fight that cannot be taken up again is started again from its beginning, or ended with nothing changed (decision 139). */
  settleStale: (how: 'restart' | 'end') => void
  /** Ends the session for everyone: its code stops working, and the next session gets another. */
  end: () => void
}

/** The fight in progress, kept on this device so that it survives the page (or in the page's memory when the browser refuses its own storage). */
const fights = openFightStore(browserStorage() ?? memoryStorage())

/** The session's logic and its line: one at a time, outside React's state because it is not data to draw. */
let run: HostRun | undefined
let stopWatching: (() => void) | undefined

function kept(campaignId: string): CampaignDocument | undefined {
  const entry = useLibrary.getState().campaigns().find((stored) => stored.id === campaignId)
  return entry?.read.ok ? entry.read.value : undefined
}

export const useHosting = create<HostingState>((set, get) => ({
  hosted: undefined,
  start: (campaignId, pack) => {
    if (get().hosted?.campaignId === campaignId) return
    const campaign = kept(campaignId)
    if (!campaign) return
    run?.stop()
    stopWatching?.()
    const hosting = sessionKeys.hostingOf(campaignId)
    const started = runHost({
      campaign,
      pack,
      hosting,
      origin: window.location.origin,
      onChange: (view) => {
        const hosted = get().hosted
        if (hosted?.campaignId === campaignId) set({ hosted: { ...hosted, view } })
      },
      // The session writes the characters' copies and nothing else: they go into the campaign as the device keeps it now,
      // so that an encounter prepared meanwhile on another screen is not written over.
      onCharacters: (characters) => {
        const latest = kept(campaignId)
        if (!latest) return
        const saved = useLibrary.getState().saveCampaign({ ...latest, revision: latest.revision + 1, characters })
        const hosted = get().hosted
        if (!hosted) return
        const next: Hosted = { ...hosted }
        if (saved.ok) delete next.notKept
        else next.notKept = saved.reason
        set({ hosted: next })
      },
      onMembers: (members) => sessionKeys.keepMembers(campaignId, members),
      // The fight is kept after everything that changes it, and forgotten once it is over.
      onFight: (fight) => {
        const hosted = get().hosted
        if (!fight) fights.forget(campaignId)
        else if (!fights.keep(campaignId, fight) && hosted) set({ hosted: { ...hosted, fightNotKept: true } })
      },
      onLatency: (milliseconds) => {
        const hosted = get().hosted
        if (hosted?.campaignId !== campaignId) return
        const next: Hosted = { ...hosted }
        if (milliseconds === undefined) delete next.latency
        else next.latency = milliseconds
        set({ hosted: next })
      },
    })
    run = started
    // A fight kept from before the app closed is taken up again where it was; one this engine cannot play on is said so.
    const saved = fights.fightOf(campaignId)
    if (saved) {
      const { encounter } = saved.fight
      // The store checked that this is a kept fight; the table's own state is read back as it was written, and the engine checks its own.
      void started.resume(saved as unknown as KeptFight).then((problem) => {
        const hosted = get().hosted
        if (problem === 'stale' && hosted && run === started) set({ hosted: { ...hosted, stale: encounter } })
      })
    }
    // Whatever another screen changes of the campaign (its rules, its encounters), the session plays with.
    stopWatching = useLibrary.subscribe(() => {
      const latest = kept(campaignId)
      // A campaign taken off the device has nothing left to host: its session ends with it.
      if (!latest) get().end()
      else if (!sameValue(latest, started.view().session.campaign)) started.refresh(latest)
    })
    set({ hosted: { campaignId, code: hosting.code, view: started.view() } })
  },
  approve: (peer, keep) => run?.approve(peer, keep),
  decline: (peer) => run?.decline(peer),
  remove: (peer) => run?.remove(peer),
  launch: (encounterId) => {
    const hosted = get().hosted
    const hosting = run
    if (!hosted || !hosting || hosted.launching) return
    const starting: Hosted = { ...hosted, launching: encounterId }
    delete starting.noLaunch
    set({ hosted: starting })
    void hosting.launch(encounterId).then((problem) => {
      const now = get().hosted
      // The session may have ended, or another campaign's begun, while the engine was fetched.
      if (!now || run !== hosting) return
      const next: Hosted = { ...now }
      delete next.launching
      if (problem) next.noLaunch = problem
      set({ hosted: next })
    })
  },
  command: (command) => run?.command(command),
  rewards: () => run?.rewards(),
  closeFight: (awards) => run?.closeFight(awards),
  rest: (character) => run?.rest(character),
  grant: (character, grant) => run?.grant(character, grant),
  settleStale: (how) => {
    const hosted = get().hosted
    if (!hosted?.stale) return
    const { id } = hosted.stale
    fights.forget(hosted.campaignId)
    const next: Hosted = { ...hosted }
    delete next.stale
    set({ hosted: next })
    // Everyone is as they were before the fight: nothing of it was written to them. Starting again is launching anew.
    if (how === 'restart') get().launch(id)
  },
  end: () => {
    const hosted = get().hosted
    run?.end()
    stopWatching?.()
    run = undefined
    stopWatching = undefined
    if (hosted) sessionKeys.forgetHosting(hosted.campaignId)
    set({ hosted: undefined })
  },
}))
