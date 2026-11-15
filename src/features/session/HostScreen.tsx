import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { PARTY_MAX } from '../../game-rules/party'
import { useLanguage, useMessages } from '../../i18n'
import { joinLink } from '../../shared/protocol/room-code'
import type { CharacterDocument } from '../../shared/schema/character'
import { OptionButton, PokemonIcon, QrCode, Screen, Slot, StepHeader } from '../../ui'
import type { HostSession, JoinRequest } from './host'

/** How the game master's line to the relay stands: on its way, there, dropped and coming back, or over and why. */
export type HostLine = 'connecting' | 'up' | 'down' | 'replaced' | 'notHost' | 'update' | 'ended'

export interface HostScreenProps {
  pack: DataPack
  session: HostSession
  /** The join code of the session's room. */
  code: string
  /** The app's address, for the join link. */
  origin: string
  line: HostLine
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
 * asking to come in and who is in.
 */
export function HostScreen({ pack, session, code, origin, line, onApprove, onDecline, onRemove, onEnd, onCopy, onBack }: HostScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.session.host
  const [copied, setCopied] = useState<boolean>()
  const [opened, setOpened] = useState<string>()
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
