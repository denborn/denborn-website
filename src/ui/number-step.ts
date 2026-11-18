/**
 * Setting a number without a slider (decision 251): a minus and a plus that
 * go on stepping while they are held, faster after a while, and a number that
 * can be typed. The figures are Denborn's own.
 */

/** A held button: the wait before it repeats, the gap between two repeats, and when it starts going by ten. */
export const HELD = { delayMs: 400, everyMs: 80, fastAfterMs: 2000, fastBy: 10 } as const

/** By how much a button changes the number at a repeat, `heldMs` after it was pressed. */
export function holdStep(heldMs: number): number {
  return heldMs >= HELD.fastAfterMs ? HELD.fastBy : 1
}

/** `value` moved by `by`, no further than the lowest and the highest it can be right now. */
export function stepped(value: number, by: number, floor: number, ceiling: number): number {
  return Math.min(ceiling, Math.max(floor, value + by))
}

/** The whole number that was typed, or nothing when what was typed is not one. */
export function typedNumber(text: string): number | undefined {
  const digits = text.trim()
  return /^\d{1,9}$/.test(digits) ? Number(digits) : undefined
}
