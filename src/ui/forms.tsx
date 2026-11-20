import { type InputHTMLAttributes, useId } from 'react'
import { type Stepper, useHeldStep, useTypedNumber } from './number-entry'

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
  const typed = useTypedNumber(stepper)

  return (
    <div className="dn-number">
      <label className="dn-number__name" htmlFor={id}>
        {label}
      </label>
      <button type="button" className="dn-number__step dn-number__step--lower" aria-label={lowerLabel} disabled={value <= floor} {...lower}>
        −
      </button>
      <input id={id} className="dn-number__value" {...typed} />
      <button type="button" className="dn-number__step dn-number__step--raise" aria-label={raiseLabel} disabled={value >= ceiling} {...raise}>
        +
      </button>
    </div>
  )
}
