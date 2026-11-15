/**
 * A session being hosted: the game master's logic (host.ts) tied to its line
 * to the relay. What the relay says becomes events; what the logic wants
 * said goes out on the line; what must outlive the page is handed over to be
 * kept. The screen is told the session and the state of the line each time
 * either changes.
 */
import type { DataPack } from '../../data/types.ts'
import { type RelayLink, type RelayLinkOptions, openRelayLink, roomUrl } from '../../network/relay-link.ts'
import { CLOSED } from '../../shared/protocol/relay.ts'
import { encodeMessage } from '../../shared/protocol/session.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import type { Hosting } from '../../storage/session-keys.ts'
import { type HostEvent, type HostSession, hostStep, openSession } from './host.ts'

/** How the game master's line to the relay stands: on its way, there, dropped and coming back, or over and why. */
export type HostLine = 'connecting' | 'up' | 'down' | 'replaced' | 'notHost' | 'update' | 'ended'

export interface HostView {
  session: HostSession
  line: HostLine
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
}

export interface HostRun {
  view(): HostView
  approve(peer: string, keep: 'theirs' | 'mine'): void
  decline(peer: string): void
  remove(peer: string): void
  /** Takes in the campaign as the device now keeps it, after another screen changed it while the session went on. */
  refresh(campaign: CampaignDocument): void
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

export function runHost(options: HostRunOptions): HostRun {
  let session = openSession(options.campaign, options.hosting.members)
  let line: HostLine = 'connecting'

  const apply = (event: HostEvent): void => {
    const before = session
    const step = hostStep(session, event, options.pack)
    session = step.session
    for (const { to, message } of step.send) link.send({ t: 'send', to, body: encodeMessage(message) })
    // The copies of the characters are this session's to write; the rest of the campaign belongs to other screens.
    if (event.on !== 'campaign' && session.campaign.characters !== before.campaign.characters) options.onCharacters(session.campaign.characters)
    if (JSON.stringify(membersOf(session)) !== JSON.stringify(membersOf(before))) options.onMembers(membersOf(session))
    options.onChange({ session, line })
  }

  const link = (options.open ?? openRelayLink)({
    url: roomUrl(options.hosting.code, options.origin),
    hello: { t: 'host', secret: options.hosting.secret },
    // Connected is not yet hosting: the line is up once the relay says the room is this game master's.
    onUp: () => undefined,
    onFrame: (frame) => {
      if (frame.t === 'hosting') {
        line = 'up'
        options.onChange({ session, line })
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
    view: () => ({ session, line }),
    approve: (peer, keep) => apply({ on: 'approve', peer, keep }),
    decline: (peer) => apply({ on: 'decline', peer }),
    remove: (peer) => apply({ on: 'remove', peer }),
    refresh: (campaign) => apply({ on: 'campaign', campaign }),
    end: () => {
      // Said to the relay when it can be heard; either way this device hosts that room no more.
      link.send({ t: 'end' })
      link.close()
      line = 'ended'
      apply({ on: 'offline' })
    },
    stop: () => link.close(),
  }
}
