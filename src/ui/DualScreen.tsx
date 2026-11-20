import { AnimatePresence, usePresence, usePresenceData } from 'motion/react'
import { type ReactElement, type ReactNode, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './reduced-motion'
import { type Passage, type ScreenPlace, arrive, leave, reversed } from './screen-motion'

export interface DualScreenProps {
  /**
   * How far into its page this view is: 0 for the page as it opens, more for
   * each step further in. A view further in than the last comes in from the
   * right; one further out, from the left.
   */
  depth?: number
  /**
   * The two screens, each a `Screen`: the top one, then the bottom one. A
   * `key` names a screen. Where the next thing shown has the same key, on this
   * page or on another, the screen carries on as it is; where it has another,
   * the screen goes out and the new one comes in. With no key, a screen is its
   * page's own: it stays for as long as the page does.
   */
  children: [top: ReactElement, bottom: ReactElement]
}

/** What a page shows on the two screens. */
interface Shown {
  /** Which page shows it: what a screen with no key of its own is told apart by. */
  page: string
  depth: number
  top: ReactElement
  bottom: ReactElement
}

/** The frame, as a page sees it. */
interface Frame {
  show: (shown: Shown) => void
  /** The page is gone: the frame shows nothing of it any more, unless another page has taken its place. */
  leave: (page: string) => void
}

const FrameContext = createContext<Frame | undefined>(undefined)

/**
 * The DS: its two screens, one over the other, each a box of its own that
 * shows its own thing (decision 214). Inside the app's frame
 * (`DualScreenFrame`) it draws nothing itself: it hands its two screens to
 * the frame, which stays while pages come and go. Outside one, on the board,
 * it is the two screens as they are, as wide as it is given.
 */
export function DualScreen({ depth = 0, children: [top, bottom] }: DualScreenProps) {
  const frame = useContext(FrameContext)
  const page = useId()
  // After each draw, with no list of what to watch: the frame shows what the page holds now.
  useLayoutEffect(() => {
    frame?.show({ page, depth, top, bottom })
  })
  useLayoutEffect(() => () => frame?.leave(page), [frame, page])

  if (frame) return null
  return (
    <div className="dn-dual">
      {top}
      {bottom}
    </div>
  )
}

export interface DualScreenFrameProps {
  /** Changes with each move from one address to another: what tells such a move from a step inside a page. */
  route?: string
  /** How far in the address is: a move to one less far in is a move back. */
  depth?: number
  /** The move to this address was a move back through the visit's history. */
  returning?: boolean
  /** The pages: whichever is there shows its two screens in the frame. */
  children: ReactNode
}

/** Where the frame stood when its screens last changed: what each showed, of which page, and how far in. */
interface Place {
  page: string
  top: string
  bottom: string
  topLook: string
  bottomLook: string
  route: string
  /** How far in the address was, then how far into its page the view was. */
  depth: number
  step: number
}

/** A screen's name: its key, or its page's. */
const nameOf = (screen: ReactElement, page: string): string => screen.key ?? page

/**
 * A screen's backdrop, as far as a change of screen can tell: a menu and a
 * blank screen are both black, the battle's touch screen is its shell, a scene
 * is the sky and the grass; a screen that says nothing of its kind and has a
 * name, the den for one, is a backdrop of its own.
 */
function lookOf(screen: ReactElement): string {
  const props: unknown = screen.props
  const kind = typeof props === 'object' && props !== null && 'kind' in props && typeof props.kind === 'string' ? props.kind : undefined
  if (kind === 'menu' || kind === 'blank') return 'black'
  return kind ?? screen.key ?? 'scene'
}

const NO_MOVE: Passage = { direction: 1, wipe: false }

/** The Pokédex's backdrop (decision 287): a screen that changes to it or from it is not swept by the stripes. */
const DEX_LOOK = 'dex'

/** How one screen changes: its pieces fly where the backdrop stays, the Pokédex opens or shuts where the backdrop is its own, and the stripes sweep for any other change of backdrop. */
function passageOf(direction: 1 | -1, from: string | undefined, to: string): Passage {
  if (from === undefined || from === to) return { direction, wipe: false }
  if (to === DEX_LOOK) return { direction, wipe: false, dex: 'open' }
  if (from === DEX_LOOK) return { direction, wipe: false, dex: 'shut' }
  return { direction, wipe: true }
}

/** For this long after a press or a key, in milliseconds, the focus follows a screen that changes. */
const FOCUS_FOLLOWS_FOR = 5000

/** What a screen offers to a keyboard and may be given the focus unasked: not a field, which would bring a phone's keyboard up. */
const OFFERED = 'button:not(:disabled), a[href], [tabindex="0"]'

/**
 * The DS itself, which stays for the whole visit (decision 218): pages change,
 * the two screens do not go away, and nothing feels like going from one page
 * to another. Each screen changes on its own. One that is the same on the next
 * page carries on untouched, whatever moves on it still moving. One that is
 * not goes out and the next comes in, by the moves of `screen-motion.ts`: the
 * pieces fly where the backdrop stays, the stripes sweep where it changes, and
 * the Pokédex opens or shuts where the backdrop is its own.
 * What goes out can no longer be pressed or read; what comes in can be
 * pressed as soon as it is there. With reduced motion a screen is replaced at
 * once.
 *
 * What a page shows is drawn here, a moment after the page itself: a page
 * must not reach for what is on its screens from an effect of its own.
 */
export function DualScreenFrame({ route = '', depth = 0, returning = false, children }: DualScreenFrameProps) {
  const [shown, setShown] = useState<Shown>()
  const [frame] = useState<Frame>(() => ({
    show: setShown,
    leave: (page) => setShown((current) => (current?.page === page ? undefined : current)),
  }))
  const still = usePrefersReducedMotion()

  // Which way the screens go, worked out when one of them changes: from where the frame stood then to where it stands now.
  // Another page is a move between addresses, back when the visit's history was gone back through or the address is less far
  // in. The same page is a step inside it, back when the view is less far in.
  const [way, setWay] = useState<{ from?: Place; opening: boolean; top: Passage; bottom: Passage }>({ opening: true, top: NO_MOVE, bottom: NO_MOVE })
  if (shown) {
    const now: Place = {
      page: shown.page,
      top: nameOf(shown.top, shown.page),
      bottom: nameOf(shown.bottom, shown.page),
      topLook: lookOf(shown.top),
      bottomLook: lookOf(shown.bottom),
      route,
      depth,
      step: shown.depth,
    }
    const from = way.from
    if (from?.top !== now.top || from.bottom !== now.bottom) {
      const back = from !== undefined && (from.page !== now.page ? (from.route !== now.route && returning) || now.depth < from.depth : now.step < from.step)
      const direction = back ? -1 : 1
      setWay({
        from: now,
        // The screens a visit opens on are put there: nothing was there for them to move in after.
        opening: from === undefined,
        top: passageOf(direction, from?.topLook, now.topLook),
        bottom: passageOf(direction, from?.bottomLook, now.bottomLook),
      })
    }
  }

  // A screen that goes out takes the focus away with it. When the person has just pressed or typed, and once every screen that
  // was going out is out, the focus goes to the title that came in, or with none to the first thing the bottom screen offers:
  // a keyboard goes on from there, and a screen reader says where it is. A screen that changes by itself, long after the last
  // press (a round that starts being told), moves no focus: a key held ready must not press what just appeared.
  const box = useRef<HTMLDivElement>(null)
  const pressed = useRef(-FOCUS_FOLLOWS_FOR)
  const fresh = useRef<HTMLElement[]>([])
  const [focus] = useState(() => ({
    acted: (): void => {
      pressed.current = performance.now()
    },
    arrived: (layer: HTMLElement): void => {
      const frame = box.current
      fresh.current.push(layer)
      if (!frame || frame.querySelector('.dn-dual__layer[inert]')) return
      const came = fresh.current.filter((one) => one.isConnected)
      fresh.current = []
      if (performance.now() - pressed.current > FOCUS_FOLLOWS_FOR) return
      const focused = document.activeElement
      if (focused && frame.contains(focused) && !focused.closest('[inert]')) return
      const title = came.map((one) => one.querySelector<HTMLElement>('[data-page-heading]')).find((found) => found !== null)
      const bottom = frame.lastElementChild
      const first = bottom && came.some((one) => bottom.contains(one)) ? bottom.querySelector<HTMLElement>(OFFERED) : null
      // Without scrolling to it: a title or a button still on its way in is out of the screen, and the screen starts from its top.
      ;(title ?? first)?.focus({ preventScroll: true })
    },
  }))

  return (
    <FrameContext value={frame}>
      <div ref={box} className="dn-dual" onClickCapture={focus.acted} onKeyDownCapture={focus.acted}>
        <Slot place="top" name={shown && nameOf(shown.top, shown.page)} passage={way.top} still={still || way.opening} onArrive={focus.arrived}>
          {shown?.top}
        </Slot>
        <Slot place="bottom" name={shown && nameOf(shown.bottom, shown.page)} passage={way.bottom} still={still || way.opening} onArrive={focus.arrived}>
          {shown?.bottom}
        </Slot>
      </div>
      {children}
    </FrameContext>
  )
}

interface SlotProps {
  /** Which of the two screens it is. */
  place: ScreenPlace
  /** What tells the screen shown apart from the one before it. */
  name: string | undefined
  /** How the screen before it goes and this one comes. */
  passage: Passage
  /** Screens are put there and taken away at once: reduced motion, and the screens a visit opens on. */
  still: boolean
  /** Called when a screen has come in, with the box it is in. */
  onArrive: (layer: HTMLElement) => void
  children: ReactElement | undefined
}

/** One of the frame's two screens: a 4:3 box that is always there, black while nothing is on it. */
function Slot({ place, name, passage, still, onArrive, children }: SlotProps) {
  return (
    <div className="dn-dual__slot">
      {/* One screen at a time: the next comes once the one before it is out. The one going out is told the way by `custom`. */}
      <AnimatePresence initial={false} mode="wait" custom={passage}>
        {children && (
          <Layer key={name} place={place} passage={passage} still={still} onArrive={onArrive}>
            {children}
          </Layer>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The stripes of a wipe, from the top of the screen down. */
const STRIPES = [0, 1, 2, 3, 4, 5, 6, 7] as const

interface LayerProps {
  place: ScreenPlace
  passage: Passage
  still: boolean
  onArrive: (layer: HTMLElement) => void
  children: ReactElement
}

/** One screen in its box, with what covers it when the backdrop changes: the stripes that sweep over it, and the Pokédex that rises over it. */
function Layer({ place, passage, still, onArrive, children }: LayerProps) {
  const layer = useRef<HTMLDivElement>(null)
  const [here, gone] = usePresence()
  // The way out is the one the frame gives now, not the one this screen came in by. The library hands on what the frame gave it
  // as `custom` without a type: it is the slot's passage.
  const out = usePresenceData() as Passage | undefined
  // As it was when the screen came.
  const [came] = useState({ passage, moves: !still })

  // Before the first paint: a piece must not show in its place, then jump out to fly in.
  useLayoutEffect(() => {
    if (came.moves && layer.current) void arrive(layer.current, came.passage, place)
  }, [came, place])
  useEffect(() => {
    if (layer.current) onArrive(layer.current)
  }, [onArrive])

  // It goes out once, when its turn is over. A screen called back before it is out, by a step forward taken back at once, comes
  // in again by the way it was going out; whatever then ends of its going out finds nothing left to take away.
  const leaving = useRef(false)
  useEffect(() => {
    const box = layer.current
    if (here) {
      if (leaving.current && box && !still) void arrive(box, reversed(out ?? came.passage), place)
      leaving.current = false
      return
    }
    if (leaving.current) return
    leaving.current = true
    if (still || !box) gone()
    // Out whatever became of its moves: a screen that could not be moved must still make room for the next.
    else void leave(box, out ?? came.passage, place).finally(gone)
  }, [here, gone, still, out, came, place])

  return (
    // What goes out is out of reach at once, for a finger, a keyboard and a screen reader: only its picture is left to move.
    <div ref={layer} className="dn-dual__layer" inert={!here} aria-hidden={here ? undefined : true}>
      {children}
      <div className="dn-dual__wipe" aria-hidden="true">
        {STRIPES.map((stripe) => (
          <span key={stripe} className="dn-dual__stripe" />
        ))}
      </div>
      <div className={`dn-dual__dex dn-dual__dex--${place}`} aria-hidden="true">
        <span className="dn-dual__shutter" />
        <span className="dn-dual__shutter" />
      </div>
    </div>
  )
}
