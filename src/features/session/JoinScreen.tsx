import { type SyntheticEvent, useState } from 'react'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { Invitation } from '../../shared/codec/codes'
import { ROOM_CODE_LENGTH, joinCodeIn } from '../../shared/protocol/room-code'
import type { Party } from '../../shared/protocol/session'
import type { CharacterDocument } from '../../shared/schema/character'
import { OptionButton, PokemonIcon, PokemonSprite, Screen, Slot, StepHeader, TextField } from '../../ui'
import type { GuestState } from './guest'

export interface JoinScreenProps {
  pack: DataPack
  /** A join code given on arrival, from a link or a scan (decision 124). */
  code?: string | undefined
  /** Where this device stands in the session; nothing before a code was given. */
  state: GuestState | undefined
  /** The characters kept on this device. */
  characters: readonly CharacterDocument[]
  /** Reaches the session a code names. */
  onCode: (code: string) => void
  /** Asks to come in with a character. */
  onChoose: (character: CharacterDocument) => void
  /** Makes a new character for the campaign being played, under the rules the game master's side gave (decision 128). */
  onCreate: (invitation: Invitation) => void
  onLeave: () => void
  /** Starts over from the code, after being out. */
  onAgain: () => void
  onBack: () => void
}

/**
 * A player joining a session and being in it: the code, the character to
 * bring among those made for the campaign, the wait for the game master,
 * then the party; and each way of being out, said in words.
 */
export function JoinScreen({ pack, code: given, state, characters, onCode, onChoose, onCreate, onLeave, onAgain, onBack }: JoinScreenProps) {
  const messages = useMessages()
  const text = messages.session.join
  const [typed, setTyped] = useState(given ?? '')
  const [mistyped, setMistyped] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const party = state?.at === 'in' ? state.party : undefined
  const title = party ? text.inSession(party.campaign.name) : text.title

  const join = (event: SyntheticEvent): void => {
    event.preventDefault()
    const code = joinCodeIn(typed)
    setMistyped(code === undefined)
    if (code) onCode(code)
  }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={title}>
          {party ? (
            <div className="dn-lineup dn-lineup--party">
              {party.members.map(({ character }) => {
                const species = pack.species[character.species]
                return species ? <PokemonSprite key={character.id} species={species} name={character.nickname} female={character.gender === 'F'} scale={0.5} decorative /> : null
              })}
            </div>
          ) : (
            <div className="dn-lineup">
              <p className="dn-note dn-text-outline">{text.hint}</p>
            </div>
          )}
        </Screen>
      </div>
      <Screen kind="menu" label={title} tall>
        <StepHeader title={title} />
        <div className="dn-stack">
          {!state && (
            <form className="dn-entry" onSubmit={join}>
              <TextField
                label={text.code}
                value={typed}
                onChange={(value) => setTyped(value.toUpperCase())}
                hint={mistyped ? text.mistyped : text.codeHint}
                invalid={mistyped}
                // A pasted link is longer than the code it ends with.
                maxLength={200}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
              />
              <div className="dn-row">
                <OptionButton primary submit disabled={typed.trim().length < ROOM_CODE_LENGTH}>
                  {text.join}
                </OptionButton>
              </div>
            </form>
          )}
          {(state?.at === 'reaching' || state?.at === 'meeting') && <Status text={text.reaching} />}
          {state?.at === 'hostAway' && <Status text={text.hostAway} />}
          {state?.at === 'asking' && <Status text={text.asking} />}
          {state?.at === 'waiting' && <Status text={text.waiting} />}
          {state?.at === 'choosing' && <Choosing pack={pack} invitation={state.invitation} characters={characters} onChoose={onChoose} onCreate={onCreate} />}
          {state?.at === 'in' && (
            <>
              {!state.linked && <Status text={text.lineDown} />}
              {state.linked && !state.hostThere && <Status text={text.hostGone} />}
              <Members pack={pack} party={state.party} />
              {leaving && (
                <p className="dn-note dn-note--error" role="alert">
                  {text.leaveQuestion}
                </p>
              )}
            </>
          )}
          {state?.at === 'out' && (
            <p className="dn-note dn-note--error" role="alert">
              {state.why === 'refused' ? text.out.refused[state.reason] : text.out[state.why]}
            </p>
          )}
        </div>
        <div className="dn-foot">
          {state?.at === 'in' && leaving && (
            <>
              <OptionButton primary onClick={() => setLeaving(false)}>
                {text.leaveNo}
              </OptionButton>
              <OptionButton onClick={onLeave}>{text.leaveYes}</OptionButton>
            </>
          )}
          {state?.at === 'in' && !leaving && <OptionButton onClick={() => setLeaving(true)}>{text.leave}</OptionButton>}
          {state?.at === 'out' && (
            <>
              <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
              <OptionButton primary onClick={onAgain}>
                {text.again}
              </OptionButton>
            </>
          )}
          {state?.at !== 'in' && state?.at !== 'out' && <OptionButton onClick={state ? onLeave : onBack}>{messages.nav.back}</OptionButton>}
        </div>
      </Screen>
    </div>
  )
}

/** A line that says where things stand, read out when it changes. */
function Status({ text }: { text: string }) {
  return (
    <p className="dn-note" role="status">
      {text}
    </p>
  )
}

/** The party as a member sees it: everyone in it, who is there, and which one is theirs. */
function Members({ pack, party }: { pack: DataPack; party: Party }) {
  const language = useLanguage()
  const messages = useMessages()
  const host = messages.session.host
  return (
    <ul className="dn-list">
      {party.members.map(({ character, present }) => {
        const species = pack.species[character.species]
        return (
          <li key={character.id} className="dn-slot">
            {species && <PokemonIcon num={species.num} />}
            <span className="dn-slot__text">
              <span className="dn-text-shadow">
                {character.nickname}
                {character.id === party.you && ` (${messages.session.join.you})`}
              </span>
              <span className="dn-note">
                {host.who(species?.name[language] ?? character.species, character.level)} · {present ? host.here : host.away}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

interface ChoosingProps {
  pack: DataPack
  invitation: Invitation
  characters: readonly CharacterDocument[]
  onChoose: (character: CharacterDocument) => void
  onCreate: (invitation: Invitation) => void
}

/**
 * The player's characters made for the campaign being played: one of them
 * comes in (decision 119). Under them, the way to make a new one there and
 * then (decision 128), put forward when the player has none.
 */
function Choosing({ pack, invitation, characters, onChoose, onCreate }: ChoosingProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.session.join
  const campaign = invitation.campaign
  const mine = characters.filter((character) => character.campaign.id === campaign.id)
  return (
    <>
      <span className="dn-label">{text.choose(campaign.name)}</span>
      {mine.length === 0 && <p className="dn-note">{text.noCharacter(campaign.name)}</p>}
      {mine.map((character) => {
        const species = pack.species[character.species]
        return (
          <Slot key={character.id} onClick={() => onChoose(character)}>
            {species && <PokemonIcon num={species.num} />}
            <span className="dn-slot__text">
              <span className="dn-text-shadow">{character.nickname}</span>
              <span className="dn-note">{messages.session.host.who(species?.name[language] ?? character.species, character.level)}</span>
            </span>
          </Slot>
        )
      })}
      <p className="dn-note">{text.createHint}</p>
      <div className="dn-row">
        <OptionButton primary={mine.length === 0} onClick={() => onCreate(invitation)}>
          {text.create}
        </OptionButton>
      </div>
    </>
  )
}
