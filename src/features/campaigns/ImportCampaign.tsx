import { useRef, useState } from 'react'
import { useMessages } from '../../i18n'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { WriteResult } from '../../storage/library'
import { OptionButton, Screen, StepHeader } from '../../ui'
import type { CampaignProblem, IncomingCampaign, IncomingCampaignResult } from './incoming-campaign'

export interface ImportCampaignProps {
  /** Reads the text of a picked file. */
  read: (text: string) => IncomingCampaignResult
  /** The text of a picked file, or nothing when the file is larger than any of Denborn's. */
  textOfFile: (file: File) => Promise<string | undefined>
  /** Keeps the campaign on this device, in the place of the copy kept here when there is one. */
  onKeep: (campaign: CampaignDocument) => WriteResult
  /** Shows the page of the campaign kept here under an id. */
  onOpen: (id: string) => void
  onBack: () => void
}

type Step = { at: 'ask'; problem?: CampaignProblem } | { at: 'found'; incoming: IncomingCampaign; notKept?: Extract<WriteResult, { ok: false }>['reason'] }

/**
 * Taking in a campaign from its file, the way a character is taken in
 * (decision 117): what was read is shown before anything is kept, and when
 * this device already has a copy, both are shown and the game master chooses.
 */
export function ImportCampaign({ read, textOfFile, onKeep, onOpen, onBack }: ImportCampaignProps) {
  const messages = useMessages()
  const text = messages.campaigns.importing
  const [step, setStep] = useState<Step>({ at: 'ask' })
  const picker = useRef<HTMLInputElement>(null)
  // Reading a file takes a moment: only the last file picked may speak.
  const reading = useRef(0)

  const open = async (file: File): Promise<void> => {
    const mine = ++reading.current
    const content = await textOfFile(file)
    if (mine !== reading.current) return
    const incoming: IncomingCampaignResult = content === undefined ? { ok: false, problem: 'tooLarge' } : read(content)
    setStep(incoming.ok ? { at: 'found', incoming } : { at: 'ask', problem: incoming.problem })
  }

  const keep = (incoming: IncomingCampaign): void => {
    const saved = onKeep(incoming.campaign)
    if (saved.ok) onOpen(incoming.campaign.id)
    else setStep({ at: 'found', incoming, notKept: saved.reason })
  }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.title}>
          <div className="dn-lineup">
            <p className="dn-note dn-text-outline">{step.at === 'found' ? step.incoming.campaign.name : text.hint}</p>
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        {step.at === 'ask' ? (
          <div className="dn-stack">
            {step.problem ? (
              <p className="dn-note dn-note--error" role="alert">
                {text.problem[step.problem]}
              </p>
            ) : (
              <p className="dn-note">{text.fileHint}</p>
            )}
            <div className="dn-row">
              <OptionButton primary onClick={() => picker.current?.click()}>
                {messages.import.chooseFile}
              </OptionButton>
            </div>
            {/* The browser's own file window does the choosing; the button above opens it. */}
            <input
              ref={picker}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                // Emptied, so that choosing the same file again is still a change.
                event.currentTarget.value = ''
                if (file) void open(file)
              }}
            />
          </div>
        ) : (
          <Found incoming={step.incoming} notKept={step.notKept} onKeep={keep} onOpen={onOpen} />
        )}
        <div className="dn-foot">
          <OptionButton onClick={step.at === 'ask' ? onBack : () => setStep({ at: 'ask' })}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}

interface FoundProps {
  incoming: IncomingCampaign
  notKept: Extract<WriteResult, { ok: false }>['reason'] | undefined
  onKeep: (incoming: IncomingCampaign) => void
  onOpen: (id: string) => void
}

/** A campaign that was read: new here, already here as it is, or already here in another state. */
function Found({ incoming, notKept, onKeep, onOpen }: FoundProps) {
  const messages = useMessages()
  const text = messages.campaigns
  const shared = messages.import
  const { campaign, kept, standing } = incoming
  const rows: { name: string; of: (copy: CampaignDocument) => number | undefined }[] = [
    { name: text.importing.rulesVersion, of: (copy) => copy.rulesHistory.at(-1)?.version },
    { name: text.rules.species, of: (copy) => copy.rulesHistory.at(-1)?.species.length },
    { name: text.rules.startingLevel, of: (copy) => copy.rulesHistory.at(-1)?.startingLevel },
  ]
  const warnings = (
    <>
      {incoming.otherGameData && <p className="dn-note dn-note--error">{text.importing.otherData}</p>}
      {notKept && (
        <p className="dn-note dn-note--error" role="alert">
          {messages.saving[notKept]}
        </p>
      )}
    </>
  )

  if (standing === 'same') {
    return (
      <div className="dn-stack">
        <p className="dn-note">{shared.same(campaign.name)}</p>
        <div className="dn-row">
          <OptionButton primary onClick={() => onOpen(campaign.id)}>
            {text.importing.open}
          </OptionButton>
        </div>
      </div>
    )
  }

  if (standing === 'new') {
    return (
      <div className="dn-stack">
        <p className="dn-note">{text.importing.ready(campaign.name)}</p>
        <dl className="dn-facts">
          {rows.flatMap((row) => [<dt key={`${row.name}-name`}>{row.name}</dt>, <dd key={row.name}>{row.of(campaign)}</dd>])}
        </dl>
        {warnings}
        <div className="dn-row">
          <OptionButton primary onClick={() => onKeep(incoming)}>
            {shared.add}
          </OptionButton>
        </div>
      </div>
    )
  }

  // Already here, and not alike: both are shown, and nothing is replaced without a tap.
  return (
    <div className="dn-stack">
      <p className="dn-note">{shared.already(campaign.name)}</p>
      <p className="dn-label">{shared.verdict[standing]}</p>
      <table className="dn-figures dn-figures--even">
        <thead>
          <tr>
            <th scope="col">{campaign.name}</th>
            <th scope="col">{shared.here}</th>
            <th scope="col">{shared.incoming}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{kept ? row.of(kept) : messages.sheet.noFigure}</td>
              <td>{row.of(campaign)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {warnings}
      <div className="dn-row">
        <OptionButton primary={standing === 'newer'} onClick={() => onKeep(incoming)}>
          {shared.replace}
        </OptionButton>
        <OptionButton primary={standing === 'older'} onClick={() => onOpen(campaign.id)}>
          {shared.keep}
        </OptionButton>
      </div>
    </div>
  )
}
