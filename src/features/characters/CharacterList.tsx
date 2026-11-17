import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Stored } from '../../storage/library'
import { DualScreen, OptionButton, PokemonIcon, PokemonSprite, Screen, Slot, StepHeader } from '../../ui'

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

/** How many of them stand on the top screen. */
const FACES = 5

/** The characters kept on this device: they stand on the top screen and are listed below. */
export function CharacterList({ pack, entries, kept, onBack, onNew, onImport, onOpen }: CharacterListProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.characters
  const readable = entries.flatMap((entry) => (entry.read.ok ? [entry.read.value] : []))
  return (
    <DualScreen>
      <Screen kind="scene" label={text.title}>
        <div className="dn-lineup">
          {readable.length === 0 && <p className="dn-note dn-text-outline">{text.empty}</p>}
          {readable.slice(0, FACES).map((character) => {
            const species = pack.species[character.species]
            return species ? <PokemonSprite key={character.id} species={species} name={character.nickname} female={character.gender === 'F'} scale={0.6} decorative /> : null
          })}
        </div>
      </Screen>
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
