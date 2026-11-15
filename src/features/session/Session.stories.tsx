import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { sampleCharacter, sampleRules } from '../../domain/samples'
import type { Party } from '../../shared/protocol/session'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { CharacterDocument } from '../../shared/schema/character'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { HostScreen } from './HostScreen'
import { JoinScreen } from './JoinScreen'
import type { GuestState, Out } from './guest'
import type { HostSession } from './host'
import type { HostLine } from './run-host'

const CODE = 'K7PQ4X'
const ORIGIN = 'https://denborn-website.kori-san.workers.dev'
const CAMPAIGN = { id: 'Hn4wB9cE2yU6sJ5d', name: 'Les Égarés de Denborn' }

/** A few characters of the sample campaign, of different species, for the board. */
function heroes(pack: DataPack): CharacterDocument[] {
  const base = sampleCharacter(pack, 12, 'Braise', 4, 2)
  const of = (id: string, nickname: string, species: string, level: number, gender: CharacterDocument['gender']): CharacterDocument => ({ ...base, id, nickname, species, level, gender })
  return [
    of('hero-braise-0001', 'Braise', 'charmander', 12, 'M'),
    of('hero-volt-00001', 'Volt', 'pikachu', 11, 'F'),
    of('hero-mousse-0001', 'Mousse', 'bulbasaur', 12, 'M'),
    of('hero-ombre-0001', 'Ombre', 'gastly', 13, 'M'),
    of('hero-galet-0001', 'Galet', 'geodude', 10, 'F'),
  ]
}

function campaign(pack: DataPack, characters: CharacterDocument[] = []): CampaignDocument {
  return { kind: 'denborn.campaign', schemaVersion: 1, ...CAMPAIGN, revision: 4, dataPackVersion: pack.version, rulesHistory: [{ ...sampleRules(pack, 2, 2, 4), version: 1 }], characters }
}

interface HostArgs {
  line: HostLine
  /** How many characters are in. */
  party: number
}

function Hosting({ line, party }: HostArgs) {
  const pack = usePack()
  const [braise, volt, mousse, ombre, galet] = heroes(pack)
  const all = [braise, volt, mousse].filter((character) => character !== undefined)
  const [session, setSession] = useState<HostSession>(() => ({
    campaign: campaign(pack),
    revision: 3,
    party: all.slice(0, party).map((character, index) => ({ peer: `peer-${index}`, character, present: index !== 1 })),
    requests: [
      ...(ombre ? [{ peer: 'peer-ombre', character: ombre, standing: 'new' as const }] : []),
      ...(galet ? [{ peer: 'peer-galet', character: { ...galet, level: 11, exp: 1400, hp: 31, money: 3250 }, kept: { ...galet, exp: 1010, hp: 12, money: 2900 }, standing: 'newer' as const }] : []),
    ],
  }))
  // On the board the buttons change what is shown, the way the real session would.
  const approve = (peer: string, keep: 'theirs' | 'mine'): void => {
    const request = session.requests.find((entry) => entry.peer === peer)
    if (!request) return
    const character = keep === 'mine' && request.kept ? request.kept : request.character
    setSession({ ...session, requests: session.requests.filter((entry) => entry !== request), party: [...session.party, { peer, character, present: true }] })
  }
  return (
    <Phone>
      <HostScreen
        key={`${line}-${party}`}
        pack={pack}
        session={session}
        code={CODE}
        origin={ORIGIN}
        line={line}
        onApprove={approve}
        onDecline={(peer) => setSession({ ...session, requests: session.requests.filter((entry) => entry.peer !== peer) })}
        onRemove={(peer) => setSession({ ...session, party: session.party.filter((member) => member.peer !== peer) })}
        onEnd={() => undefined}
        onCopy={() => Promise.resolve(true)}
        onBack={() => undefined}
      />
    </Phone>
  )
}

/** Each way of being out, under a plain name: the board's controls and addresses take no spaces. */
const OUTS: Record<string, Out> = {
  refusedFull: { why: 'refused', reason: 'full' },
  refusedDeclined: { why: 'refused', reason: 'declined' },
  refusedOtherCampaign: { why: 'refused', reason: 'other-campaign' },
  refusedBreaksRules: { why: 'refused', reason: 'invalid' },
  refusedAlreadyIn: { why: 'refused', reason: 'already-in' },
  refusedOtherData: { why: 'refused', reason: 'other-data' },
  removed: { why: 'removed' },
  left: { why: 'left' },
  ended: { why: 'ended' },
  noSuchSession: { why: 'noSession' },
  elsewhere: { why: 'elsewhere' },
  update: { why: 'update' },
}

interface JoinArgs {
  step: 'code' | 'reaching' | 'hostAway' | 'choosing' | 'choosingNone' | 'asking' | 'waiting' | 'in' | 'inHostAway' | 'inLineDown' | 'out'
  out: keyof typeof OUTS
}

function Joining({ step, out }: JoinArgs) {
  const pack = usePack()
  const characters = heroes(pack).map((character) => ({ ...character, campaign: { ...CAMPAIGN, rulesVersion: 1 } }))
  const members = characters.slice(0, 4).map((character, index) => ({ character, present: index !== 2 }))
  const party: Party = { revision: 5, campaign: CAMPAIGN, you: characters[1]?.id ?? '', members }
  const states: Record<JoinArgs['step'], GuestState | undefined> = {
    code: undefined,
    reaching: { at: 'reaching' },
    hostAway: { at: 'hostAway' },
    choosing: { at: 'choosing', invitation: { campaign: CAMPAIGN, dataPackVersion: pack.version, rules: sampleRules(pack, 2, 2, 4) } },
    choosingNone: { at: 'choosing', invitation: { campaign: { id: 'another-campaign', name: 'Night Shift' }, dataPackVersion: pack.version, rules: sampleRules(pack, 2, 2, 4) } },
    asking: { at: 'asking' },
    waiting: { at: 'waiting' },
    in: { at: 'in', party, linked: true, hostThere: true },
    inHostAway: { at: 'in', party, linked: true, hostThere: false },
    inLineDown: { at: 'in', party, linked: false, hostThere: true },
    out: { at: 'out', ...(OUTS[out] ?? { why: 'ended' }) },
  }
  return (
    <Phone>
      <JoinScreen key={`${step}-${out}`} pack={pack} state={states[step]} characters={characters.slice(0, 2)} onCode={() => undefined} onChoose={() => undefined} onCreate={() => undefined} onLeave={() => undefined} onAgain={() => undefined} onBack={() => undefined} />
    </Phone>
  )
}

const meta = { title: 'Screens/Session' } satisfies Meta
export default meta

/** The game master hosting: the join code, who asks to come in, who is in. */
export const Host: StoryObj<HostArgs> = {
  args: { line: 'up', party: 3 },
  argTypes: {
    line: { control: 'select', options: ['connecting', 'up', 'down', 'replaced', 'notHost', 'update', 'ended'] },
    party: { control: { type: 'range', min: 0, max: 3, step: 1 } },
  },
  render: (args) => (
    <>
      <Hosting {...args} />
      <Note>
        The game master hosting a session (decision 124). On the top screen: the join code in large letters to read out, its QR code, the
        campaign. Below: COPY THE LINK, then who is asking to come in and the party. The second request is a character the game master
        already has a copy of, which differs (decision 13): both copies, which is more recent, and the pick. A tap on a member opens REMOVE
        FROM THE SESSION (decision 123). END THE SESSION asks first. Set <code>line</code> to see what is said when the connection is not
        there.
      </Note>
    </>
  ),
}

/** A player joining and being in a session. */
export const Join: StoryObj<JoinArgs> = {
  args: { step: 'code', out: 'refusedFull' },
  argTypes: {
    step: { control: 'select', options: ['code', 'reaching', 'hostAway', 'choosing', 'choosingNone', 'asking', 'waiting', 'in', 'inHostAway', 'inLineDown', 'out'] },
    out: { control: 'select', options: Object.keys(OUTS) },
  },
  render: (args) => (
    <>
      <Joining {...args} />
      <Note>
        A player’s side, from the home’s JOIN A SESSION. Set <code>step</code> to walk it: the code (typed, or filled in from the link or
        a scan), reaching the session, choosing among the characters made for the campaign being played (decision 119: one per device) or
        making a new one there and then (decision 128),
        waiting for the game master, then the party, with what is said when the game master is away or the connection drops (decision
        122). With <code>step</code> on “out”, set <code>out</code> to read each reason for not being in.
      </Note>
    </>
  ),
}
