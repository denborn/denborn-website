import { useState } from 'react'
import { MENU_POKEMON, type MenuPokemon } from '../../data/sprites'
import { useMessages } from '../../i18n'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { DualScreen } from '../../ui/DualScreen'
import { Screen } from '../../ui/Screen'
import { MenuButton, type MenuTone, PointedMenuButton } from '../../ui/controls'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { DEN, DenScreen } from './DenScreen'

export type HomeEntry = 'characters' | 'campaigns' | 'session' | 'options' | 'account'

export interface HomeProps {
  /** The title shows: its intro plays over a black bottom screen, until one tap (decision 205). */
  titled: boolean
  /** The title screen moves: the Options' switch (decision 206). */
  animated: boolean
  /** The one tap that passes the title. */
  onStart: () => void
  onOpen: (entry: HomeEntry) => void
  /** Moves to the new version of the app that waits; left out when none does (decisions 183 and 222). */
  onUpdate: (() => void) | undefined
}

/** The ways in, in the menu's reading order: two to a row (decisions 221, 236 and 240). */
const ENTRIES: readonly HomeEntry[] = ['characters', 'campaigns', 'session', 'account', 'options']

/** Each way in's Pokémon, and the colours that suit it. */
const LOOKS: Record<HomeEntry, { pokemon: MenuPokemon; tone: MenuTone }> = {
  characters: { pokemon: MENU_POKEMON.pikachu, tone: 'yellow' },
  campaigns: { pokemon: MENU_POKEMON.eternamaxEternatus, tone: 'red' },
  session: { pokemon: MENU_POKEMON.falinks, tone: 'brown' },
  options: { pokemon: MENU_POKEMON.klang, tone: 'grey' },
  account: { pokemon: MENU_POKEMON.megaStarmie, tone: 'purple' },
}

/**
 * The app's first screen (decisions 203 and 205). Its top screen is the title
 * screen: the den in its plain, with the app's name. While the title shows,
 * the bottom screen is black and one button, TOUCH TO START; one tap anywhere
 * has the menu fly in in its place, the storm going on above it.
 *
 * The menu (decision 221) is a grid of four rows of two: the five ways in,
 * each with its Pokémon, then UPDATE, which can be pressed only when a new
 * version waits (decision 222). UPDATE alone is pointed at both ends, Unown
 * the last letter of its word (decision 233). The last row is empty; the
 * notice is a line under the grid.
 */
export function Home({ titled, animated, onStart, onOpen, onUpdate }: HomeProps) {
  const messages = useMessages()
  const text = messages.home
  const reduced = usePrefersReducedMotion()
  const still = reduced || !animated
  const [stormed, setStormed] = useState(false)

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
        <Screen key="home menu" kind="menu" label={messages.app.name}>
          <div className="dn-menu">
            <nav className="dn-menu__grid" aria-label={messages.app.name}>
              {ENTRIES.map((entry) => (
                <MenuButton key={entry} {...LOOKS[entry]} onClick={() => onOpen(entry)}>
                  {text[entry]}
                </MenuButton>
              ))}
              {/* Unown asks while there is nothing to move to, and exclaims once a new version waits: UPDATE ?, then UPDATE ! */}
              <PointedMenuButton tone="blue" pokemon={onUpdate ? MENU_POKEMON.unownExclamation : MENU_POKEMON.unownQuestion} disabled={!onUpdate} onClick={onUpdate}>
                {text.update}
              </PointedMenuButton>
            </nav>
            {/* The button says nothing as it lights up: this tells a screen reader that a new version waits. */}
            <p className="dn-visually-hidden" role="status">
              {onUpdate ? messages.system.updateAvailable : ''}
            </p>
            <p className="dn-note dn-menu__notice">{messages.app.notice}</p>
          </div>
        </Screen>
      )}
    </DualScreen>
  )
}
