import { type CSSProperties, type InputHTMLAttributes, type Ref, useId } from 'react'

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
  /** Receives the heading, so that the flow can move focus to it when the step changes. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * The title of a page or of a step of a flow. It can take focus, so that a
 * change of page or of step is announced and a keyboard starts from the top.
 */
export function StepHeader({ title, count, headingRef }: StepHeaderProps) {
  return (
    <div className="dn-step">
      <h2 ref={headingRef} className="dn-step__title" tabIndex={-1} data-page-heading>
        {title}
      </h2>
      {count && <span className="dn-step__count">{count}</span>}
    </div>
  )
}

export interface NumberFieldProps {
  label: string
  value: number
  min: number
  /** The end of the scale. */
  max: number
  /** The highest the value can go right now, when a budget runs out before the end of the scale. */
  ceiling?: number
  onChange: (value: number) => void
  /** Spoken names of the two buttons, such as "Lower Strength" and "Raise Strength". */
  lowerLabel: string
  raiseLabel: string
}

/**
 * A number to set: a slider for the large moves, a button on each side for
 * one point at a time. The owner of the value decides what is allowed; a
 * value past the ceiling simply does not take.
 */
export function NumberField({ label, value, min, max, ceiling = max, onChange, lowerLabel, raiseLabel }: NumberFieldProps) {
  const id = useId()
  const fill = { '--dn-number-fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties
  return (
    <div className="dn-number">
      <label className="dn-number__name" htmlFor={id}>
        {label}
      </label>
      <output className="dn-number__value" htmlFor={id}>
        {value}
      </output>
      <button type="button" className="dn-number__step" aria-label={lowerLabel} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <input id={id} className="dn-number__slider" type="range" min={min} max={max} value={value} style={fill} onChange={(event) => onChange(Number(event.target.value))} />
      <button type="button" className="dn-number__step" aria-label={raiseLabel} disabled={value >= ceiling} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}
