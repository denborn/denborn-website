import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useDsUnit } from './Screen'
import { usePrefersReducedMotion } from './reduced-motion'
import { SHOWCASE } from './showcase'
import { PokemonIconAt } from './sprites'

/** How large its icons are drawn, in DS pixels to a pixel of theirs: three quarters, for a slimmer strip (decision 244). */
const ICON_SCALE = 0.75

/** One of those in the strip. */
export interface PickStripItem {
  /** What tells it from the others. */
  id: string
  /** Its species' National Pokédex number, for its icon; 0 for the icon of a Pokémon that cannot be told. */
  num: number
  /** Its name: what its button is called. */
  name: string
}

export interface PickStripProps {
  /** What the strip is, read out. */
  label: string
  items: readonly PickStripItem[]
  /** The one shown. */
  chosen: string | undefined
  onPick: (id: string) => void
  /** Nothing moves by itself: the one shown does not hop. */
  still: boolean
}

/**
 * A row of Pokémon icons to pick one from directly (decision 241), for those
 * with too many to go through one by one: it slides under a finger, or under
 * the mouse held down, and a press on one picks it. The one shown is framed
 * and its icon hops, as in the games' party menu; when another is shown by
 * other means, the strip slides to bring it to its middle. A small arrow at
 * either end springs out while there are more that way (decision 243).
 */
export function PickStrip({ label, items, chosen, onPick, still }: PickStripProps) {
  const unit = useDsUnit()
  const reduced = usePrefersReducedMotion()
  const strip = useRef<HTMLUListElement>(null)

  // The one shown is brought to the middle of the strip, by the strip itself: never by bringing it into view, which would slide
  // the screen sideways while it is coming in.
  const placed = useRef(false)
  useEffect(() => {
    const box = strip.current
    const item = box?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!box || !item) return
    const left = item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2
    box.scrollTo({ left, behavior: reduced || !placed.current ? 'instant' : 'smooth' })
    placed.current = true
  }, [chosen, reduced])

  // Whether there are more out of sight on either side: read when it slides, when its size changes, and when its icons do.
  const [more, setMore] = useState({ before: false, after: false })
  const count = items.length
  useEffect(() => {
    const box = strip.current
    if (!box) return
    const measure = (): void => {
      const before = box.scrollLeft > 1
      const after = box.scrollLeft + box.clientWidth < box.scrollWidth - 1
      setMore((was) => (was.before === before && was.after === after ? was : { before, after }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    box.addEventListener('scroll', measure, { passive: true })
    const frame = requestAnimationFrame(measure)
    return () => {
      observer.disconnect()
      box.removeEventListener('scroll', measure)
      cancelAnimationFrame(frame)
    }
  }, [count])

  // The mouse slides it as a finger does: held down and moved, it drags; a press that moved is not a press on what it was over.
  const drag = useRef<{ x: number; left: number; moved: boolean }>(undefined)
  const dragged = useRef(false)
  const down = (event: PointerEvent<HTMLUListElement>): void => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
    dragged.current = false
  }
  const move = (event: PointerEvent<HTMLUListElement>): void => {
    const held = drag.current
    if (!held) return
    const across = event.clientX - held.x
    if (!held.moved && Math.abs(across) >= SHOWCASE.drag * unit) {
      held.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (held.moved) event.currentTarget.scrollLeft = held.left - across
  }
  const up = (): void => {
    dragged.current = drag.current?.moved ?? false
    drag.current = undefined
  }
  const click = (event: MouseEvent): void => {
    if (!dragged.current) return
    dragged.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className={`dn-strip-frame${still ? ' dn-strip-frame--still' : ''}`}>
      <ul
        ref={strip}
        className="dn-strip"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={click}
        // A wheel turned over it slides it, as there is nothing to scroll up or down.
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY
        }}
      >
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="dn-strip__item" aria-pressed={item.id === chosen} onClick={() => onPick(item.id)}>
              <PokemonIconAt num={item.num} scale={ICON_SCALE} />
              <span className="dn-visually-hidden">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <span className={`dn-strip-frame__more dn-strip-frame__more--before${more.before ? ' dn-strip-frame__more--shown' : ''}`} aria-hidden="true" />
      <span className={`dn-strip-frame__more dn-strip-frame__more--after${more.after ? ' dn-strip-frame__more--shown' : ''}`} aria-hidden="true" />
    </div>
  )
}
