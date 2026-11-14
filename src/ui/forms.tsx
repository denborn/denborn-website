import { type InputHTMLAttributes, type Ref, useId } from 'react'

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
  /** Where the step stands, such as "Step 2 of 7". */
  count: string
  /** Receives the heading, so that the flow can move focus to it when the step changes. */
  headingRef?: Ref<HTMLHeadingElement>
}

/** The title of a step of a flow. It can take focus, so that changing step can be announced. */
export function StepHeader({ title, count, headingRef }: StepHeaderProps) {
  return (
    <div className="dn-step">
      <h2 ref={headingRef} className="dn-step__title" tabIndex={-1}>
        {title}
      </h2>
      <span className="dn-step__count">{count}</span>
    </div>
  )
}
