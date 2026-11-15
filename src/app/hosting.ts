/**
 * The session this app is hosting, kept above the pages: the game master may
 * look at other screens (prepare an encounter, read a sheet) while the
 * players stay in (decision 143). It ends when the game master ends it; a
 * reload of the app takes it up again from what the device remembers
 * (decision 122).
 */
import { create } from 'zustand'
import type { DataPack } from '../data/types'
import { type HostRun, type HostView, runHost } from '../features/session/run-host'
import { sameValue } from '../shared/same-value'
import type { CampaignDocument } from '../shared/schema/campaign'
import type { WriteResult } from '../storage/library'
import { useLibrary } from './library-store'
import { sessionKeys } from './session-keys'

export interface Hosted {
  campaignId: string
  /** The join code of the session's room. */
  code: string
  view: HostView
  /** Set when the device could not keep the copy of a character that joined. */
  notKept?: Extract<WriteResult, { ok: false }>['reason']
}

interface HostingState {
  hosted: Hosted | undefined
  /** Hosts a campaign, or goes on hosting it. Hosting another campaign leaves the first one's players waiting. */
  start: (campaignId: string, pack: DataPack) => void
  approve: (peer: string, keep: 'theirs' | 'mine') => void
  decline: (peer: string) => void
  remove: (peer: string) => void
  /** Ends the session for everyone: its code stops working, and the next session gets another. */
  end: () => void
}

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
    })
    run = started
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
