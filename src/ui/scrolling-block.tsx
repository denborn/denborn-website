import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { useDsUnit } from './Screen'

/**
 * How a text too long for its box goes by, to be read (decision 301): its pace
 * in DS pixels a second, slow enough to read along, and the least one pass may
 * last, rests included, in milliseconds.
 */
export const READING = { pace: 5, least: 9000 } as const

export interface ScrollingBlockProps {
  /** The text to read. Another text starts again from the top. */
  text: string
  /** What comes before it in the box, and goes by with it: a line of facts. */
  lead?: ReactNode
  /** Reduced motion, or the Options' switch: the text stands, and the box scrolls under a finger instead. */
  still: boolean
  /** The box's own look and size. */
  className: string
}

/**
 * A text in a box too short for it (decision 301): it rests at its top long
 * enough to read what shows, goes down slowly to its end, rests there, and
 * starts again. A text that fits stands still. Its words are there whole for
 * whoever reads them out, and said again when they change.
 */
export function ScrollingBlock({ text, lead, still, className }: ScrollingBlockProps) {
  const unit = useDsUnit()
  const box = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  /** How far its end is below the box, in CSS pixels: 0 when it fits. */
  const [beyond, setBeyond] = useState(0)
  useEffect(() => {
    const outer = box.current
    const inner = page.current
    if (!outer || !inner) return
    const measure = (): void => {
      const style = getComputedStyle(outer)
      const room = outer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      setBeyond(Math.max(0, Math.ceil(inner.offsetHeight - room)))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [text])
  const moving = beyond > 0 && !still
  // Half of a pass goes down; the rest is spent at the top, to read what shows first, and a little at the end.
  const style = moving ? ({ '--dn-read-by': `${-beyond}px`, '--dn-read-time': `${Math.max(READING.least, ((2 * beyond) / (READING.pace * unit)) * 1000)}ms` } as CSSProperties) : undefined
  const scrolls = still && beyond > 0
  return (
    <div
      ref={box}
      className={`dn-read ${className}${moving ? ' dn-read--moving' : ''}${scrolls ? ' dn-read--scrolls' : ''}`}
      style={style}
      aria-live="polite"
      // Held still, a box that scrolls must be reachable from the keyboard.
      tabIndex={scrolls ? 0 : undefined}
    >
      <div key={text} ref={page} className="dn-read__page">
        {lead}
        <p className="dn-read__text">{text}</p>
      </div>
    </div>
  )
}
