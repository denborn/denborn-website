import { useState } from 'react'
import { useMessages } from '../../i18n'
import type { OfflineState } from '../../pwa/use-offline-status'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { DualScreen } from '../../ui/DualScreen'
import { Screen } from '../../ui/Screen'
import { OptionButton, Slot } from '../../ui/controls'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { PokemonIcon } from '../../ui/sprites'
import { DEN, DenScreen } from './DenScreen'

export type HomeEntry = 'characters' | 'session' | 'campaigns' | 'options'

export interface HomeProps {
  /** The ways in to show: only those that lead somewhere. */
  entries: readonly HomeEntry[]
  /** How far the app is from working offline, and whether a new version waits (decisions 182 and 183). */
  offline: OfflineState
  /** The title shows: its intro plays over a black bottom screen, until one tap (decision 205). */
  titled: boolean
  /** The title screen moves: the Options' switch (decision 206). */
  animated: boolean
  /** The one tap that passes the title. */
  onStart: () => void
  onOpen: (entry: HomeEntry) => void
  /** Opens the credits (decision 184). */
  onCredits: () => void
}

/** The icon of each entry: Pokédex numbers. */
const ICONS: Record<HomeEntry, number> = { characters: 25, session: 81, campaigns: 150, options: 137 }

/**
 * The app's first screen (decisions 203 and 205). Its top screen is the title
 * screen: the den in its plain, with the app's name. While the title shows,
 * the bottom screen is black and one button, TOUCH TO START; one tap anywhere
 * has the ways in fly in in its place, the storm going on above them. A new
 * version that waits is offered first; under the ways in, a line says how far
 * the app is from working with no network.
 */
export function Home({ entries: shown, offline, titled, animated, onStart, onOpen, onCredits }: HomeProps) {
  const messages = useMessages()
  const text = messages.home
  const reduced = usePrefersReducedMotion()
  const still = reduced || !animated
  const [stormed, setStormed] = useState(false)
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

  // Once the title is passed, the button that was pressed is gone, and a keyboard goes on from the first thing in the menu:
  // the frame gives it the focus as the menu comes in (`DualScreenFrame`).
  return (
    <DualScreen depth={titled ? 0 : 1}>
      <DenScreen
        key={DEN}
        label={messages.app.name}
        intro={titled}
        lightning
        animated={animated}
        onStorm={() => setStormed(true)}
        title={
          <h1 className="dn-title" tabIndex={-1} data-page-heading>
            <span className="dn-title__letters">{messages.app.name}</span>
          </h1>
        }
      >
        {/* A tap on the top screen starts too. For a finger only: a keyboard and a screen reader have the button below. */}
        {titled && <button type="button" className="dn-start" tabIndex={-1} aria-hidden="true" onClick={onStart} />}
      </DenScreen>
      {titled ? (
        <Screen key="home start" kind="blank" label={messages.app.name}>
          {/* It answers its click, not a finger going down: the rest of that same press would land on the menu that takes its place. */}
          <button type="button" className={`dn-start${stormed || still ? ' dn-start--shown' : ''}${still ? ' dn-start--still' : ''}`} onClick={onStart}>
            <span className="dn-start__words dn-text-outline">{text.start}</span>
          </button>
        </Screen>
      ) : (
        <Screen key="home menu" kind="menu" label={messages.app.name} scrolls>
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
      )}
    </DualScreen>
  )
}
