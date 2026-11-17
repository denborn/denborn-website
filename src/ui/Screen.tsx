import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { snapScale } from './pixel'

/** Width of a DS screen, in DS pixels. Everything inside a Screen is sized in these. */
export const DS_WIDTH = 256

export interface ScreenMetrics {
  /** One DS pixel, in CSS pixels. */
  unit: number
  /** Device pixels per CSS pixel. */
  ratio: number
}

/** Outside a Screen: the same 2 px as the `--dn-u` fallback of tokens.css. */
const MetricsContext = createContext<ScreenMetrics>({ unit: 2, ratio: 1 })

/** The size of one DS pixel in CSS pixels, inside the nearest Screen. */
export function useDsUnit(): number {
  return useContext(MetricsContext).unit
}

/** One DS pixel and the device's pixel ratio, inside the nearest Screen: for art drawn on a grid of its own. */
export function useScreenMetrics(): ScreenMetrics {
  return useContext(MetricsContext)
}

/**
 * The size, in CSS pixels, to give one pixel of a sprite or an icon so that it
 * stays sharp. `dsScale` is the size wanted in DS pixels: 1 draws the art as
 * large as the DS did.
 */
export function usePixelScale(dsScale = 1): number {
  const { unit, ratio } = useContext(MetricsContext)
  return snapScale(dsScale, unit, ratio)
}

export interface ScreenProps {
  /**
   * `scene`: the top screen of a battle. `touch`: the bottom screen. `menu`: a menu background. `blank`: black, nothing on it.
   * `den`: inside the den (decision 244), whose backdrop `DenInside` draws, put first in the screen.
   */
  kind?: 'scene' | 'touch' | 'menu' | 'blank' | 'den'
  /** What the screen is, for assistive technology. */
  label: string
  /** What it holds is a column from its top, scrolled inside the screen when it is longer: a menu, a form, a list (decision 216). */
  scrolls?: boolean
  children?: ReactNode
}

/**
 * One DS screen: a 4:3 surface on which everything keeps the DS's proportions
 * at any size. Two of them, one over the other, are the DS (`DualScreen`). One
 * that `scrolls` is a DS screen still: only what it holds moves.
 */
export function Screen({ kind = 'scene', label, scrolls = false, children }: ScreenProps) {
  const ref = useRef<HTMLElement>(null)
  const [metrics, setMetrics] = useState<ScreenMetrics>({ unit: 2, ratio: 1 })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setMetrics({ unit: entry.contentRect.width / DS_WIDTH, ratio: window.devicePixelRatio })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className={`dn-root dn-screen dn-screen--${kind}${scrolls ? ' dn-screen--scrolls' : ''}`} aria-label={label}>
      <div className="dn-screen__stage">
        <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
      </div>
    </section>
  )
}
