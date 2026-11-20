import { type CSSProperties, useId } from 'react'
import { type Stepper, useHeldStep, useTypedNumber } from '../number-entry'

export interface StepperBoxProps {
  /** The few letters on the box. */
  short: string
  /** The whole name of what the number is, read out after its letters. */
  name: string
  /** The colours of the box's name: a fill and its dark shade, as a type label's. Left out, the Pokédex's blue. */
  tone?: { fill: string; shade: string }
  value: number
  /** The two ends of the scale. */
  min: number
  max: number
  /** The highest the value can go right now, when a budget runs out before the end of the scale. */
  ceiling?: number
  /** The lowest the value can go right now, when part of it is there for good. */
  floor?: number
  onChange: (value: number) => void
  /** Spoken names of the two buttons, such as "Raise Strength" and "Lower Strength". */
  raiseLabel: string
  lowerLabel: string
  /** The words of two more keys, over the plus and under the minus, that take the number to the highest and to the lowest it can be (decision 303). Left out, there are none. */
  ends?: { most: string; least: string }
  /**
   * A second plus beside the plus and a second minus beside the minus, that move the number by `by` (decision 304, a
   * trial); the first ones then say +1 and −1. Left out, there is one of each.
   */
  bigStep?: { by: number; raiseLabel: string; lowerLabel: string } | undefined
}

/**
 * A number in a box of the Pokédex (decision 292): plus above it, minus below.
 * It is the kit's number entry in another shape (decision 251 holds: no
 * slider): a tap is one point, a button held goes on, by one then by ten, and
 * the number itself can be typed.
 */
export function StepperBox({ short, name, tone, value, min, max, ceiling = max, floor = min, onChange, raiseLabel, lowerLabel, ends, bigStep }: StepperBoxProps) {
  const id = useId()
  const stepper: Stepper = { value, floor, ceiling, onChange }
  const raise = useHeldStep(1, stepper)
  const lower = useHeldStep(-1, stepper)
  // The second pair goes on by its own size while it is held (decision 305). Unused without one.
  const raiseMore = useHeldStep(1, stepper, bigStep?.by)
  const lowerMore = useHeldStep(-1, stepper, bigStep?.by)
  const typed = useTypedNumber(stepper)
  const style = tone ? ({ '--dn-stepper-fill': tone.fill, '--dn-stepper-shade': tone.shade } as CSSProperties) : undefined
  return (
    <div className={`dn-stepper${ends ? ' dn-stepper--ends' : ''}`} role="group" aria-labelledby={id} style={style}>
      {ends && (
        <button type="button" className="dn-stepper__end" disabled={value >= ceiling} onClick={() => onChange(ceiling)}>
          {ends.most}
          <span className="dn-visually-hidden"> ({name})</span>
        </button>
      )}
      {bigStep ? (
        <span className="dn-stepper__pair">
          <button type="button" className="dn-stepper__step dn-stepper__step--figure" disabled={value >= ceiling} {...raise}>
            <span aria-hidden="true">+1</span>
            <span className="dn-visually-hidden">{raiseLabel}</span>
          </button>
          <button type="button" className="dn-stepper__step dn-stepper__step--figure" disabled={value >= ceiling} {...raiseMore}>
            <span aria-hidden="true">+{bigStep.by}</span>
            <span className="dn-visually-hidden">{bigStep.raiseLabel}</span>
          </button>
        </span>
      ) : (
        <button type="button" className="dn-stepper__step dn-stepper__step--raise" aria-label={raiseLabel} disabled={value >= ceiling} {...raise} />
      )}
      {/* Named by its letters, then by its whole name for whoever cannot see what they stand for. */}
      <span id={id} className="dn-stepper__name">
        {short}
        <span className="dn-visually-hidden"> ({name})</span>
      </span>
      <input className="dn-stepper__value" aria-labelledby={id} {...typed} />
      {bigStep ? (
        <span className="dn-stepper__pair">
          <button type="button" className="dn-stepper__step dn-stepper__step--figure" disabled={value <= floor} {...lower}>
            <span aria-hidden="true">−1</span>
            <span className="dn-visually-hidden">{lowerLabel}</span>
          </button>
          <button type="button" className="dn-stepper__step dn-stepper__step--figure" disabled={value <= floor} {...lowerMore}>
            <span aria-hidden="true">−{bigStep.by}</span>
            <span className="dn-visually-hidden">{bigStep.lowerLabel}</span>
          </button>
        </span>
      ) : (
        <button type="button" className="dn-stepper__step dn-stepper__step--lower" aria-label={lowerLabel} disabled={value <= floor} {...lower} />
      )}
      {ends && (
        <button type="button" className="dn-stepper__end" disabled={value <= floor} onClick={() => onChange(floor)}>
          {ends.least}
          <span className="dn-visually-hidden"> ({name})</span>
        </button>
      )}
    </div>
  )
}
