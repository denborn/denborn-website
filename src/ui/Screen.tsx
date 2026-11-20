import { type CSSProperties, type ReactNode, createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { BATTLE_TOUCH } from '../data/sprites'
import { DEX } from './motion'
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
   * `scene`: the top screen of a battle. `touch`: the bottom screen, with the two halves of the games' ball over a brown ground, behind what it holds (decisions 255 and 259).
   * `menu`: a menu background. `blank`: black, nothing on it.
   * `den`: inside the den (decision 244), whose backdrop `DenInside` draws, put first in the screen.
   * `dex`: a screen of the Pokédex (decision 287): its blue grid, sliding.
   */
  kind?: 'scene' | 'touch' | 'menu' | 'blank' | 'den' | 'dex'
  /** What the screen is, for assistive technology. */
  label: string
  /** What it holds is a column from its top, scrolled inside the screen when it is longer: a menu, a form, a list (decision 216). */
  scrolls?: boolean
  /** On a `touch` screen, how the ball stands: `shut`, with FIGHT in its belt, or `open`, its halves apart over what the screen holds (decision 259). Shut when left out. */
  ball?: 'shut' | 'open'
  children?: ReactNode
}

/** One half of the games' ball, as wide as the screen: its rows of the picture, on the rows of the screen it takes while the ball is shut. */
function BallHalf({ half }: { half: 'red' | 'white' }) {
  const piece = BATTLE_TOUCH[half]
  const style: CSSProperties = {
    top: `calc(${piece.screen} * var(--dn-u))`,
    height: `calc(${piece.height} * var(--dn-u))`,
    backgroundImage: `url(${BATTLE_TOUCH.url})`,
    backgroundSize: `100% calc(${BATTLE_TOUCH.height} * var(--dn-u))`,
    backgroundPosition: `0 calc(${-piece.y} * var(--dn-u))`,
  }
  return <span className={`dn-ball__half dn-ball__half--${half}`} style={style} />
}

/**
 * One DS screen: a 4:3 surface on which everything keeps the DS's proportions
 * at any size. Two of them, one over the other, are the DS (`DualScreen`). One
 * that `scrolls` is a DS screen still: only what it holds moves.
 */
export function Screen({ kind = 'scene', label, scrolls = false, ball = 'shut', children }: ScreenProps) {
  const ref = useRef<HTMLElement>(null)
  const [metrics, setMetrics] = useState<ScreenMetrics>({ unit: 2, ratio: 1 })
  // How far into its slide the Pokédex's grid is, by the clock: every screen of the Pokédex counts from the same moment, so the
  // grid of the screen that comes carries on where the grid of the one that went was.
  const [slidFor] = useState(() => (kind === 'dex' ? Date.now() % (DEX.drift * 1000) : undefined))

  // Measured before the screen is first painted: a screen drawn with a guessed DS pixel would show its pictures at the wrong
  // size for a moment, every time it comes (the bar of steps of creation did, at each step). Then measured again as it changes.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const style = getComputedStyle(element)
    const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    if (width > 0) setMetrics({ unit: width / DS_WIDTH, ratio: window.devicePixelRatio })
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setMetrics({ unit: entry.contentRect.width / DS_WIDTH, ratio: window.devicePixelRatio })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={`dn-root dn-screen dn-screen--${kind}${scrolls ? ' dn-screen--scrolls' : ''}`}
      aria-label={label}
      style={slidFor === undefined ? undefined : ({ '--dn-dex-since': `${-slidFor}ms` } as CSSProperties)}
    >
      {kind === 'touch' && (
        <span className={`dn-ball dn-ball--${ball}`} aria-hidden="true">
          <BallHalf half="red" />
          <BallHalf half="white" />
        </span>
      )}
      <div className="dn-screen__stage">
        <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
      </div>
    </section>
  )
}
