import { type MotionValue, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { plain } from '../../shared/text/plain'
import { useDsUnit } from '../Screen'
import { usePrefersReducedMotion } from '../reduced-motion'
import { type WheelSize, jumpBefore, nearestRow, poseOf, rowAt, rowByKey, rowByName, rowOnRail, rowsDrawn, thumbOf, turnOf } from './wheel-math'

export interface WheelItem {
  /** What tells it from the others, and what the wheel's owner is told. */
  id: string
  /** Its name, found when typed on the wheel. What is read out is what its row shows. */
  name: string
}

export interface WheelProps<Item extends WheelItem> {
  /** What the list is, for assistive technology. */
  label: string
  items: readonly Item[]
  /** The one in the middle. The wheel turns to it when it changes; with none, or one the list does not have, it is at the first. */
  centred: string | undefined
  /** Another one is in the middle: by a finger, the mouse, a key, the rail. Told at once, row after row as the wheel turns, so that what is then done to "the one in the middle" is done to the one seen there. */
  onCentre: (id: string) => void
  /** The wheel has come to rest on one: for what is too heavy to do for each row that goes by, such as fetching a picture. */
  onRest?: ((id: string) => void) | undefined
  /** The one in the middle was pressed, or Enter on the wheel. */
  onPick?: ((id: string) => void) | undefined
  /** How tall the wheel is and how tall the row in its middle, in DS pixels. */
  size: WheelSize
  /** What a row shows. `lit` is true for the one in the middle. */
  row: (item: Item, lit: boolean) => ReactNode
  /** Shown in the wheel's place when the list is empty. */
  empty: ReactNode
  /** A rail at its side to go through a long list fast (decision 290). */
  rail?: boolean
}

/** How long after the last move of a scroll the wheel is taken to be at rest, where the browser does not say so itself, in milliseconds. */
const REST_AFTER_MS = 140
/** How long letters typed one after the other are read as one name, in milliseconds. */
const TYPED_FOR_MS = 600
/** How far the mouse moves, in DS pixels, before a press on the wheel is a drag of it. */
const DRAG_FROM = 4
/** How many of the rows it told its owner the wheel remembers, to know them when they come back. */
const TOLD_MOST = 32

/**
 * A list on a wheel (decision 290): the row in the middle is the one chosen,
 * whole and lit; the rows above and below turn away, smaller and fainter. A
 * finger, the mouse or a trackpad turns it, and it comes to rest on a row. A
 * press on another row brings it to the middle; the arrows, Page Up, Page
 * Down, Home and End move by rows, and typing a name goes to it. Nothing needs
 * a drag. Its owner hears of each row that comes to the middle, and apart
 * from that of the row it rests on.
 *
 * It scrolls as a list does, so that a phone gives it its own momentum. What
 * scrolls is a clear surface over the rows, holding nothing but one empty stop
 * a row; the rows themselves are drawn under it, each where `wheel-math.ts`
 * puts it for how far the surface has scrolled, and only the rows near the
 * middle are there at all, however long the list. The rows are not inside what
 * scrolls: nothing that asks a browser to bring a row into view (a screen
 * reader, a test) can turn the wheel behind its back. A press lands on the
 * surface, which works out the row under it.
 */
export function Wheel<Item extends WheelItem>({ label, items, centred, onCentre, onRest, onPick, size, row, empty, rail = false }: WheelProps<Item>) {
  const unit = useDsUnit()
  const reduced = usePrefersReducedMotion()
  const own = useId()
  const list = useRef<HTMLDivElement>(null)
  const turner = useRef<HTMLDivElement>(null)
  const count = items.length
  // A whole number of the device's pixels to a stop, so that the wheel rests exactly on a row.
  const pitch = Math.max(1, Math.round(size.row * unit))

  /** How far the list has turned, in rows: what every row is drawn from. */
  const turn = useMotionValue(0)
  /** The row nearest the middle: the rows around it are the ones drawn. */
  const [nearest, setNearest] = useState(0)
  useMotionValueEvent(turn, 'change', (turned) => setNearest(Math.round(turned)))

  /** The row its owner wants in the middle: the first when it names none the list has. */
  const wanted = Math.max(0, centred === undefined ? 0 : items.findIndex((item) => item.id === centred))

  /** Turns the wheel to a row: sliding when it is near, with a jump first when it is far, at once with reduced motion. */
  const goTo = (to: number, sliding = true): void => {
    const box = turner.current
    if (!box || to < 0 || to >= count) return
    const from = nearestRow(box.scrollTop, pitch, count)
    if (reduced || !sliding) {
      box.scrollTo({ top: to * pitch, behavior: 'instant' })
      return
    }
    const short = jumpBefore(from, to, size)
    if (short !== undefined) box.scrollTo({ top: short * pitch, behavior: 'instant' })
    box.scrollTo({ top: to * pitch, behavior: 'smooth' })
  }

  // The wheel follows its owner: when the one to show is not the one in its middle, it turns to it. The first time, and
  // when the screen changes size, it is put there, since there is nothing to turn from.
  //
  // Its owner hears of each row that comes to the middle and gives it back as the one to show, a moment later: by then a
  // wheel that is turning has another row in its middle. What comes back is not an order to go back to it. So the wheel
  // remembers what it told, and follows only what it did not say itself.
  const placedAt = useRef<number>(undefined)
  const told = useRef<string[]>([])
  const follow = useEffectEvent((to: number): void => {
    const box = turner.current
    if (!box) return
    const first = placedAt.current !== pitch
    placedAt.current = pitch
    const said = centred === undefined ? -1 : told.current.indexOf(centred)
    // What it said, and everything it said before that, is heard.
    if (said >= 0) told.current = told.current.slice(said + 1)
    else told.current = []
    if (first || (said < 0 && to !== nearestRow(box.scrollTop, pitch, count))) goTo(to, !first)
    turn.set(turnOf(box.scrollTop, pitch, count))
  })
  useLayoutEffect(() => follow(wanted), [wanted, pitch, count])

  // The mouse turns it as a finger does: held down and moved, it drags; a press that moved is not a press on the row it was over.
  // While it drags the wheel does not pull toward its stops, or it would jump from row to row under the mouse.
  const drag = useRef<{ y: number; top: number; moved: boolean }>(undefined)
  const dragging = useRef(false)
  const dragged = useRef(false)
  const [loose, setLoose] = useState(false)

  // Its owner is told the row in the middle as soon as it is another, and the row it rests on once the browser says the
  // scroll has ended, or a moment after its last move.
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef({ items, centred, onCentre, onRest })
  useEffect(() => {
    latest.current = { items, centred, onCentre, onRest }
  })
  const rested = (): void => {
    clearTimeout(rest.current)
    const box = turner.current
    if (!box || dragging.current) return
    const known = latest.current
    const at = known.items[nearestRow(box.scrollTop, pitch, known.items.length)]
    if (at) known.onRest?.(at.id)
  }
  useEffect(() => () => clearTimeout(rest.current), [])
  const scrolled = (): void => {
    const box = turner.current
    if (!box) return
    turn.set(turnOf(box.scrollTop, pitch, count))
    const known = latest.current
    const at = known.items[nearestRow(box.scrollTop, pitch, known.items.length)]
    if (at && at.id !== (told.current.at(-1) ?? known.centred)) {
      // No more than a wheel's worth is remembered: an owner that does not give back what it is told must not make this grow.
      told.current = [...told.current.slice(-TOLD_MOST), at.id]
      known.onCentre(at.id)
    }
    clearTimeout(rest.current)
    rest.current = setTimeout(rested, REST_AFTER_MS)
  }

  /** A press on a row: the one in the middle is picked, another is brought to the middle. */
  const press = (index: number): void => {
    const at = items[index]
    if (!at) return
    if (index === nearestRow(turner.current?.scrollTop ?? 0, pitch, count)) onPick?.(at.id)
    else goTo(index)
  }

  const down = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, moved: false }
    dragged.current = false
  }
  const move = (event: PointerEvent<HTMLDivElement>): void => {
    const held = drag.current
    if (!held) return
    const by = event.clientY - held.y
    if (!held.moved && Math.abs(by) >= DRAG_FROM * unit) {
      held.moved = true
      dragging.current = true
      setLoose(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (held.moved) event.currentTarget.scrollTop = held.top - by
  }
  const up = (event: PointerEvent<HTMLDivElement>): void => {
    const held = drag.current
    drag.current = undefined
    if (!held?.moved) return
    dragged.current = true
    dragging.current = false
    setLoose(false)
    goTo(nearestRow(event.currentTarget.scrollTop, pitch, count))
  }
  /** A press on the surface is a press on the row drawn under it there, unless it ended a drag. */
  const click = (event: MouseEvent<HTMLDivElement>): void => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    const box = event.currentTarget.getBoundingClientRect()
    const under = rowAt((event.clientY - box.top - box.height / 2) / unit, turn.get(), count, size)
    if (under !== undefined) press(under)
  }

  // A name typed on the wheel: letters that follow one another closely are one name.
  const typed = useRef<{ text: string; timer?: ReturnType<typeof setTimeout> }>({ text: '' })
  useEffect(() => {
    const letters = typed.current
    return () => clearTimeout(letters.timer)
  }, [])
  const key = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const from = nearestRow(turner.current?.scrollTop ?? 0, pitch, count)
    // Enter picks the row in the middle, and so does the space bar, unless it is the space inside a name being typed.
    if (event.key === 'Enter' || (event.key === ' ' && typed.current.text === '')) {
      const at = items[from]
      if (!at) return
      event.preventDefault()
      onPick?.(at.id)
      return
    }
    const byKey = rowByKey(event.key, from, count, size)
    if (byKey !== undefined) {
      event.preventDefault()
      goTo(byKey)
      return
    }
    if (event.key.length !== 1) return
    // A letter typed on the wheel is the wheel's: a space must not scroll the page under it.
    event.preventDefault()
    const letters = typed.current
    clearTimeout(letters.timer)
    letters.text += plain(event.key)
    letters.timer = setTimeout(() => {
      letters.text = ''
    }, TYPED_FOR_MS)
    const byName = rowByName(
      items.map((item) => plain(item.name)),
      from,
      letters.text,
    )
    if (byName !== undefined) goTo(byName)
  }

  if (count === 0) return <div className="dn-wheel dn-wheel--empty">{empty}</div>

  const drawn = rowsDrawn(Math.min(nearest, count - 1), count, size)
  const style = { '--dn-wheel-height': size.height, '--dn-wheel-row': size.row, '--dn-wheel-pitch': `${pitch}px` } as CSSProperties
  const lit = items[Math.min(nearest, count - 1)]
  return (
    <div
      ref={list}
      className={`dn-wheel${rail ? ' dn-wheel--railed' : ''}`}
      style={style}
      role="listbox"
      aria-label={label}
      aria-activedescendant={lit ? `${own}-${lit.id}` : undefined}
      tabIndex={0}
      onKeyDown={key}
    >
      <div className="dn-wheel__stage">
        {items.slice(drawn.first, drawn.last + 1).map((item, offset) => {
          const index = drawn.first + offset
          return (
            <WheelRow key={item.id} id={`${own}-${item.id}`} index={index} count={count} turn={turn} size={size} unit={unit} lit={index === nearest} onPress={() => press(index)}>
              {row(item, index === nearest)}
            </WheelRow>
          )
        })}
      </div>
      {/* The surface that scrolls, over the rows: it is the wheel's own business, and nothing to read or to stop on. */}
      <div
        ref={turner}
        className={`dn-wheel__turn${loose ? ' dn-wheel__turn--loose' : ''}`}
        aria-hidden="true"
        tabIndex={-1}
        onScroll={scrolled}
        onScrollEnd={rested}
        // The focus stays on the list, which takes the keys: a press on the surface must not take it away.
        onMouseDown={(event) => {
          event.preventDefault()
          list.current?.focus({ preventScroll: true })
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={click}
      >
        <div className="dn-wheel__stops">
          {items.map((item) => (
            <i key={item.id} />
          ))}
        </div>
      </div>
      {rail && <Rail turn={turn} count={count} size={size} onRow={(to, sliding) => goTo(to, sliding)} />}
    </div>
  )
}

interface WheelRowProps {
  id: string
  index: number
  count: number
  turn: MotionValue<number>
  size: WheelSize
  unit: number
  lit: boolean
  onPress: () => void
  children: ReactNode
}

/**
 * One row, drawn where the wheel's turn puts it. It is an option of the list,
 * named by what it shows. A finger or the mouse never reaches it, since the
 * surface that scrolls is over it; what presses it without pointing (a screen
 * reader's own press) reaches it here.
 */
function WheelRow({ id, index, count, turn, size, unit, lit, onPress, children }: WheelRowProps) {
  const transform = useTransform(turn, (turned) => {
    const pose = poseOf(index - turned, size)
    return `translateY(${pose.y * unit}px) scale(${pose.scaleX}, ${pose.scaleY})`
  })
  const opacity = useTransform(turn, (turned) => poseOf(index - turned, size).opacity)
  const visibility = useTransform(turn, (turned) => (poseOf(index - turned, size).shown ? 'visible' : 'hidden'))
  return (
    <motion.div
      id={id}
      className={`dn-wheel__row${lit ? ' dn-wheel__row--lit' : ''}`}
      role="option"
      aria-selected={lit}
      aria-setsize={count}
      aria-posinset={index + 1}
      style={{ transform, opacity, visibility }}
      onClick={onPress}
    >
      {children}
    </motion.div>
  )
}

interface RailProps {
  turn: MotionValue<number>
  count: number
  size: WheelSize
  onRow: (row: number, sliding: boolean) => void
}

/**
 * The rail at a wheel's side: its thumb says where in the list the wheel is,
 * and a press or a drag along it goes there. It is a shortcut for a finger or
 * the mouse; the wheel itself takes the keys, and says where it is to whoever
 * cannot see it, so the rail is left out of what is read.
 */
function Rail({ turn, count, size, onRow }: RailProps) {
  const top = useTransform(turn, (turned) => `${thumbOf(turned, count, size).start * 100}%`)
  const height = `${thumbOf(0, count, size).length * 100}%`
  const held = useRef(false)
  const rowAtPoint = (event: PointerEvent<HTMLDivElement>): number => {
    const box = event.currentTarget.getBoundingClientRect()
    return rowOnRail((event.clientY - box.top) / box.height, count)
  }
  return (
    <div
      className="dn-rail"
      aria-hidden="true"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        held.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onRow(rowAtPoint(event), true)
      }}
      onPointerMove={(event) => {
        if (held.current) onRow(rowAtPoint(event), false)
      }}
      onPointerUp={() => {
        held.current = false
      }}
      onPointerCancel={() => {
        held.current = false
      }}
    >
      <motion.span className="dn-rail__thumb" style={{ top, height }} />
    </div>
  )
}
