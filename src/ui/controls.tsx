import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useId, useState } from 'react'
import type { MenuPokemon } from '../data/sprites'
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

export type CommandId = 'fight' | 'bag' | 'run' | 'switch'

export interface CommandMenuProps {
  /** The four labels, in the app's language. */
  labels: Record<CommandId, string>
  /** Commands that cannot be used right now. */
  disabled?: readonly CommandId[]
  onCommand: (command: CommandId) => void
  /** Something for the free corner, top right: the way to the battlefield plan. */
  children?: ReactNode
}

/**
 * The battle's four commands on the touch screen: FIGHT as the great ball in
 * the middle, BAG, RUN and SWITCH along the bottom.
 */
export function CommandMenu({ labels, disabled = [], onCommand, children }: CommandMenuProps) {
  const order: CommandId[] = ['fight', 'bag', 'run', 'switch']
  return (
    <div className="dn-commands">
      {order.map((command) => (
        <button
          key={command}
          type="button"
          className={`dn-command dn-command--${command}`}
          disabled={disabled.includes(command)}
          onClick={() => onCommand(command)}
        >
          <span className="dn-command__label">{labels[command]}</span>
        </button>
      ))}
      {children}
    </div>
  )
}

/** A small tile hanging from a top corner of the touch screen, beside the ball: the right corner unless told `left`. */
export function CornerButton({ children, side = 'right', ...rest }: ButtonProps & { side?: 'left' | 'right' }) {
  return (
    <button type="button" className={`dn-command dn-command--corner${side === 'left' ? ' dn-command--corner-left' : ''}`} {...rest}>
      <span className="dn-command__label">{children}</span>
    </button>
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
