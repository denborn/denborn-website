import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { maxHpOf } from '../../domain/character-check'
import { SAMPLE_CAMPAIGN, sampleRules } from '../../domain/samples'
import { expForLevel } from '../../game-rules/exp'
import { useMessages } from '../../i18n'
import { type SheetChange, encodeMessage } from '../../shared/protocol/session'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { CharacterDocument } from '../../shared/schema/character'
import { newId } from '../../storage/ids'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { sampleHero } from '../battle/samples'
import { type HostSession, type HostStep, hostStep, partyFor } from '../session/host'
import { GrantScreen } from './GrantScreen'
import { ProgressScreen, type ProgressView } from './ProgressScreen'

/** The device whose seat the board shows. */
const YOU = 'peer-you'
const zero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const even = { strength: 50, dexterity: 50, endurance: 50, perception: 50, charisma: 50, intelligence: 50 }
const none = { strength: 0, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 }

/** A hero with a few changes, at the HP its changed sheet gives it unless the changes say otherwise. */
function hero(pack: DataPack, id: string, species: string, level: number, nickname: string, changes: Partial<CharacterDocument> = {}): CharacterDocument {
  const made: CharacterDocument = { ...sampleHero(pack, sampleRules(pack, 2, 2, 4), id, species, level, nickname), exp: expForLevel(level) + 40, ...changes }
  return 'hp' in changes ? made : { ...made, hp: maxHpOf(made, pack) ?? made.hp }
}

type Who = 'braise' | 'volt' | 'ombre' | 'mousse'

/**
 * The party of the board, with the seat shown first. Braise has points to
 * place and its evolution's level; Volt has a Thunder Stone and a Bag worth
 * opening; Ombre lacks the Linking Cord; Mousse is down, its Bag open to the
 * others, unless `mousseUp`.
 */
function partyOf(pack: DataPack, seat: Who, mousseUp = false): CharacterDocument[] {
  const all: Record<Who, CharacterDocument> = {
    braise: hero(pack, 'hero-braise-0001', 'charmander', 18, 'Braise', {
      ivs: { ...zero, hp: 6, atk: 10, spe: 5 },
      evs: { ...zero, atk: 40, spe: 20 },
      attributes: { creation: even, gained: { ...none, strength: 6, dexterity: 4 } },
      bag: [{ item: 'potion', quantity: 2 }],
      status: 'psn',
    }),
    volt: hero(pack, 'hero-volt-00001', 'pikachu', 18, 'Volt', {
      ivs: { ...zero, spe: 31, spa: 2 },
      evs: { ...zero, spe: 91 },
      attributes: { creation: even, gained: { ...none, dexterity: 17 } },
      heldItem: 'oranberry',
      bag: [
        { item: 'potion', quantity: 3 },
        { item: 'ether', quantity: 1 },
        { item: 'ppup', quantity: 2 },
        { item: 'thunderstone', quantity: 1 },
        { item: 'leftovers', quantity: 1 },
        { item: 'xattack', quantity: 1 },
      ],
    }),
    ombre: hero(pack, 'hero-ombre-0001', 'haunter', 26, 'Ombre', { ivs: { ...zero, spa: 31, spe: 17 }, evs: { ...zero, spa: 132 }, attributes: { creation: even, gained: { ...none, intelligence: 25 } }, bag: [] }),
    mousse: hero(pack, 'hero-mousse-0001', 'bulbasaur', 12, 'Mousse', {
      ivs: { ...zero, hp: 22 },
      evs: { ...zero, hp: 61 },
      attributes: { creation: even, gained: { ...none, endurance: 11 } },
      bag: [
        { item: 'revive', quantity: 1 },
        { item: 'superpotion', quantity: 4 },
      ],
      ...(mousseUp ? {} : { hp: 0, condition: { state: 'downed', stacks: 2 } }),
    }),
  }
  const hurt = (character: CharacterDocument, by: number): CharacterDocument => ({ ...character, hp: Math.max(1, character.hp - by), moves: character.moves.map((slot, at) => (at < 2 ? { ...slot, pp: Math.max(0, slot.pp - 7) } : slot)) })
  all.braise = hurt(all.braise, 21)
  all.volt = hurt(all.volt, 9)
  return [all[seat], ...(Object.keys(all) as Who[]).filter((who) => who !== seat).map((who) => all[who])]
}

/** A session of the board's campaign with that party in it; when asked, the game master has just started a rest for the seat's character. */
function sessionOf(pack: DataPack, characters: CharacterDocument[], resting: boolean): HostSession {
  const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, ...SAMPLE_CAMPAIGN, revision: 1, dataPackVersion: pack.version, rulesHistory: [sampleRules(pack, 2, 2, 4)], characters, encounters: [] }
  const session: HostSession = { campaign, revision: 1, requests: [], party: characters.map((character, index) => ({ peer: index === 0 ? YOU : `peer-${index}`, character, present: true })) }
  return resting && characters[0] ? hostStep(session, { on: 'rest', character: characters[0].id }, pack).session : session
}

interface Seat {
  session: HostSession
  /** What the game master's side last answered to the seat. */
  changed?: { id: string; refused?: string }
}

/** What the seat's device would hear of a step of the game master's side. */
function heard(seat: Seat, step: HostStep): Seat {
  const answer = step.send.flatMap(({ to, message }) => (to.includes(YOU) && message.t === 'changeAnswer' ? [message] : [])).at(-1)
  return { session: step.session, ...(answer ? { changed: { id: answer.id, ...(answer.refused ? { refused: answer.refused } : {}) } } : seat.changed ? { changed: seat.changed } : {}) }
}

interface PlayerArgs {
  view: ProgressView
  who: Who
  resting: boolean
  /** Shows what is said while the game master's side cannot be asked. */
  hostAway: boolean
}

/** A player's seat, played by the real logic of the game master's side: what a button asks is answered as a session would answer it. */
function Player({ view, who, resting, hostAway }: PlayerArgs) {
  const pack = usePack()
  const messages = useMessages()
  const [seat, setSeat] = useState<Seat>(() => ({ session: sessionOf(pack, partyOf(pack, who), resting) }))
  const member = seat.session.party[0]
  if (!member) return null
  const ask = (change: SheetChange): string => {
    const id = newId()
    setSeat(heard(seat, hostStep(seat.session, { on: 'message', from: YOU, body: encodeMessage({ t: 'change', id, change }) }, pack)))
    return id
  }
  return (
    <Phone>
      <ProgressScreen
        pack={pack}
        party={partyFor(seat.session, member)}
        view={view}
        rules={seat.session.campaign.rulesHistory[0]}
        changed={seat.changed}
        unreachable={hostAway ? messages.session.join.hostGone : undefined}
        onChange={ask}
        onBack={() => undefined}
      />
    </Phone>
  )
}

const playerArgTypes = {
  view: { table: { disable: true } },
  who: { control: 'inline-radio', options: ['braise', 'volt', 'ombre', 'mousse'] },
  resting: { table: { disable: true } },
} as const

const meta = { title: 'Screens/Progress' } satisfies Meta
export default meta

/** Points a level brought, placed by the character's player. */
export const Points: StoryObj<PlayerArgs> = {
  args: { view: 'points', who: 'braise', resting: false, hostAway: false },
  argTypes: playerArgTypes,
  render: (args) => (
    <>
      <Player key={`${args.who}-${args.hostAway}`} {...args} />
      <Note>
        PLACE POINTS, from the session screen (decisions 8, 9, 95 and 96). Each kind of point shows while the character has some left: IVs, EVs, and
        the roleplay points of its levels. A total starts where the sheet has it and cannot go under: the − button stops there, and a lower
        number that is typed is brought back up to it. The top screen shows the stats as they would be, or the roleplay attributes while those are being moved.
        PLACE asks first, since placed points stay for good; the safe answer is the highlighted one, as everywhere in the app. Braise has all three
        kinds; set <code>who</code> to Volt to see a character with nothing to place. Set <code>hostAway</code> to see what is said while the game
        master’s side cannot be asked.
      </Note>
    </>
  ),
}

/** Evolution, asked for by the character's player. */
export const Evolve: StoryObj<PlayerArgs> = {
  args: { view: 'evolve', who: 'braise', resting: false, hostAway: false },
  argTypes: playerArgTypes,
  render: (args) => (
    <>
      <Player key={`${args.who}-${args.hostAway}`} {...args} />
      <Note>
        EVOLVE (decisions 7, 168 and 169). Each evolution of the species, with how it happens. One that can happen now is chosen, then confirmed
        with what it changes: the Ability it will have (it keeps its place, as in the games) and the item used up. Once evolved, the top screen
        shows the new Pokémon and the games’ “Congratulations!” is said. Set <code>who</code>: Braise evolves by level and is ready; Volt has its
        Thunder Stone; Ombre lacks the Linking Cord; Mousse lacks the level.
      </Note>
    </>
  ),
}

/** The Bag outside a fight, with a fallen teammate's Bag under it. */
export const Bag: StoryObj<PlayerArgs> = {
  args: { view: 'bag', who: 'volt', resting: false, hostAway: false },
  argTypes: playerArgTypes,
  render: (args) => (
    <>
      <Player key={`${args.who}-${args.hostAway}`} {...args} />
      <Note>
        BAG, outside a fight (decisions 3, 6, 12, 171, 172 and 175). What the character holds, with PUT AWAY; its money; its items. A tap on an item
        opens what can be done with it: USE when it does something outside a fight, HOLD when it can be held. USE asks on whom: every member of
        the party is listed, and those the item would do nothing for cannot be chosen. A PP item for one move, and a PP Up, then ask which move.
        Under the player’s own items, the Bag of each teammate who is downed or dead: USE works the same, and TAKE moves items into the
        player’s own Bag. Mousse is down here and carries the Revive: use it on Mousse and its Bag closes. Set <code>who</code> to Mousse to see
        what a downed character’s own player is shown.
      </Note>
    </>
  ),
}

/** A rest at a Pokémon Center: the Ability and the moves, chosen again. */
export const Rest: StoryObj<PlayerArgs> = {
  args: { view: 'rest', who: 'braise', resting: true, hostAway: false },
  argTypes: { ...playerArgTypes, resting: { control: 'boolean' } },
  render: (args) => (
    <>
      <Player key={`${args.who}-${args.resting}-${args.hostAway}`} {...args} />
      <Note>
        POKÉMON CENTER, once the game master started a rest for the character (spec section 3; decisions 3 and 11). Its Ability among those of its
        species, and up to six of the moves it may know at its level under the campaign’s rules. A move it knows is marked and keeps its PP;
        dropping one that has PP Ups says they are lost before it happens. CONFIRM ends the rest. With <code>resting</code> off, what is shown
        when no rest is open.
      </Note>
    </>
  ),
}

/** The game master giving a character items, Pokédollars and EXP, or taking them. */
function Granting({ who }: { who: Who }) {
  const pack = usePack()
  const [session, setSession] = useState(() => sessionOf(pack, partyOf(pack, who, true), false))
  const [told, setTold] = useState<string>()
  const member = session.party[0]
  if (!member) return null
  return (
    <>
      <Phone>
        <GrantScreen
          key={member.character.revision}
          pack={pack}
          character={member.character}
          onGrant={(grant) => {
            const step = hostStep(session, { on: 'grant', character: member.character.id, grant }, pack)
            setSession(step.session)
            const granted = step.send.flatMap(({ message }) => (message.t === 'granted' ? [message.granted] : [])).at(-1)
            setTold(granted ? JSON.stringify(granted) : undefined)
            return step.refused
          }}
          onDone={() => undefined}
        />
      </Phone>
      {told && <Note>Told to the player’s device: {told}</Note>}
    </>
  )
}

export const GiveOrTake: StoryObj<{ who: Who }> = {
  args: { who: 'volt' },
  argTypes: { who: { control: 'inline-radio', options: ['braise', 'volt', 'ombre', 'mousse'] } },
  render: (args) => (
    <>
      <Granting key={args.who} {...args} />
      <Note>
        GIVE OR TAKE, from a member of the party on the hosting screen (decisions 5 and 170). EXP is only ever given, and says the level it
        reaches. The Pokédollars and the Bag are set to what they should be: the difference is what is given or taken. Nothing changes before
        CONFIRM; the player is then told what they got and what they lost (on the board, the message appears under the phone, and the screen
        starts again from the changed sheet).
      </Note>
    </>
  ),
}
