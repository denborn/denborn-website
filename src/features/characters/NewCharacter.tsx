import { type SyntheticEvent, useState } from 'react'
import { useMessages } from '../../i18n'
import type { Invitation } from '../../shared/codec/codes'
import { OptionButton, Screen, Slot, StepHeader, TextField } from '../../ui'

/** Why a pasted link could not be opened. */
export type LinkProblem = 'not-this-kind' | 'newer-version' | 'damaged' | 'unknown-species'

export interface NewCharacterProps {
  /** The campaigns opened on this device. */
  invitations: readonly Invitation[]
  /** Something to say on arrival, when a link opened from outside could not be read. */
  problem?: LinkProblem | undefined
  onBack: () => void
  onCampaign: (campaignId: string) => void
  /** Opens a pasted link or code: goes on to the campaign, or says why it cannot. */
  onLink: (text: string) => LinkProblem | undefined
}

/** Where a character starts: one of the campaigns opened on this device, or a creation link to paste. */
export function NewCharacter({ invitations, problem: arrivedWith, onBack, onCampaign, onLink }: NewCharacterProps) {
  const messages = useMessages()
  const text = messages.newCharacter
  const [link, setLink] = useState('')
  const [problem, setProblem] = useState(arrivedWith)

  const open = (event: SyntheticEvent): void => {
    event.preventDefault()
    setProblem(onLink(link))
  }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.title}>
          <div className="dn-lineup">
            <p className="dn-note dn-text-outline">{text.hint}</p>
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          <div role="group" aria-label={text.campaigns} className="dn-entry">
            <span className="dn-label">{text.campaigns}</span>
            {invitations.length === 0 && <p className="dn-note">{text.none}</p>}
            {invitations.map((invitation) => (
              <Slot key={invitation.campaign.id} onClick={() => onCampaign(invitation.campaign.id)}>
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{invitation.campaign.name}</span>
                  <span className="dn-note">{text.campaign(invitation.rules.startingLevel)}</span>
                </span>
              </Slot>
            ))}
          </div>
          <form className="dn-entry" onSubmit={open}>
            <TextField
              label={text.link}
              value={link}
              onChange={setLink}
              hint={problem ? text.problem[problem] : text.linkHint}
              invalid={problem !== undefined}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            <div className="dn-row">
              <OptionButton primary submit disabled={link.trim() === ''}>
                {text.open}
              </OptionButton>
            </div>
          </form>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}
