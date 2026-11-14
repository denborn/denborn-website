import type { ReactNode } from 'react'
import { HpBar } from './battle'
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
    <button
      type="button"
      className={`dn-line__arrow dn-line__arrow--${way}`}
      disabled={target === undefined}
      aria-label={target === undefined ? undefined : labels[way](slots[target]?.letter ?? '')}
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
  /** What lies between the lines: the terrain in effect. */
  ground?: ReactNode
  /** The way back, shown bottom right. */
  children?: ReactNode
}

/**
 * The battlefield seen from above: the two lines facing each other, each
 * centred on the other as the rules place them, so who faces whom can be read
 * off, with the terrain in effect between them. Every Pokémon is a tile to tap.
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
            <span key={tile.id} className="dn-tile dn-tile--gone" />
          ) : (
            <button
              key={tile.id}
              type="button"
              className={`dn-tile${tile.state === 'downed' ? ' dn-tile--down' : ''}${tile.outOfReach ? ' dn-tile--far' : ''}`}
              aria-pressed={shown.includes(tile.id)}
              aria-label={tile.label}
              onClick={() => onSelect(tile.id)}
            >
              <span className={`dn-tile__letter${tile.mine ? ' dn-tile__letter--mine' : ''}`}>{tile.letter}</span>
              <PokemonIcon num={tile.num} />
              {tile.state === 'downed' ? (
                <span className="dn-tile__pips">
                  {Array.from({ length: 3 }, (_, index) => (
                    <span key={index} className={`dn-agony__pip${index < (tile.stacks ?? 0) ? '' : ' dn-agony__pip--spent'}`} />
                  ))}
                </span>
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
      {children && <div className="dn-field__back">{children}</div>}
    </div>
  )
}
