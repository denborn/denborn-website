/** How full a bar is, and which colour an HP bar takes. */

export type HpTone = 'high' | 'mid' | 'low'

/** Share of the bar that is filled, from 0 to 1. A Pokémon with any HP left always shows a sliver. */
export function fillRatio(current: number, max: number): number {
  if (max <= 0 || current <= 0) return 0
  return Math.min(1, Math.max(current / max, 1 / 48))
}

/**
 * The games' HP colours: green above half, yellow down to a fifth, red at a
 * fifth or less (DESIGN.md, "Meters").
 */
export function hpTone(current: number, max: number): HpTone {
  const ratio = max > 0 ? current / max : 0
  if (ratio > 0.5) return 'high'
  if (ratio > 0.2) return 'mid'
  return 'low'
}
