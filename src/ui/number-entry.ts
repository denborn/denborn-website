/**
 * Moving a number without a slider (decision 251), for whatever draws it: a
 * button that steps and goes on while it is held, and a field the number can
 * be typed in. The figures are in number-step.ts.
 */
import { type ButtonHTMLAttributes, type InputHTMLAttributes, useEffect, useRef, useState } from 'react'
import { HELD, holdStep, stepped, typedNumber } from './number-step'

/** Where a number stands and how it is moved: what a held button reads each time it repeats. */
export interface Stepper {
  value: number
  /** The lowest and the highest the value can go right now. */
  floor: number
  ceiling: number
  onChange: (value: number) => void
}

/** For this long after a held button is let go, the click that comes with letting go is not a step of its own. */
const CLICK_AFTER_HOLD_MS = 500

/**
 * A button that moves a number by one when pressed, and goes on while it is
 * held, by one and then by ten (`HELD`); one of a set `size` moves by it at
 * each press and each repeat. It waits before it repeats, so a
 * finger that starts a scroll on it changes nothing; it stops when let go,
 * when the finger leaves it, at the end of the scale, or when the number's
 * owner did not take the last step.
 */
export function useHeldStep(direction: 1 | -1, stepper: Stepper, size?: number): Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel' | 'onBlur' | 'onClick'> {
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
    if (press.from === value || !move(direction * holdStep(HELD.delayMs + press.repeats * HELD.everyMs, size))) return
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
      else move(direction * (size ?? 1))
    },
  }
}

/** What the keys do to a number, as on any spin button: the arrows by one, Page Up and Page Down by ten. */
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowUp: 1, ArrowDown: -1, PageUp: HELD.fastBy, PageDown: -HELD.fastBy }

/**
 * A field the number can be typed in, as a spin button: what it shows, and
 * what typing, the keys and leaving it do. The owner of the value decides what
 * is allowed: nothing past the ceiling or under the floor is asked of it.
 */
export function useTypedNumber({ value, floor, ceiling, onChange }: Stepper): Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'pattern' | 'autoComplete' | 'enterKeyHint' | 'role' | 'aria-valuenow' | 'aria-valuemin' | 'aria-valuemax' | 'value' | 'onFocus' | 'onChange' | 'onBlur' | 'onKeyDown'> {
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

  return {
    type: 'text',
    inputMode: 'numeric',
    pattern: '[0-9]*',
    autoComplete: 'off',
    enterKeyHint: 'done',
    role: 'spinbutton',
    'aria-valuenow': value,
    'aria-valuemin': floor,
    'aria-valuemax': ceiling,
    value: draft ?? String(value),
    onFocus: (event) => event.currentTarget.select(),
    onChange: (event) => {
      setDraft(event.target.value)
      // A number that is allowed takes at once; one that is not yet (the first digit of a larger one) waits.
      const typed = typedNumber(event.target.value)
      if (typed !== undefined && typed >= floor && typed <= ceiling && typed !== value) onChange(typed)
    },
    onBlur: settle,
    onKeyDown: (event) => {
      const by = KEY_STEPS[event.key]
      if (by !== undefined) set(value + by)
      else if (event.key === 'Home') set(floor)
      else if (event.key === 'End') set(ceiling)
      else if (event.key !== 'Enter') return
      // Enter ends the typing; it does not send the form the number is in.
      event.preventDefault()
      if (event.key === 'Enter') settle()
      else setDraft(undefined)
    },
  }
}
