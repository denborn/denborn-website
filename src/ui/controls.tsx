import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useId, useState } from 'react'
import { BATTLE_HUD, type MenuPokemon } from '../data/sprites'
import { usePixelScale } from './Screen'
import { fitScale } from './pixel'
import { MenuPokemonIcon } from './sprites'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>

export interface PanelProps {
  /** `dark` is the Black 2 box, `light` the White 2 one. */
  tone?: 'dark' | 'light'
  children?: ReactNode
}

/** A framed box for text and values. */
export function Panel({ tone = 'dark', children }: PanelProps) {
  return <div className={`dn-panel${tone === 'light' ? ' dn-panel--light' : ''}`}>{children}</div>
}

export interface SlotProps extends ButtonProps {
  /** `down` for a downed Pokémon, `ok` once a choice is locked. */
  state?: 'normal' | 'down' | 'ok'
  /** For a row that is a choice: whether it is the one chosen. Left out for a row that opens something. */
  selected?: boolean | undefined
}

/** A row that can be chosen or that opens something, in the manner of the party screen. */
export function Slot({ state = 'normal', selected, children, ...rest }: SlotProps) {
  const modifier = state === 'normal' ? '' : ` dn-slot--${state}`
  return (
    <button type="button" className={`dn-slot${modifier}`} aria-pressed={selected} {...rest}>
      {children}
    </button>
  )
}

/** The colours of a menu button's plate: those that suit its Pokémon. `blue` is the party slot's own. */
export type MenuTone = 'yellow' | 'red' | 'brown' | 'blue' | 'purple' | 'grey'

export interface MenuButtonProps extends ButtonProps {
  tone: MenuTone
  /** The Pokémon that stands at its left end. */
  pokemon: MenuPokemon
}

/**
 * How large a menu button's Pokémon is drawn, in DS pixels: the size of one
 * pixel of its drawing, and the widest a drawing may be. Its place on the
 * button (`.dn-menu-button__pokemon`) is a little wider than that, so that the
 * widest Pokémon still has room around it.
 */
const MENU_POKEMON_SIZE = { scale: 0.8, widest: 27 } as const

/** The size of one pixel of a menu Pokémon's drawing, in DS pixels: the same on every button, a wide one a little smaller. */
function menuPokemonScale(pokemon: MenuPokemon): number {
  return fitScale(MENU_POKEMON_SIZE.scale, pokemon.width, MENU_POKEMON_SIZE.widest)
}

/**
 * A button of the main menu (decisions 221 and 230): a plate in the colours of
 * its Pokémon, with one word. Everything starts from the left: the Pokémon, in
 * a place that is the same on every button and half-way up it, then the word,
 * which so starts at the same place on every button too. In its place the
 * Pokémon is in the middle and stands on the bottom, over its shadow: a small
 * one and a large one are about the same point, on one line. It is as large,
 * and at the same place, on every screen (decision 232); one whose drawing is
 * wider than the rest is drawn a little smaller. Pressed, the button sinks and
 * its Pokémon hops (decision 224).
 */
export function MenuButton({ tone, pokemon, children, ...rest }: MenuButtonProps) {
  return (
    <button type="button" className={`dn-slot dn-menu-button dn-menu-button--${tone}`} {...rest}>
      <span className="dn-menu-button__pokemon">
        <span className="dn-menu-button__body">
          <span className="dn-menu-button__shadow" />
          <MenuPokemonIcon pokemon={pokemon} scale={menuPokemonScale(pokemon)} />
        </span>
      </span>
      <span className="dn-menu-button__label dn-text-shadow">{children}</span>
    </button>
  )
}

/** How tall the capitals of a menu button's word are, in DS pixels: VT323's at size 12 (tokens.css). */
const MENU_CAPITALS = 10

/**
 * The main menu's one button in the options screen's shape (decision 233),
 * pointed at both ends and as large as its cell; its colours, its plate and
 * its press are those of the others. Its Pokémon is the last letter of its
 * word, as large as on the other buttons and centred on the capitals
 * (decision 237): Unown as a question mark or as an exclamation mark ends the
 * sentence. One that takes the place of the first pops up, as the games' "!"
 * does over a head.
 */
export function PointedMenuButton({ tone, pokemon, children, ...rest }: MenuButtonProps) {
  const [first] = useState(pokemon.cell)
  const scale = menuPokemonScale(pokemon)
  // Centred on the capitals: it goes as far below their line as it rises above them, in DS pixels.
  const drop = (pokemon.height * scale - MENU_CAPITALS) / 2
  return (
    <button type="button" className={`dn-slot dn-menu-button dn-menu-button--pointed dn-menu-button--${tone}`} {...rest}>
      <span className="dn-menu-button__label dn-text-shadow">
        {children}{' '}
        {/* Another Pokémon is another letter: it is drawn anew, not changed in place. */}
        <span
          key={pokemon.cell}
          className={`dn-menu-button__letter${pokemon.cell === first ? '' : ' dn-menu-button__letter--new'}`}
          style={{ '--dn-letter-drop': drop } as CSSProperties}
        >
          <MenuPokemonIcon pokemon={pokemon} scale={scale} />
        </span>
      </span>
    </button>
  )
}

/** A button's weight among those beside it: the main action, or a second way on, blue but quieter; one or the other, never both. */
type OptionWeight = { primary?: boolean; secondary?: never } | { secondary?: boolean; primary?: never }

export type OptionButtonProps = ButtonProps &
  OptionWeight & {
    /** The current choice among several, or the main action of a screen. */
    selected?: boolean
    /** True for the button that sends the form it is in. */
    submit?: boolean
  }

/** A small button for a choice or an action, in the manner of the options screen. */
export function OptionButton({ selected, primary = false, secondary = false, submit = false, children, ...rest }: OptionButtonProps) {
  const weight = primary ? ' dn-option--primary' : secondary ? ' dn-option--secondary' : ''
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={`dn-option${weight}`}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  )
}

export interface ArrowButtonProps extends Omit<ButtonProps, 'children'> {
  /** The way it points. */
  way: 'previous' | 'next'
  /** What it does, read out: it shows nothing but its arrow. */
  label: string
}

/** The games' small arrow, pointing left for the previous one and right for the next; with nothing to go to it keeps its place, unseen. */
export function ArrowButton({ way, label, ...rest }: ArrowButtonProps) {
  return <button type="button" className={`dn-arrow dn-arrow--${way}`} aria-label={rest.disabled ? undefined : label} {...rest} />
}

export type CommandId = 'fight' | 'bag' | 'switch' | 'run'

/** Which of the games' three tiles a button is drawn with: the one with its shelf to the left, the small one in the middle, the one with its shelf to the right. */
export type TilePlace = keyof typeof BATTLE_HUD.tiles

/** How wide a letter of the kit's font is, for its size. */
const LETTER_WIDTH = 0.56

/** How wide a word may be on each tile, in DS pixels: inside its dome's rim. */
const TILE_ROOM: Record<TilePlace, number> = { left: 54, middle: 52, right: 54 }

/** The games' size for a tile's word, in DS pixels of text. */
const TILE_WORD = 13

/**
 * A word's size, in DS pixels of text: `most` when it is short enough, smaller
 * for a longer one, so that it stays within `room` DS pixels with its letters
 * `apart` from one another.
 */
function wordSize(word: string, room: number, most: number, apart = 0): number {
  return Math.min(most, (room / Math.max(1, word.length) - apart) / LETTER_WIDTH)
}

/**
 * A tile's word as it is written on it: on one line, or, when it is several
 * words too long for one at the games' size, on the two lines that are the
 * most alike in length (CHAMP DE / BATAILLE).
 */
function tileLines(word: string, room: number): string[] {
  const parts = word.split(' ')
  if (parts.length < 2 || wordSize(word, room, TILE_WORD) === TILE_WORD) return [word]
  const longest = (lines: readonly string[]): number => Math.max(...lines.map((line) => line.length))
  return parts
    .slice(1)
    .map((_, at) => [parts.slice(0, at + 1).join(' '), parts.slice(at + 1).join(' ')])
    .reduce((best, split) => (longest(split) < longest(best) ? split : best))
}

export interface TileButtonProps extends ButtonProps {
  /** The word written on it, in the app's language. */
  word: string
  /** Which of the games' three tiles it is: the right one unless told otherwise. */
  side?: TilePlace
  /** The edge of the screen it stands on. On the top one the games' tile hangs upside down, from under the strip. */
  edge?: 'top' | 'bottom'
  /** The command whose colour its word takes; white when it is none of them. */
  tone?: CommandId | undefined
  /** What stands under its word: the round's clock on the game master's TOOLS. */
  children?: ReactNode
}

/**
 * One of the games' tiles of the touch screen (decision 255), with a word the
 * app writes on it (decision 256): a command along the bottom edge, or one
 * hanging from the top edge (decisions 248 and 260). The tile is the games'
 * own picture, on whole pixels of the device; the button is as large as the
 * picture.
 */
export function TileButton({ word, side = 'right', edge = 'top', tone, children, ...rest }: TileButtonProps) {
  const tile = BATTLE_HUD.tiles[side]
  const pixel = usePixelScale(1)
  const lines = tileLines(word, TILE_ROOM[side])
  const size = Math.min(...lines.map((line) => wordSize(line, TILE_ROOM[side], TILE_WORD)))
  const art: CSSProperties = {
    backgroundImage: `url(${BATTLE_HUD.url})`,
    backgroundSize: `${BATTLE_HUD.width * pixel}px ${BATTLE_HUD.height * pixel}px`,
    backgroundPosition: `${-tile.x * pixel}px ${-tile.y * pixel}px`,
  }
  return (
    <button
      type="button"
      className={`dn-command dn-command--tile dn-command--${edge} dn-command--${side}${tone ? ` dn-command--${tone}` : ''}`}
      style={{ width: tile.width * pixel, height: tile.height * pixel, '--dn-word-size': size } as CSSProperties}
      {...rest}
    >
      <span className="dn-command__tile" style={art} aria-hidden="true" />
      <span className="dn-command__label">
        {/* Two lines are two words to whoever is read them: the space between them is kept. */}
        {lines.flatMap((line, index) => [index > 0 ? ' ' : null, <span key={line}>{line}</span>])}
        {children}
      </span>
    </button>
  )
}

export interface CommandMenuProps {
  /** The four labels, in the app's language. */
  labels: Record<CommandId, string>
  /** Commands that cannot be used right now. */
  disabled?: readonly CommandId[]
  onCommand: (command: CommandId) => void
  /** What stands over FIGHT and under it, where the games line up Poké Balls: the orders of the round (decision 248). */
  above?: ReactNode
  below?: ReactNode
  /** The rest: the tiles of the top edge, the strip, the timer. */
  children?: ReactNode
}

/** How wide FIGHT's word may be, in DS pixels: the belt's notch, less its slanted ends. */
const FIGHT_ROOM = 104

/** The three commands of the bottom edge, from the left, each on its tile (decision 248). */
const BOTTOM_TILES: readonly { command: Exclude<CommandId, 'fight'>; side: TilePlace }[] = [
  { command: 'bag', side: 'left' },
  { command: 'switch', side: 'middle' },
  { command: 'run', side: 'right' },
]

/**
 * The battle's commands on the touch screen, after the games': FIGHT written
 * in the belt of the ball (decision 259), and BAG, SWITCH and RUN on the
 * three tiles along the bottom.
 */
export function CommandMenu({ labels, disabled = [], onCommand, above, below, children }: CommandMenuProps) {
  return (
    <div className="dn-commands">
      {children}
      {above && <div className="dn-commands__bar dn-commands__bar--above">{above}</div>}
      <button type="button" className="dn-command dn-command--fight" style={{ '--dn-fight-size': wordSize(labels.fight, FIGHT_ROOM, 22, 2) } as CSSProperties} disabled={disabled.includes('fight')} onClick={() => onCommand('fight')}>
        <span className="dn-command__label">{labels.fight}</span>
      </button>
      {below && <div className="dn-commands__bar dn-commands__bar--below">{below}</div>}
      {BOTTOM_TILES.map(({ command, side }) => (
        <TileButton key={command} word={labels[command]} side={side} edge="bottom" tone={command} disabled={disabled.includes(command)} onClick={() => onCommand(command)} />
      ))}
    </div>
  )
}

export interface TabsProps<Id extends string> {
  /** What the tabs are, for assistive technology. */
  label: string
  tabs: readonly { id: Id; label: string }[]
  current: Id
  onChange: (id: Id) => void
  /** The part the current tab shows. */
  children: ReactNode
}

/**
 * A row of tabs and the part the current one shows. The arrow keys, Home and
 * End move between the tabs, as in any row of tabs; only the current tab is a
 * stop for the Tab key, and the part is the next one.
 */
export function Tabs<Id extends string>({ label, tabs, current, onChange, children }: TabsProps<Id>) {
  const set = useId()
  const tabId = (id: Id): string => `${set}-tab-${id}`
  const go = (index: number): void => {
    const next = tabs[(index + tabs.length) % tabs.length]
    if (!next) return
    onChange(next.id)
    // Focus goes with the choice. Every tab is on the page already, so it can take it now.
    document.getElementById(tabId(next.id))?.focus()
  }
  return (
    <>
      <div className="dn-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            className="dn-tab"
            aria-selected={tab.id === current}
            aria-controls={`${set}-part`}
            tabIndex={tab.id === current ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') go(index + 1)
              else if (event.key === 'ArrowLeft') go(index - 1)
              else if (event.key === 'Home') go(0)
              else if (event.key === 'End') go(tabs.length - 1)
              else return
              event.preventDefault()
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* A stop for the Tab key itself: a part may hold nothing else that takes focus. */}
      <div className="dn-stack" role="tabpanel" id={`${set}-part`} aria-labelledby={tabId(current)} tabIndex={0}>
        {children}
      </div>
    </>
  )
}
