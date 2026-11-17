import { useMessages } from '../../i18n'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { Stored } from '../../storage/library'
import { DualScreen, OptionButton, Screen, Slot, StepHeader } from '../../ui'

export interface CampaignListProps {
  entries: readonly Stored<CampaignDocument>[]
  onBack: () => void
  onNew: () => void
  /** Opens the screen that takes in a campaign from its file. */
  onImport: () => void
  /** Opens the page of one of them, by the id it is kept under. */
  onOpen: (id: string) => void
}

/** The campaigns this device keeps as their game master. */
export function CampaignList({ entries, onBack, onNew, onImport, onOpen }: CampaignListProps) {
  const messages = useMessages()
  const text = messages.campaigns
  return (
    <DualScreen>
      <Screen kind="scene" label={text.title}>
        <div className="dn-lineup">
          <p className="dn-note dn-text-outline">{text.hint}</p>
        </div>
      </Screen>
      <Screen kind="menu" label={text.title} scrolls>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          {entries.length === 0 && <p className="dn-note">{text.empty}</p>}
          <ul className="dn-list">
            {entries.map((entry) => {
              const campaign = entry.read.ok ? entry.read.value : undefined
              const rules = campaign?.rulesHistory.at(-1)
              // One that cannot be read is listed, never dropped: its page gives its file and the way to remove it.
              if (!campaign || !rules) {
                return (
                  <li key={entry.id}>
                    <Slot state="down" onClick={() => onOpen(entry.id)}>
                      <span className="dn-slot__main dn-text-shadow">{text.unreadable}</span>
                    </Slot>
                  </li>
                )
              }
              return (
                <li key={entry.id}>
                  <Slot onClick={() => onOpen(entry.id)}>
                    <span className="dn-slot__text">
                      <span className="dn-text-shadow">{campaign.name}</span>
                      <span className="dn-note">{text.entry(rules.version, rules.species.length)}</span>
                    </span>
                  </Slot>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
          <OptionButton onClick={onImport}>{text.importing.entry}</OptionButton>
          <OptionButton primary onClick={onNew}>
            {text.new}
          </OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
