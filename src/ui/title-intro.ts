/**
 * The title screen's intro (decision 205), step by step: the den in daylight
 * with no light; its light rises; the first red strike as the plain turns
 * dark; the name appears; then the storm, rain and lightning, for as long as
 * the screen shows. Each step keeps what the ones before brought.
 */
import { TITLE } from './motion'

export const TITLE_PHASES = ['day', 'rising', 'strike', 'named', 'storm'] as const
export type TitlePhase = (typeof TITLE_PHASES)[number]

/** How long each step lasts before the next, in milliseconds. The storm lasts. */
const LENGTH: Record<Exclude<TitlePhase, 'storm'>, number> = {
  day: TITLE.day * 1000,
  rising: TITLE.rise * 1000,
  strike: TITLE.darken * 1000,
  named: TITLE.name * 1000,
}

export function phaseLength(phase: TitlePhase): number | undefined {
  return phase === 'storm' ? undefined : LENGTH[phase]
}

/** The step after this one; the storm is the last. */
export function nextPhase(phase: TitlePhase): TitlePhase {
  return TITLE_PHASES[Math.min(TITLE_PHASES.length - 1, TITLE_PHASES.indexOf(phase) + 1)] ?? 'storm'
}

/** Whether the intro has got as far as `step`: the light, once risen, stays; so do the dark and the name. */
export function reached(phase: TitlePhase, step: TitlePhase): boolean {
  return TITLE_PHASES.indexOf(phase) >= TITLE_PHASES.indexOf(step)
}
