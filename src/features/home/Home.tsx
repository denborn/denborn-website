import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import { PokemonIcon, PokemonSprite, Screen, Slot } from '../../ui'

export type HomeEntry = 'characters' | 'campaigns' | 'options'

export interface HomeProps {
  pack: DataPack
  onOpen: (entry: HomeEntry) => void
}

/** The three that stand on the first screen, and the icon of each entry: Pokédex numbers. */
const FACES = ['bulbasaur', 'charmander', 'squirtle']
const ICONS: Record<HomeEntry, number> = { characters: 25, campaigns: 150, options: 137 }

/** The app's first screen: its name over three Pokémon, and the ways in. */
export function Home({ pack, onOpen }: HomeProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.home
  const entries: { id: HomeEntry; label: string; hint: string }[] = [
    { id: 'characters', label: text.characters, hint: text.charactersHint },
    { id: 'campaigns', label: text.campaigns, hint: text.campaignsHint },
    { id: 'options', label: text.options, hint: text.optionsHint },
  ]
  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={messages.app.name}>
          <div className="dn-home">
            <h1 className="dn-title">{messages.app.name}</h1>
            <p className="dn-home__tagline dn-text-outline">{messages.app.tagline}</p>
            <div className="dn-home__faces">
              {FACES.map((id) => {
                const species = pack.species[id]
                return species ? <PokemonSprite key={id} species={species} name={species.name[language]} scale={0.8} decorative /> : null
              })}
            </div>
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={messages.app.name} tall>
        <nav className="dn-stack" aria-label={messages.app.name}>
          {entries.map((entry) => (
            <Slot key={entry.id} onClick={() => onOpen(entry.id)}>
              <PokemonIcon num={ICONS[entry.id]} />
              <span className="dn-slot__text">
                <span className="dn-text-shadow">{entry.label}</span>
                <span className="dn-note">{entry.hint}</span>
              </span>
            </Slot>
          ))}
          <p className="dn-note">{messages.app.notice}</p>
        </nav>
      </Screen>
    </div>
  )
}
