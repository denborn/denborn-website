import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { PARTY_MAX } from '../../game-rules/party'
import { useLanguage, useMessages } from '../../i18n'
import { joinLink } from '../../shared/protocol/room-code'
import type { CharacterDocument } from '../../shared/schema/character'
import { OptionButton, PokemonIcon, QrCode, Screen, Slot, StepHeader } from '../../ui'
import { EncounterRow } from '../encounters/EncounterList'
import type { HostSession, JoinRequest } from './host'
import type { HostLine } from './run-host'

export interface HostScreenProps {
  pack: DataPack
  session: HostSession
  /** The join code of the session's room. */
  code: string
  /** The app's address, for the join link. */
  origin: string
  line: HostLine
  /** Something to say above everything else, such as a character's copy that the device could not keep. */
  notice?: string | undefined
  /** Opens one of the campaign's encounters, or a new one when no id is given (decision 143). */
  onEncounter: (id: string | undefined) => void
  /** Launches an encounter for the party. */
  onLaunch: (id: string) => void
  /** The encounter being launched, while the battle engine is fetched. */
  launching?: string | undefined
  /** Why the last launch made no fight. */
  noLaunch?: keyof ReturnType<typeof useMessages>['session']['host']['noLaunch'] | undefined
  /** The fight being played, by its encounter's name, with the way back to it. */
  fight?: { name: string; onBack: () => void } | undefined
  /** A fight kept from an earlier visit that this app's battle engine cannot play on (decision 139): its encounter's name, and the two ways out. */
  stale?: { name: string; onRestart: () => void; onEnd: () => void } | undefined
  onApprove: (peer: string, keep: 'theirs' | 'mine') => void
  onDecline: (peer: string) => void
  onRemove: (peer: string) => void
  onEnd: () => void
  /** Puts a text on the clipboard; false when the browser refuses. */
  onCopy: (text: string) => Promise<boolean>
  onBack: () => void
}

/**
 * The game master hosting a session (decision 124): the join code in large
 * letters with its QR code on the top screen, the link to copy, then who is
 * asking to come in, who is in, and the campaign's encounters (decision 143).
 */
export function HostScreen({ pack, session, code, origin, line, notice, onEncounter, onLaunch, launching, noLaunch, fight, stale, onApprove, onDecline, onRemove, onEnd, onCopy, onBack }: HostScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.session.host
  const [copied, setCopied] = useState<boolean>()
  const [opened, setOpened] = useState<string>()
  /** The encounter whose LAUNCH and PREPARE are shown. */
  const [chosen, setChosen] = useState<string>()
  const [ending, setEnding] = useState(false)
  const link = joinLink(code, origin)
  const full = session.party.length >= PARTY_MAX
  const who = (character: CharacterDocument): string => text.who(pack.species[character.species]?.name[language] ?? character.species, character.level)
  const icon = (character: CharacterDocument) => {
    const species = pack.species[character.species]
    return species ? <PokemonIcon num={species.num} /> : null
  }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.codeLabel(code)}>
          <div className="dn-join">
            <div className="dn-join__words">
              <span className="dn-join__label dn-text-outline">{text.code}</span>
              {/* Read out letter by letter, not as a word. */}
              <span className="dn-join__code dn-text-outline" aria-label={text.codeLabel(code)}>
                {code}
              </span>
              <span className="dn-join__name dn-text-outline">{session.campaign.name}</span>
            </div>
            <QrCode text={link} label={text.qr} tooLong={code} />
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={session.campaign.name} tall>
        <StepHeader title={session.campaign.name} />
        <div className="dn-stack">
          {notice && (
            <p className="dn-note dn-note--error" role="alert">
              {notice}
            </p>
          )}
          {line !== 'up' && (
            <p className={line === 'connecting' || line === 'down' ? 'dn-note' : 'dn-note dn-note--error'} role="status">
              {text.line[line]}
            </p>
          )}
          <div className="dn-row">
            <OptionButton onClick={() => void onCopy(link).then(setCopied)}>{text.copy}</OptionButton>
          </div>
          {copied !== undefined && (
            <p className={copied ? 'dn-note' : 'dn-note dn-note--error'} role="status">
              {copied ? text.copied : text.notCopied}
            </p>
          )}

          <span className="dn-label">{text.requests}</span>
          {session.requests.length === 0 && <p className="dn-note">{text.noRequests}</p>}
          {session.requests.map((request) => (
            <Request key={request.peer} request={request} who={who(request.character)} icon={icon(request.character)} full={full} onApprove={(keep) => onApprove(request.peer, keep)} onDecline={() => onDecline(request.peer)} />
          ))}
          {full && session.requests.length > 0 && <p className="dn-note">{text.partyFull}</p>}

          <span className="dn-label">{text.party(session.party.length, PARTY_MAX)}</span>
          {session.party.length === 0 && <p className="dn-note">{text.emptyParty}</p>}
          {session.party.map((member) => (
            <div key={member.peer} className="dn-entry">
              <Slot selected={opened === member.peer} aria-expanded={opened === member.peer} onClick={() => setOpened(opened === member.peer ? undefined : member.peer)}>
                {icon(member.character)}
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{member.character.nickname}</span>
                  <span className="dn-note">
                    {who(member.character)} · {member.present ? text.here : text.away}
                  </span>
                </span>
              </Slot>
              {opened === member.peer && (
                <div className="dn-row">
                  <OptionButton onClick={() => onRemove(member.peer)}>{text.remove}</OptionButton>
                </div>
              )}
            </div>
          ))}
          <span className="dn-label">{text.encounters}</span>
          {session.campaign.encounters.length === 0 && <p className="dn-note">{messages.encounters.empty}</p>}
          {stale && (
            <>
              <p className="dn-note dn-note--error" role="alert">
                {text.stale(stale.name)}
              </p>
              <p className="dn-note">{text.staleRestartHint}</p>
              <div className="dn-row">
                <OptionButton primary onClick={stale.onRestart}>
                  {text.staleRestart}
                </OptionButton>
              </div>
              <p className="dn-note">{text.staleEndHint}</p>
              <div className="dn-row">
                <OptionButton onClick={stale.onEnd}>{text.staleEnd}</OptionButton>
              </div>
            </>
          )}
          {fight && (
            <>
              <p className="dn-note">{text.fightOn(fight.name)}</p>
              <div className="dn-row">
                <OptionButton primary onClick={fight.onBack}>
                  {text.toFight}
                </OptionButton>
              </div>
            </>
          )}
          {noLaunch && (
            <p className="dn-note dn-note--error" role="alert">
              {text.noLaunch[noLaunch]}
            </p>
          )}
          <ul className="dn-list">
            {session.campaign.encounters.map((encounter) => (
              <li key={encounter.id} className="dn-entry">
                <EncounterRow encounter={encounter} expanded={chosen === encounter.id} onOpen={() => setChosen(chosen === encounter.id ? undefined : encounter.id)} />
                {chosen === encounter.id && (
                  <div className="dn-row">
                    {/* One fight at a time: the next encounter waits for this one's end. */}
                    <OptionButton primary disabled={fight !== undefined || stale !== undefined || launching !== undefined} onClick={() => onLaunch(encounter.id)}>
                      {text.launch}
                    </OptionButton>
                    <OptionButton onClick={() => onEncounter(encounter.id)}>{text.prepare}</OptionButton>
                  </div>
                )}
                {launching === encounter.id && (
                  <p className="dn-note" role="status">
                    {text.launching}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="dn-row">
            <OptionButton onClick={() => onEncounter(undefined)}>{text.newEncounter}</OptionButton>
          </div>
          {ending && (
            <p className="dn-note dn-note--error" role="alert">
              {text.endQuestion}
            </p>
          )}
        </div>
        <div className="dn-foot">
          {ending ? (
            <>
              <OptionButton primary onClick={() => setEnding(false)}>
                {text.endNo}
              </OptionButton>
              <OptionButton onClick={onEnd}>{text.endYes}</OptionButton>
            </>
          ) : (
            <>
              <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
              <OptionButton onClick={() => setEnding(true)}>{text.end}</OptionButton>
            </>
          )}
        </div>
      </Screen>
    </div>
  )
}

interface RequestProps {
  request: JoinRequest
  who: string
  icon: React.ReactNode
  /** True when the party has no room left: nobody can be let in. */
  full: boolean
  onApprove: (keep: 'theirs' | 'mine') => void
  onDecline: () => void
}

/** A player asking to come in. When the game master has a copy of the character that differs, both are shown and the game master picks (decision 13). */
function Request({ request, who, icon, full, onApprove, onDecline }: RequestProps) {
  const messages = useMessages()
  const text = messages.session.host
  const { character, kept, standing } = request
  const rows: { name: string; of: (copy: CharacterDocument) => number }[] = [
    { name: messages.battle.level, of: (copy) => copy.level },
    { name: messages.sheet.exp, of: (copy) => copy.exp },
    { name: messages.battle.hp, of: (copy) => copy.hp },
    { name: messages.sheet.moneyLabel, of: (copy) => copy.money },
  ]
  return (
    <div className="dn-entry" role="group" aria-label={character.nickname}>
      <div className="dn-slot">
        {icon}
        <span className="dn-slot__text">
          <span className="dn-text-shadow">{character.nickname}</span>
          <span className="dn-note">{who}</span>
        </span>
      </div>
      {kept ? (
        <>
          <p className="dn-note">{text.twoCopies}</p>
          {standing !== 'new' && standing !== 'same' && <p className="dn-label">{messages.import.verdict[standing]}</p>}
          <table className="dn-figures dn-figures--even">
            <thead>
              <tr>
                <th scope="col">{character.nickname}</th>
                <th scope="col">{text.mine}</th>
                <th scope="col">{text.theirs}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>{row.of(kept)}</td>
                  <td>{row.of(character)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="dn-row">
            <OptionButton primary={standing === 'newer'} disabled={full} onClick={() => onApprove('theirs')}>
              {text.letInTheirs}
            </OptionButton>
            <OptionButton primary={standing === 'older'} disabled={full} onClick={() => onApprove('mine')}>
              {text.letInMine}
            </OptionButton>
            <OptionButton onClick={onDecline}>{text.refuse}</OptionButton>
          </div>
        </>
      ) : (
        <div className="dn-row">
          <OptionButton primary disabled={full} onClick={() => onApprove('theirs')}>
            {text.letIn}
          </OptionButton>
          <OptionButton onClick={onDecline}>{text.refuse}</OptionButton>
        </div>
      )}
    </div>
  )
}
