import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Stored } from '../../storage/library'
import { DualScreen, OptionButton, PokemonIcon, Screen, Slot, StepHeader } from '../../ui'
import type { CastMember } from '../../ui/wanderers'
import { DEN, DenScreen } from '../home/DenScreen'

export interface CharacterListProps {
  pack: DataPack
  entries: readonly Stored<CharacterDocument>[]
  /** False when the browser keeps nothing past the visit. */
  kept: boolean
  onBack: () => void
  onNew: () => void
  /** Opens the screen that takes in a character from its file, link or QR code. */
  onImport: () => void
  /** Opens the sheet of one of them, by the id it is kept under. */
  onOpen: (id: string) => void
}

/**
 * The characters kept on this device: on the top screen they are on the plain
 * round the den, each under its name (decision 225), the living walking, the
 * dead in the den's light (decision 228); they are listed below. The den is
 * the one of every other page, so it carries on from the home and back.
 */
export function CharacterList({ pack, entries, kept, onBack, onNew, onImport, onOpen }: CharacterListProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.characters
  const cast = entries.flatMap((entry): CastMember[] => {
    if (!entry.read.ok) return []
    const character = entry.read.value
    const species = pack.species[character.species]
    return species ? [{ id: entry.id, name: character.nickname, species, female: character.gender === 'F', dead: character.condition.state === 'dead' }] : []
  })
  return (
    <DualScreen>
      <DenScreen key={DEN} label={text.title} cast={cast} />
      <Screen kind="menu" label={text.title} scrolls>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          {!kept && (
            <p className="dn-note dn-note--error" role="alert">
              {text.notKept}
            </p>
          )}
          {entries.length === 0 && <p className="dn-note">{text.empty}</p>}
          <ul className="dn-list">
            {entries.map((entry) => {
              // An entry that cannot be read opens too: its page says why and gives its file.
              if (!entry.read.ok) {
                return (
                  <li key={entry.id}>
                    <Slot state="down" onClick={() => onOpen(entry.id)}>
                      <span className="dn-slot__main dn-text-shadow">{entry.read.reason === 'newer-version' ? text.unreadableNewer : text.unreadable}</span>
                    </Slot>
                  </li>
                )
              }
              const character = entry.read.value
              const species = pack.species[character.species]
              return (
                <li key={entry.id}>
                  <Slot onClick={() => onOpen(entry.id)}>
                    {species && <PokemonIcon num={species.num} />}
                    <span className="dn-slot__text">
                      <span className="dn-text-shadow">{character.nickname}</span>
                      <span className="dn-note">{text.entry(species?.name[language] ?? character.species, character.level, character.campaign.name)}</span>
                    </span>
                  </Slot>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
          <OptionButton onClick={onImport}>{messages.import.entry}</OptionButton>
          <OptionButton primary onClick={onNew}>
            {text.new}
          </OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
