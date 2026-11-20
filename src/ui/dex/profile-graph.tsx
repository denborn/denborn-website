import { MotionConfig, motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { DURATION, EASE } from '../motion'
import { usePrefersReducedMotion } from '../reduced-motion'
import { cornerPoint, polygonOf, shapePoints } from './profile'

export interface ProfileCorner {
  /** What tells it from the others. */
  id: string
  /** The few letters at the corner. */
  short: string
  /** The whole name of the stat, read out. */
  name: string
  /** Where the two shapes are at this corner, as shares of the scale. */
  base: number
  trained: number
  /** What is written at the corner: the stat itself. Nothing while it is not known. */
  value: string | undefined
  /** How its nature moves it, said beside its name by an arrow and a colour. */
  trend?: 'up' | 'down' | undefined
  /** The arrow's spoken name. */
  trendLabel?: string | undefined
}

export interface ProfileGraphProps {
  /** What the graph is, read out before its figures. */
  label: string
  /** The corners, the first at the top and the rest clockwise. */
  corners: readonly ProfileCorner[]
  /** Nothing is known yet: the rings alone, with no shape on them. */
  empty?: boolean
  /** Its radius, in DS pixels. */
  radius: number
}

/** The rings of the scale, as shares of it: the games' 64, 128 and 192 of 255, and the rim. */
const RINGS = [64 / 255, 128 / 255, 192 / 255, 1] as const
/** Which side of the graph a corner is on: its words stand out from it that way. The first corner is the top; of an even number, the one facing it is the bottom. */
function sideOf(corner: number, corners: number): 'top' | 'bottom' | 'right' | 'left' {
  if (corner === 0) return 'top'
  if (corner * 2 === corners) return 'bottom'
  return corner * 2 < corners ? 'right' : 'left'
}

/**
 * The profile graph of the Pokédex's top screen (decision 288): a shape for
 * the species' base stats, and over it the outline of what TV and the nature
 * make of them. Each moves to where it should be when a number changes. The
 * figures are text beside the drawing, so that they are read out; the drawing
 * itself says nothing a figure does not.
 */
export function ProfileGraph({ label, corners, empty = false, radius }: ProfileGraphProps) {
  const count = corners.length
  const side = 2 * radius
  const ring = (share: number): string => polygonOf(shapePoints(corners.map(() => share)), radius)
  const base = polygonOf(shapePoints(corners.map((corner) => corner.base)), radius)
  const trained = polygonOf(shapePoints(corners.map((corner) => corner.trained)), radius)
  // A shape's corners are not a transform: the library does not hold them still by itself for who asked for less motion.
  const still = usePrefersReducedMotion()
  const move = { duration: still ? 0 : DURATION.quick, ease: EASE.out }
  return (
    <MotionConfig reducedMotion="user">
      <div className="dn-profile" style={{ '--dn-profile-radius': radius } as CSSProperties}>
        <svg className="dn-profile__drawing" viewBox={`0 0 ${side} ${side}`} aria-hidden="true">
          {/* The rim first: it is the plate the inner rings are drawn on. */}
          {[...RINGS].reverse().map((share) => (
            <polygon key={share} className={`dn-profile__ring${share === 1 ? ' dn-profile__ring--rim' : ''}`} points={ring(share)} />
          ))}
          {corners.map((corner, index) => {
            const rim = cornerPoint(index, count, 1)
            return <line key={corner.id} className="dn-profile__spoke" x1={radius} y1={radius} x2={radius + rim.x * radius} y2={radius + rim.y * radius} />
          })}
          {!empty && (
            <>
              <motion.polygon className="dn-profile__base" initial={false} animate={{ points: base }} transition={move} />
              <motion.polygon className="dn-profile__trained" initial={false} animate={{ points: trained }} transition={move} />
            </>
          )}
        </svg>
        <dl className="dn-profile__words" aria-label={label}>
          {corners.map((corner, index) => {
            const at = cornerPoint(index, count, 1)
            const style = { '--dn-profile-x': at.x, '--dn-profile-y': at.y } as CSSProperties
            return (
              <div key={corner.id} className={`dn-profile__corner dn-profile__corner--${sideOf(index, count)}`} data-trend={corner.trend} style={style}>
                <dt aria-label={corner.name}>
                  {corner.short}
                  {corner.trend && <span className={`dn-trend dn-trend--${corner.trend}`} role="img" aria-label={corner.trendLabel} />}
                </dt>
                <dd>{corner.value ?? '???'}</dd>
              </div>
            )
          })}
        </dl>
      </div>
    </MotionConfig>
  )
}
