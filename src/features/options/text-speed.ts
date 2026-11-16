/**
 * How fast the battle's text goes, as the games let a player choose
 * (decision 155): slow, normal or fast. A choice of the device, kept like the
 * language.
 */
import { useSyncExternalStore } from 'react'
import { createDeviceChoice } from '../../storage/device-choice'

export const TEXT_SPEEDS = ['slow', 'normal', 'fast'] as const
export type TextSpeed = (typeof TEXT_SPEEDS)[number]

export interface TextPace {
  /** Letters of a message that appear each second. */
  lettersPerSecond: number
  /** How long a step that says something stays before the next, in milliseconds. */
  saidMs: number
  /** How long a step that only shows a change stays. */
  quietMs: number
}

/** Each speed's pace. The figures are Denborn's own; the three speeds are the games'. */
export const TEXT_PACE: Record<TextSpeed, TextPace> = {
  slow: { lettersPerSecond: 25, saidMs: 2400, quietMs: 650 },
  normal: { lettersPerSecond: 45, saidMs: 1600, quietMs: 450 },
  fast: { lettersPerSecond: 90, saidMs: 1000, quietMs: 300 },
}

/** A stored choice wins; otherwise normal, the games' own default. */
export function pickTextSpeed(stored: string | null): TextSpeed {
  return TEXT_SPEEDS.find((speed) => speed === stored) ?? 'normal'
}

const choice = createDeviceChoice('denborn/text-speed', pickTextSpeed)

export function setTextSpeed(speed: TextSpeed): void {
  choice.set(speed)
}

export function useTextSpeed(): TextSpeed {
  return useSyncExternalStore(choice.subscribe, choice.get)
}
