import { type ButtonHTMLAttributes, type InputHTMLAttributes, useEffect, useId, useRef, useState } from 'react'
import { HELD, holdStep, stepped, typedNumber } from './number-step'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (value: string) => void
  /** Said under the field: how to fill it in, or what is wrong. */
  hint?: string
  /** True when the hint says what is wrong. */
  invalid?: boolean
}

/** A line of text to type, with its label and a line of help underneath. */
export function TextField({ label, value, onChange, hint, invalid = false, ...rest }: TextFieldProps) {
  const id = useId()
  return (
    <div className="dn-entry">
      <label className="dn-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="dn-entry__input"
        type="text"
        value={value}
        aria-invalid={invalid}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className={`dn-note${invalid ? ' dn-note--error' : ''}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

export interface StatRowProps {
  name: string
  value: number
  /** The value that fills the bar. */
  max: number
  /** Raised or lowered by the nature. */
  trend?: 'up' | 'down'
  /** Said after the name for a raised or a lowered stat, such as "raised by its nature". */
  trendLabel?: string
}

/** One stat: its name, a bar, its value. A nature's effect is shown by an arrow as well as a colour. */
export function StatRow({ name, value, max, trend, trendLabel }: StatRowProps) {
  const ratio = Math.min(1, Math.max(0, value / max))
  return (
    <div className={`dn-stat${trend ? ` dn-stat--${trend}` : ''}`}>
      <span className="dn-stat__name">
        {name}
        {trend && <span aria-hidden="true">{trend === 'up' ? ' ▲' : ' ▼'}</span>}
        {trend && trendLabel && <span className="dn-visually-hidden"> {trendLabel}</span>}
      </span>
      <span className="dn-meter dn-meter--exp" aria-hidden="true">
        <span className="dn-meter__fill" style={{ transform: `scaleX(${ratio})` }} />
      </span>
      <span className="dn-stat__value">{value}</span>
    </div>
  )
}

export interface StepHeaderProps {
  title: string
  /** Where the step stands, such as "Step 2 of 7". Left out for a page that is not a step. */
  count?: string
}

/**
 * The title of a page or of a step of a flow. It can take focus: the frame
 * gives it to the title of a screen that comes in (`DualScreenFrame`), so that
 * a change of page or of step is announced and a keyboard starts from the top.
 */
export function StepHeader({ title, count }: StepHeaderProps) {
  return (
    <div className="dn-step">
      <h2 className="dn-step__title" tabIndex={-1} data-page-heading>
        {title}
      </h2>
      {count && <span className="dn-step__count">{count}</span>}
    </div>
  )
}

export interface NumberFieldProps {
  label: string
  value: number
  /** The two ends of the scale. */
  min: number
  max: number
  /** The highest the value can go right now, when a budget runs out before the end of the scale. */
  ceiling?: number
  /** The lowest the value can go right now, when part of it is there for good. */
  floor?: number
  onChange: (value: number) => void
  /** Spoken names of the two buttons, such as "Lower Strength" and "Raise Strength". */
  lowerLabel: string
  raiseLabel: string
}

/** Where a number stands and how it is moved: what a held button reads each time it repeats. */
interface Stepper {
  value: number
  floor: number
  ceiling: number
  onChange: (value: number) => void
}

/** For this long after a held button is let go, the click that comes with letting go is not a step of its own. */
const CLICK_AFTER_HOLD_MS = 500

/**
 * A button that moves a number by one when pressed, and goes on while it is
 * held, by one and then by ten (`HELD`). It waits before it repeats, so a
 * finger that starts a scroll on it changes nothing; it stops when let go,
 * when the finger leaves it, at the end of the scale, or when the number's
 * owner did not take the last step.
 */
function useHeldStep(direction: 1 | -1, stepper: Stepper): Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel' | 'onBlur' | 'onClick'> {
  const latest = useRef(stepper)
  useEffect(() => {
    latest.current = stepper
  })
  /** The press being held: its timer, how many times it has repeated, and the number its last step started from. */
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; repeats: number; from?: number }>({ repeats: 0 })
  /** True between letting go of a button that repeated and the click that letting go makes. */
  const swallow = useRef<{ click: boolean; timer?: ReturnType<typeof setTimeout> }>({ click: false })

  const stop = (): void => {
    clearTimeout(hold.current.timer)
  }
  useEffect(() => {
    // One object each for the life of the button: only what they hold changes.
    const press = hold.current
    const after = swallow.current
    const hidden = (): void => {
      clearTimeout(press.timer)
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      clearTimeout(press.timer)
      clearTimeout(after.timer)
    }
  }, [])

  const move = (by: number): boolean => {
    const { value, floor, ceiling, onChange } = latest.current
    const next = stepped(value, by, floor, ceiling)
    if (next === value) return false
    onChange(next)
    return true
  }
  const repeat = (): void => {
    const press = hold.current
    const { value } = latest.current
    // The last step asked for moved nothing: its owner did not take it.
    if (press.from === value || !move(direction * holdStep(HELD.delayMs + press.repeats * HELD.everyMs))) return
    press.from = value
    press.repeats++
    press.timer = setTimeout(repeat, HELD.everyMs)
  }

  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return
      stop()
      const press = hold.current
      press.repeats = 0
      delete press.from
      press.timer = setTimeout(repeat, HELD.delayMs)
    },
    onPointerUp: () => {
      stop()
      if (hold.current.repeats === 0) return
      const after = swallow.current
      clearTimeout(after.timer)
      after.click = true
      after.timer = setTimeout(() => {
        after.click = false
      }, CLICK_AFTER_HOLD_MS)
    },
    onPointerLeave: stop,
    onPointerCancel: stop,
    onBlur: stop,
    // A tap, a key or a screen reader's press: one step. The click that ends a hold is not one more.
    onClick: () => {
      if (swallow.current.click) swallow.current.click = false
      else move(direction)
    },
  }
}

/** What the keys do to a number, as on any spin button: the arrows by one, Page Up and Page Down by ten. */
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowUp: 1, ArrowDown: -1, PageUp: HELD.fastBy, PageDown: -HELD.fastBy }

/**
 * A number to set (decision 251): a minus, the number, a plus, on one row.
 * A tap on a button is one point; held down it goes on, by one and then by
 * ten. The number itself can be typed. The owner of the value decides what is
 * allowed: nothing past the ceiling or under the floor is asked of it.
 */
export function NumberField({ label, value, min, max, ceiling = max, floor = min, onChange, lowerLabel, raiseLabel }: NumberFieldProps) {
  const id = useId()
  const stepper: Stepper = { value, floor, ceiling, onChange }
  const lower = useHeldStep(-1, stepper)
  const raise = useHeldStep(1, stepper)
  // What is being typed, for as long as it is: the number itself shows otherwise.
  const [draft, setDraft] = useState<string>()

  const set = (next: number): void => {
    const kept = stepped(next, 0, floor, ceiling)
    if (kept !== value) onChange(kept)
  }
  /** Typing is over: what was typed is brought within what is allowed, and anything that is not a number is forgotten. */
  const settle = (): void => {
    const typed = draft === undefined ? undefined : typedNumber(draft)
    if (typed !== undefined) set(typed)
    setDraft(undefined)
  }

  return (
    <div className="dn-number">
      <label className="dn-number__name" htmlFor={id}>
        {label}
      </label>
      <button type="button" className="dn-number__step dn-number__step--lower" aria-label={lowerLabel} disabled={value <= floor} {...lower}>
        −
      </button>
      <input
        id={id}
        className="dn-number__value"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        enterKeyHint="done"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={floor}
        aria-valuemax={ceiling}
        value={draft ?? String(value)}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          setDraft(event.target.value)
          // A number that is allowed takes at once; one that is not yet (the first digit of a larger one) waits.
          const typed = typedNumber(event.target.value)
          if (typed !== undefined && typed >= floor && typed <= ceiling && typed !== value) onChange(typed)
        }}
        onBlur={settle}
        onKeyDown={(event) => {
          const by = KEY_STEPS[event.key]
          if (by !== undefined) set(value + by)
          else if (event.key === 'Home') set(floor)
          else if (event.key === 'End') set(ceiling)
          else if (event.key !== 'Enter') return
          // Enter ends the typing; it does not send the form the number is in.
          event.preventDefault()
          if (event.key === 'Enter') settle()
          else setDraft(undefined)
        }}
      />
      <button type="button" className="dn-number__step dn-number__step--raise" aria-label={raiseLabel} disabled={value >= ceiling} {...raise}>
        +
      </button>
    </div>
  )
}
