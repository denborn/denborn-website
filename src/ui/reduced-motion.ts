import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * Whether the person asked their device for less motion. The kit's one
 * answer to that question: sprites stand still, bars jump to their value,
 * text shows whole. It asks the browser itself, so a screen that moves
 * nothing does not have to carry the animation library to know.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}
