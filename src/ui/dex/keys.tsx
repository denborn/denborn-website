import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface DexKeyProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  /**
   * `key`: one of the bar's keys, a point at its left end: the first of a bar. `go`: the way on, red, its point at the far end.
   * `end`: the last key of a bar that is not the way on, its point at its right end (decision 303).
   * `square`: no point, a plain rectangle: a mark alone, or a key between two others (decision 300).
   */
  shape?: 'key' | 'go' | 'end' | 'square'
  /** Lit as the way on is: red as it is, blue, or grey with a checker on its upper half (decisions 298 and 301). */
  tone?: 'red' | 'blue' | 'grey' | undefined
  /** For a key that turns something on: whether it is on. */
  on?: boolean | undefined
  /**
   * A key in the body of a screen, as tall and as wide as the room it is given. No bar of keys frames it,
   * so it is whole by itself: a point at each end (decision 297).
   */
  large?: boolean
}

/** A key of the Pokédex (decision 287), after the games' START and SELECT along the bottom of theirs. */
export function DexKey({ shape = 'key', tone, on, large = false, children, ...rest }: DexKeyProps) {
  const shaped = shape === 'key' ? '' : ` dn-dex-key--${shape}`
  const toned = tone ? ` dn-dex-key--${tone}` : ''
  return (
    <button type="button" className={`dn-dex-key${shaped}${toned}${large ? ' dn-dex-key--large' : ''}`} aria-pressed={on} {...rest}>
      {children}
    </button>
  )
}

/** An icon between the games' two brackets. `lit` turns them red: on a row of its own, out of a lit bar. */
export function DexIcon({ lit = false, children }: { lit?: boolean; children: ReactNode }) {
  return (
    <span className={`dn-dex-icon${lit ? ' dn-dex-icon--lit' : ''}`} aria-hidden="true">
      <span className="dn-dex-icon__art">{children}</span>
    </span>
  )
}

/** The lamp of a row: lit once what the row names is the one chosen. It says nothing by itself: the row's words do. */
export function DexLamp({ on }: { on: boolean }) {
  return <span className={`dn-dex-lamp${on ? ' dn-dex-lamp--on' : ''}`} aria-hidden="true" />
}
