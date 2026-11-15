import { useMessages } from '../../i18n'
import type { Encounter } from '../../shared/schema/encounter'
import { OptionButton, Screen, Slot, StepHeader } from '../../ui'

export interface EncounterListProps {
  /** The campaign's name: these are its encounters. */
  campaign: string
  encounters: readonly Encounter[]
  onBack: () => void
  onNew: () => void
  onOpen: (id: string) => void
}

/** One encounter in a list: its name, how many enemies it has and their levels. A tap opens it. */
export function EncounterRow({ encounter, onOpen }: { encounter: Encounter; onOpen: () => void }) {
  const text = useMessages().encounters
  const levels = encounter.enemies.map((enemy) => enemy.level)
  return (
    <Slot onClick={onOpen}>
      <span className="dn-slot__text">
        <span className="dn-text-shadow">{encounter.name}</span>
        <span className="dn-note">{text.listEntry(encounter.enemies.length, Math.min(...levels), Math.max(...levels))}</span>
      </span>
    </Slot>
  )
}

/** The encounters a game master prepared for a campaign. */
export function EncounterList({ campaign, encounters, onBack, onNew, onOpen }: EncounterListProps) {
  const messages = useMessages()
  const text = messages.encounters
  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.title}>
          <div className="dn-lineup">
            <p className="dn-note dn-text-outline">{campaign}</p>
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          {encounters.length === 0 && <p className="dn-note">{text.empty}</p>}
          <ul className="dn-list">
            {encounters.map((encounter) => (
              <li key={encounter.id}>
                <EncounterRow encounter={encounter} onOpen={() => onOpen(encounter.id)} />
              </li>
            ))}
          </ul>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
          <OptionButton primary onClick={onNew}>
            {text.new}
          </OptionButton>
        </div>
      </Screen>
    </div>
  )
}
