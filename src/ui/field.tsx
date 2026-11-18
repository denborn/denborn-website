import type { ReactNode } from 'react'
import { AgonyBars, HpBar } from './battle'
import { ArrowButton } from './controls'
import { type FieldState, neighbourSlot } from './line'
import { PokemonIcon } from './sprites'

export interface LineSlot {
  /** The slot's letter on its line: A, B, C… from the left. */
  letter: string
  state: FieldState
  /** True for the viewer's own Pokémon. */
  mine?: boolean
}

export interface LineBrowserProps {
  slots: readonly LineSlot[]
  /** Index of the slot shown. */
  current: number
  onChange: (index: number) => void
  /** Spoken names of the two arrows, given the letter of the slot each leads to. */
  labels: { previous: (letter: string) => string; next: (letter: string) => string }
  /** Read out when the Pokémon shown changes, such as "B: Arcanine". */
  currentLabel: string
  /** What is shown for the current slot: its HUD box. */
  children: ReactNode
}

/**
 * One Pokémon of a line at a time, as in the games, with an arrow on each side
 * to walk along the line and the line's letters underneath. The arrows step
 * over empty slots and stop at the ends.
 */
export function LineBrowser({ slots, current, onChange, labels, currentLabel, children }: LineBrowserProps) {
  const states = slots.map((slot) => slot.state)
  const previous = neighbourSlot(states, current, -1)
  const next = neighbourSlot(states, current, 1)
  const arrow = (target: number | undefined, way: 'previous' | 'next') => (
    <ArrowButton
      way={way}
      disabled={target === undefined}
      label={labels[way](target === undefined ? '' : (slots[target]?.letter ?? ''))}
      onClick={() => target !== undefined && onChange(target)}
    />
  )
  return (
    <div className="dn-line">
      {arrow(previous, 'previous')}
      <div className="dn-line__body">
        <span className="dn-visually-hidden" role="status">
          {currentLabel}
        </span>
        {children}
        <span className="dn-line__strip dn-text-outline" aria-hidden="true">
          {slots.map((slot, index) => {
            const classes = ['dn-line__slot']
            if (index === current) classes.push('dn-line__slot--current')
            if (slot.state !== 'standing') classes.push(`dn-line__slot--${slot.state}`)
            if (slot.mine) classes.push('dn-line__slot--mine')
            return (
              <span key={slot.letter} className={classes.join(' ')}>
                {slot.letter}
              </span>
            )
          })}
        </span>
      </div>
      {arrow(next, 'next')}
    </div>
  )
}

export interface FieldTile {
  id: string
  /** The slot's letter on its line. */
  letter: string
  /** National Pokédex number, for the icon. */
  num: number
  hp: number
  maxHp: number
  state: FieldState
  /** Agony stacks left, for a downed Pokémon. */
  stacks?: number
  /** True for the viewer's own Pokémon. */
  mine?: boolean
  /** True when the viewer's own Pokémon cannot reach this one. */
  outOfReach?: boolean
  /** True when it carries stat changes or effects of its own; its spoken label should say so. */
  changed?: boolean
  /** True when it cannot be picked right now: while a target or an ally is being chosen, those that are not offered. */
  disabled?: boolean
  /** For the slot a dead Pokémon left: true when the place itself can be picked, to move into it. */
  open?: boolean
  /** Spoken description: letter, name, HP and whatever else is worth saying. */
  label: string
}

export interface FieldPlanProps {
  foes: readonly FieldTile[]
  allies: readonly FieldTile[]
  /** The tiles of the Pokémon on the scene: one of each line. */
  shown?: readonly string[]
  onSelect: (id: string) => void
  /** Captions of the two lines. */
  labels: { foes: string; allies: string }
  /** What lies between the lines: the terrain and the weather, by name. */
  ground?: ReactNode
  /** The foot of the plan: the way to the list of effects, the way back. */
  children?: ReactNode
}

/**
 * The battlefield seen from above: the two lines facing each other, each
 * centred on the other as the rules place them, so who faces whom can be read
 * off, with the terrain and the weather named between them. Every Pokémon is
 * a tile to tap.
 */
export function FieldPlan({ foes, allies, shown = [], onSelect, labels, ground, children }: FieldPlanProps) {
  const line = (tiles: readonly FieldTile[], caption: string) => (
    <div className="dn-field__line" role="group" aria-label={caption}>
      <span className="dn-field__caption" aria-hidden="true">
        {caption}
      </span>
      <div className="dn-field__tiles">
        {tiles.map((tile) =>
          tile.state === 'gone' ? (
            tile.open ? (
              <button key={tile.id} type="button" className="dn-tile dn-tile--gone" aria-label={tile.label} onClick={() => onSelect(tile.id)}>
                <span className="dn-tile__letter">{tile.letter}</span>
              </button>
            ) : (
              <span key={tile.id} className="dn-tile dn-tile--gone" />
            )
          ) : (
            <button
              key={tile.id}
              type="button"
              className={`dn-tile${tile.state === 'downed' ? ' dn-tile--down' : ''}${tile.outOfReach || tile.disabled ? ' dn-tile--far' : ''}`}
              aria-pressed={shown.includes(tile.id)}
              aria-label={tile.label}
              disabled={tile.disabled}
              onClick={() => onSelect(tile.id)}
            >
              <span className={`dn-tile__letter${tile.mine ? ' dn-tile__letter--mine' : ''}`}>{tile.letter}</span>
              {tile.changed && <span className="dn-changes dn-tile__changes" />}
              <PokemonIcon num={tile.num} />
              {tile.state === 'downed' ? (
                // A downed Pokémon's Agony stacks, as three bars in its HP bar's place (decision 266).
                <AgonyBars stacks={tile.stacks ?? 0} label={tile.label} />
              ) : (
                <HpBar current={tile.hp} max={tile.maxHp} label={tile.label} />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  )
  return (
    <div className="dn-field">
      {line(foes, labels.foes)}
      <div className="dn-field__ground">{ground}</div>
      {line(allies, labels.allies)}
      {children && <div className="dn-field__foot">{children}</div>}
    </div>
  )
}

export interface FieldEffect {
  id: string
  name: string
  /** Whom it touches: the whole field, the foes' side or the party's side. */
  scope: 'field' | 'foes' | 'party'
  /** For an effect that sits on one Pokémon of that side: its letter on the line. */
  letter?: string
  /** The same in words, such as "Foes' side" or "Foes' side, B: Arcanine". */
  scopeText: string
  /** How long it still lasts, in words. Absent for what stays until removed. */
  lasting?: string
  /** What it does. */
  description?: string
}

export interface FieldEffectsProps {
  effects: readonly FieldEffect[]
  /** Name of the list, for assistive technology. */
  label: string
  /** Shown when nothing is in effect. */
  empty: string
  /** The way back, shown bottom right. */
  children?: ReactNode
}

/**
 * Everything in effect on the battlefield: terrain, weather, rooms, screens,
 * hazards, and what sits on a single Pokémon (stat changes, Leech Seed…).
 * Each entry says whom it touches, with an arrow toward that side of the plan
 * and the Pokémon's letter when it is one Pokémon's, how long it lasts and
 * what it does. The list scrolls when long.
 */
export function FieldEffects({ effects, label, empty, children }: FieldEffectsProps) {
  return (
    <div className="dn-effects">
      {effects.length === 0 ? (
        <p className="dn-effects__empty">{empty}</p>
      ) : (
        // Focusable, so that a keyboard can scroll it.
        <ul className="dn-effects__list" aria-label={label} tabIndex={0}>
          {effects.map((effect) => (
            <li key={effect.id} className={`dn-effect dn-effect--${effect.scope}`}>
              <span className="dn-effect__who" aria-hidden="true">
                <span className="dn-effect__mark" />
                {effect.letter}
              </span>
              <span className="dn-effect__name">{effect.name}</span>
              {effect.lasting && <span className="dn-effect__lasting">{effect.lasting}</span>}
              <span className="dn-effect__scope">{effect.scopeText}</span>
              {effect.description && <p className="dn-effect__text">{effect.description}</p>}
            </li>
          ))}
        </ul>
      )}
      {children && <div className="dn-effects__back">{children}</div>}
    </div>
  )
}
