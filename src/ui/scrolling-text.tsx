import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useDsUnit } from './Screen'

/** How a text too long for its box goes by: its pace in DS pixels a second, and the least one pass may last, rests included, in milliseconds. */
export const SCROLLING = { pace: 20, least: 4000 } as const

/**
 * A line of text in a box too short for it (decision 254): it rests at its
 * start, goes by to its end at a steady pace, rests there, and starts again.
 * A text that fits stands still. With `still` (reduced motion, the Options'
 * switch) it stands, cut with an ellipsis. Its words are there whole for
 * whoever reads them out.
 */
export function ScrollingText({ text, still }: { text: string; still: boolean }) {
  const unit = useDsUnit()
  const box = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  /** How far its end is beyond the box, in CSS pixels: 0 when it fits. */
  const [beyond, setBeyond] = useState(0)
  useEffect(() => {
    const outer = box.current
    const inner = line.current
    if (!outer || !inner) return
    const measure = (): void => setBeyond(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth)))
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [text])
  const moving = beyond > 0 && !still
  // Half of a pass goes by, the other half rests, at its start and at its end.
  const style = moving ? ({ '--dn-scroll-by': `${-beyond}px`, '--dn-scroll-time': `${Math.max(SCROLLING.least, ((2 * beyond) / (SCROLLING.pace * unit)) * 1000)}ms` } as CSSProperties) : undefined
  return (
    <span ref={box} className={`dn-scroll${moving ? ' dn-scroll--moving' : ''}`} style={style}>
      <span ref={line} className="dn-scroll__line">
        {text}
      </span>
    </span>
  )
}
