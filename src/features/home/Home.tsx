import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { OfflineState } from '../../pwa/use-offline-status'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from must not bring the animation library with it.
import { Screen } from '../../ui/Screen'
import { OptionButton, Slot } from '../../ui/controls'
import { AppEmblem, PokemonIcon, PokemonSprite } from '../../ui/sprites'

export type HomeEntry = 'characters' | 'session' | 'campaigns' | 'options'

export interface HomeProps {
  pack: DataPack
  /** The ways in to show: only those that lead somewhere. */
  entries: readonly HomeEntry[]
  /** How far the app is from working offline, and whether a new version waits (decisions 182 and 183). */
  offline: OfflineState
  onOpen: (entry: HomeEntry) => void
  /** Opens the credits (decision 184). */
  onCredits: () => void
}

/** The three that stand on the first screen, and the icon of each entry: Pokédex numbers. */
const FACES = ['bulbasaur', 'charmander', 'squirtle']
const ICONS: Record<HomeEntry, number> = { characters: 25, session: 81, campaigns: 150, options: 137 }

/**
 * The app's first screen: its name over three Pokémon, and the ways in. A new
 * version that waits is offered first; under the ways in, a line says how far
 * the app is from working with no network.
 */
export function Home({ pack, entries: shown, offline, onOpen, onCredits }: HomeProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.home
  const all: { id: HomeEntry; label: string; hint: string }[] = [
    { id: 'characters', label: text.characters, hint: text.charactersHint },
    { id: 'session', label: text.session, hint: text.sessionHint },
    { id: 'campaigns', label: text.campaigns, hint: text.campaignsHint },
    { id: 'options', label: text.options, hint: text.optionsHint },
  ]
  const entries = all.filter((entry) => shown.includes(entry.id))
  const { sprites } = offline
  // Nothing is said in a browser that cannot keep the app: the Options' system check says so.
  const offlineLine =
    offline.status === 'preparing' ? text.offline.preparing
    : offline.status === 'ready' ? text.offline.ready
    : offline.status === 'sprites' && sprites ? (sprites.stalled ? text.offline.stalled(sprites.done, sprites.of) : text.offline.sprites(sprites.done, sprites.of))
    : undefined
  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={messages.app.name}>
          <div className="dn-home">
            <h1 className="dn-title" tabIndex={-1} data-page-heading>
              {messages.app.name}
            </h1>
            <p className="dn-home__tagline dn-text-outline">{messages.app.tagline}</p>
            {/* The app's emblem, as the DS menu showed a game's icon (decision 192). The title beside it names it. */}
            <AppEmblem scale={1.5} />
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
          {offline.updateAvailable && (
            <div className="dn-entry">
              <p className="dn-note" role="status">
                {messages.system.updateAvailable}
              </p>
              <div className="dn-row">
                <OptionButton primary onClick={offline.applyUpdate}>
                  {text.update}
                </OptionButton>
              </div>
            </div>
          )}
          {entries.map((entry) => (
            <Slot key={entry.id} onClick={() => onOpen(entry.id)}>
              <PokemonIcon num={ICONS[entry.id]} />
              <span className="dn-slot__text">
                <span className="dn-text-shadow">{entry.label}</span>
                <span className="dn-note">{entry.hint}</span>
              </span>
            </Slot>
          ))}
          {/* Not read out as it counts: it is there to be looked at. */}
          {offlineLine && <p className="dn-note">{offlineLine}</p>}
          <p className="dn-note">{messages.app.notice}</p>
          <div className="dn-row">
            <OptionButton onClick={onCredits}>{messages.credits.open}</OptionButton>
          </div>
        </nav>
      </Screen>
    </div>
  )
}
