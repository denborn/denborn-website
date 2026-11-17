import { AnimatePresence, MotionConfig, motion, useAnimate } from 'motion/react'
import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { BATTLE_BASES } from '../data/sprites'
import type { SpeciesData } from '../data/types'
import { usePixelScale, useScreenMetrics } from './Screen'
import { BattleBase } from './battle-base'
import { ArrowButton } from './controls'
import { GHOST } from './ghost'
import { GLOW, drawGhost, ghostSheetOf, useGhostPicture } from './ghost-picture'
import { DURATION, EASE } from './motion'
import { usePrefersReducedMotion } from './reduced-motion'
import { AT_REST, type Act, type Passage, type Pose, SHOWCASE, framesOf, isSliding, nextAct, restOf, showcasePixel, slidTo } from './showcase'
import { centreShift } from './footprint'
import { SpriteShadow, useSpriteFeet } from './sprite-shadow'
import { PokemonSprite } from './sprites'

/** The Pokémon shown. */
export interface ShowcaseMember {
  /** What tells it from the others. */
  id: string
  name: string
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  female: boolean
  /** A dead character is shown as a ghost: it sways in its glow and does nothing else. */
  dead: boolean
  /** How it leaves and comes (`passageOf`). */
  passage: Passage
  /** The ground it stands on: a row of `BATTLE_BASES` (decision 242). */
  base: number
}

export interface ShowcaseProps {
  shown: ShowcaseMember
  /** The side the one shown came in from, when it changes: 1 the right, -1 the left. */
  direction: 1 | -1
  /** Nothing moves by itself (the Options' switch, decision 206): it stands, its sprite held. A change of Pokémon still moves. */
  still: boolean
  /** The arrows' spoken names; left out, there are no arrows and no swipe: there is only one to show. */
  labels?: { previous: string; next: string } | undefined
  onPrevious?: () => void
  onNext?: () => void
  /**
   * Given the box that marks where it stands (decision 257): centred on its
   * feet, its bottom edge the line they stand on, as wide as its ground. The
   * den's backdrop puts its own spot under it.
   */
  onGround?: (box: HTMLElement | null) => void
}

interface Size {
  width: number
  height: number
}

/** One Pokémon on the stage: the one shown, or one on its way out by a side. */
interface Figure {
  serial: number
  member: ShowcaseMember
  /** The side it came in from; 0 when it was there from the start. */
  from: 1 | -1 | 0
  /** The side it is leaving by. */
  leaving?: 1 | -1
}

/** How much of the stage is kept clear of the sprite on each side, for the arrows, and under it, for its ground, in DS pixels. */
const ARROW_ROOM = 20
const GROUND = 13
/** One pixel of a ground, in DS pixels: its oval is about 96 wide, under a sprite drawn a DS pixel to a pixel of its own. */
const BASE_SCALE = 0.75
/** How high a travelling hop goes, and how far a ghost floats over the ground, in the sprite's own pixels. */
const TRAVEL_HOP = 6
const FLOAT = 4

/**
 * The Pokémon of a carousel, shown large in the middle of its stage (decision
 * 241) on its ground (decisions 242 and 243), with an arrow on each side; it
 * can be slid across with a finger or the mouse to go to the one before or
 * after (decision 258). It is alive: now and then it hops, turns round, looks one
 * way and the other, spins. Another one shown, it leaves by the side away
 * from where the next comes in: it hops off, flies off, or as a ghost breaks
 * up; the next hops in, swoops in or floats in. Pressing on never waits for
 * that: those leaving go on leaving while the next comes. With reduced motion
 * nothing moves: the next is there at once, standing, its sprite held.
 */
export function Showcase({ shown, direction, still, labels, onPrevious, onNext, onGround }: ShowcaseProps) {
  const reduced = usePrefersReducedMotion()
  const { unit } = useScreenMetrics()
  const groundWidth = BATTLE_BASES.width * usePixelScale(BASE_SCALE)
  const stage = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<Size>()
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRoom({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Another one shown: the one there leaves by the side away from where it comes in. With reduced motion it is gone at once.
  const [figures, setFigures] = useState<readonly Figure[]>(() => [{ serial: 0, member: shown, from: 0 }])
  const current = figures.find((figure) => figure.leaving === undefined)
  if (current?.member.id !== shown.id) {
    const leaving = reduced ? [] : figures.map((figure): Figure => (figure.leaving === undefined ? { ...figure, leaving: direction === 1 ? -1 : 1 } : figure)).slice(-SHOWCASE.leaving)
    const serial = Math.max(...figures.map((figure) => figure.serial)) + 1
    setFigures([...leaving, { serial, member: shown, from: reduced ? 0 : direction }])
  }
  const gone = (serial: number): void => setFigures((before) => before.filter((figure) => figure.serial !== serial))

  // A slide of the one shown, with a finger or the mouse held down (decision 258): it follows across; let go far enough, the next
  // comes (slid to the left, as a page is turned) or the one before (to the right); nearer, it springs back.
  const hold = useRef<{ x: number; y: number; sliding: boolean }>(undefined)
  const [slid, setSlid] = useState<number>()
  const pressed = (event: PointerEvent<HTMLDivElement>): void => {
    if (!labels || (event.pointerType === 'mouse' && event.button !== 0)) return
    hold.current = { x: event.clientX, y: event.clientY, sliding: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moved = (event: PointerEvent): void => {
    const held = hold.current
    if (!held) return
    const across = event.clientX - held.x
    held.sliding ||= isSliding(across / unit, (event.clientY - held.y) / unit)
    // No further than half the stage: it is held, not thrown.
    if (held.sliding) setSlid(Math.max(-(room?.width ?? 0) / 2, Math.min((room?.width ?? 0) / 2, across)))
  }
  const released = (event: PointerEvent): void => {
    const held = hold.current
    hold.current = undefined
    setSlid(undefined)
    if (!held?.sliding) return
    const to = slidTo((event.clientX - held.x) / unit, (event.clientY - held.y) / unit)
    if (to === 1) onNext?.()
    else if (to === -1) onPrevious?.()
  }

  return (
    <div className={`dn-showcase${still || reduced ? ' dn-showcase--still' : ''}${labels ? ' dn-showcase--slides' : ''}`}>
      {/* Outside the stage, which cuts off those leaving: the ground is never cut. */}
      <span ref={onGround} className="dn-showcase__ground" style={{ bottom: GROUND * unit, width: groundWidth }}>
        <Ground row={shown.base} />
      </span>
      <div
        ref={stage}
        className="dn-showcase__stage"
        onPointerDown={pressed}
        onPointerMove={moved}
        onPointerUp={released}
        onPointerCancel={() => {
          hold.current = undefined
          setSlid(undefined)
        }}
      >
        {room &&
          figures.map((figure) => {
            const member = figure.leaving === undefined ? shown : figure.member
            const held = figure.leaving === undefined ? slid : undefined
            const props: FigureProps = { member, from: figure.from, leaving: figure.leaving, held, still: still || reduced, room, onGone: () => gone(figure.serial) }
            return member.dead ? <GhostFigure key={figure.serial} {...props} /> : <SpriteFigure key={figure.serial} {...props} />
          })}
      </div>
      {labels && (
        <>
          <ArrowButton way="previous" label={labels.previous} onClick={onPrevious} />
          <ArrowButton way="next" label={labels.next} onClick={onNext} />
        </>
      )}
    </div>
  )
}

interface FigureProps {
  member: ShowcaseMember
  from: 1 | -1 | 0
  leaving: 1 | -1 | undefined
  /** How far across a finger or the mouse holds it from its place, in CSS pixels, while it is slid; let go, it springs back. */
  held: number | undefined
  /** It does nothing by itself. */
  still: boolean
  /** The stage's size, in CSS pixels. */
  room: Size
  onGone: () => void
}

/** The room its sprite has on the stage, in CSS pixels: clear of the arrows and over its ground. */
function spriteRoom(room: Size, unit: number): Size {
  return { width: room.width - 2 * ARROW_ROOM * unit, height: room.height - GROUND * unit }
}

/** How far aside it must go to be out of the stage, in CSS pixels, given its own width. */
function offstage(room: Size, width: number, unit: number): number {
  return room.width / 2 + width / 2 + 4 * unit
}

/** It heads one way: the front sprites look left, so one heading right is mirrored. */
const heading = (side: number): Pose => ({ ...AT_REST, mirrored: side > 0 })

/**
 * Plays its come-in once it can be seen, and its way out when it leaves, on
 * the box `scope` holds; tells when it has come in and when it has gone.
 * `width` is its own width in CSS pixels, once known.
 */
function usePassage(passage: Passage, { from, leaving, held, room, onGone }: FigureProps, width: number | undefined, pixel: number) {
  const { unit } = useScreenMetrics()
  const reduced = usePrefersReducedMotion()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const [settled, setSettled] = useState(from === 0)
  // Where it is drawn, read when a move starts: a screen turned while it moves does not start the move again.
  const now = useRef({ room, width, unit, pixel, onGone })
  useEffect(() => {
    now.current = { room, width, unit, pixel, onGone }
  })

  // In, once its picture is there: from beyond the side it comes from, to its place. Its way out stops it.
  const ready = width !== undefined
  useEffect(() => {
    const box = scope.current
    if (settled || !ready || leaving !== undefined) return
    const { room, width = 0, unit, pixel } = now.current
    const off = from * offstage(room, width, unit)
    const seconds = SHOWCASE.come / 1000
    const coming =
      passage === 'ghost'
        ? animate(box, { x: [off, 0] }, { duration: seconds * 1.4, ease: EASE.out })
        : passage === 'fly'
          ? animate(box, { x: [off, 0], y: [-room.height * 0.7, 0] }, { duration: seconds, ease: EASE.out })
          : animate(
              box,
              { x: [off, off / 2, 0], y: [0, -TRAVEL_HOP * pixel, 0, (-TRAVEL_HOP / 2) * pixel, 0] },
              { duration: seconds, x: { ease: 'linear' }, y: { times: [0, 0.25, 0.5, 0.75, 1] } },
            )
    void coming.then(() => setSettled(true))
    return () => coming.stop()
  }, [settled, ready, leaving, from, passage, scope, animate])

  // Out by a side, from wherever it is: hopping, flying, or breaking up where it is (its canvas does that).
  useEffect(() => {
    const box = scope.current
    if (leaving === undefined) return
    const { room, width = 0, unit, pixel } = now.current
    const off = leaving * offstage(room, width, unit)
    const seconds = (passage === 'ghost' ? SHOWCASE.ghostLeave : SHOWCASE.leave) / 1000
    const going =
      passage === 'ghost'
        ? animate(box, { y: -FLOAT * 2 * pixel }, { duration: seconds, ease: 'linear' })
        : passage === 'fly'
          ? animate(box, { x: off, y: -room.height }, { duration: seconds, ease: EASE.in })
          : animate(
              box,
              { x: off, y: [null, -TRAVEL_HOP * pixel, 0, -TRAVEL_HOP * pixel, 0] },
              { duration: seconds, x: { ease: 'linear' }, y: { times: [0, 0.25, 0.5, 0.75, 1] } },
            )
    void going.then(() => now.current.onGone())
    return () => going.stop()
  }, [leaving, passage, scope, animate])

  // Held by a finger or the mouse, it follows across; let go where it stays, it springs back to its place. Let go where the next
  // comes, it leaves from where it was let go.
  useEffect(() => {
    const box = scope.current
    if (!settled || leaving !== undefined) return
    if (held !== undefined) {
      void animate(box, { x: held }, { duration: 0 })
      return
    }
    const back = animate(box, { x: 0 }, { duration: reduced ? 0 : DURATION.move, ease: EASE.snap })
    return () => back.stop()
  }, [held, settled, leaving, reduced, scope, animate])

  return { scope, settled }
}

/**
 * The ground the one shown stands on: a battle base of HeartGold and
 * SoulSilver (decision 242), drawn as a fight's scene draws its lines' bases
 * (`BattleBase`), its middle under the feet. It stays where it is (decision
 * 243): another one shown on the same ground, it does not move; on another,
 * this one shrinks into its middle and the next springs out of it. With
 * reduced motion it is changed at once.
 */
function Ground({ row }: { row: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        <motion.span
          key={row}
          className="dn-showcase__base"
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: { delay: DURATION.quick, duration: DURATION.move, ease: EASE.snap } }}
          exit={{ scale: 0, transition: { duration: DURATION.quick, ease: EASE.in } }}
        >
          <BattleBase row={row} scale={BASE_SCALE} />
        </motion.span>
      </AnimatePresence>
    </MotionConfig>
  )
}

/** Where a Pokémon stands: its feet on the stage, over the middle of its ground. Nothing of it shows until `shown`. */
function Stand({ shown, children }: { shown: boolean; children: ReactNode }) {
  const { unit } = useScreenMetrics()
  return (
    <span className="dn-showcase__figure" style={{ bottom: GROUND * unit, visibility: shown ? undefined : 'hidden' }}>
      {children}
    </span>
  )
}

/**
 * What it does by itself once it has come in: an act now and then, a rest
 * between two. Its pose while it does nothing is at rest.
 */
function useActs(active: boolean): Pose {
  const [pose, setPose] = useState<Pose>(AT_REST)
  useEffect(() => {
    if (!active) return
    const timers: number[] = []
    let last: Act | undefined
    const act = (): void => {
      last = nextAct(Math.random, last)
      const frames = framesOf(last)
      for (const { after, ...frame } of frames) timers.push(window.setTimeout(() => setPose(frame), after))
      timers.push(window.setTimeout(act, (frames[frames.length - 1]?.after ?? 0) + restOf(Math.random)))
    }
    timers.push(window.setTimeout(act, SHOWCASE.first))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [active])
  return active ? pose : AT_REST
}

/** A living one: its sprite, seen from the front or from behind, over a shadow as wide as its feet (decision 254). */
function SpriteFigure(props: FigureProps) {
  const { member, from, leaving, still, room } = props
  const { unit, ratio } = useScreenMetrics()
  // Both views are there from the start, one hidden, so that turning round never waits for a picture.
  const [sizes, setSizes] = useState<{ front?: Size; back?: Size }>({})
  const pixel = sizes.front ? showcasePixel(sizes.front, spriteRoom(room, unit), unit, ratio) : unit
  const { scope, settled } = usePassage(member.passage, props, sizes.front && sizes.front.width * pixel, pixel)
  const acting = useActs(settled && leaving === undefined && !still)
  // On its way it heads the way it goes; once in, it faces whoever looks, then acts.
  const pose = leaving !== undefined ? heading(leaving) : settled ? acting : heading(-from)
  const view = pose.view === 'back' && sizes.back ? 'back' : 'front'
  // Where its feet are, seen from the front and from behind: it stands on the middle of them, not of its picture (decision 257).
  const feet = { front: useSpriteFeet(member.species, { female: member.female }), back: useSpriteFeet(member.species, { back: true, female: member.female }) }
  return (
    <Stand shown={sizes.front !== undefined}>
      <span ref={scope} className="dn-showcase__body">
        {(['front', 'back'] as const).map((each) => {
          const width = (sizes[each]?.width ?? 0) * pixel
          const half = Math.floor((width * ratio) / 2) / ratio
          const read = feet[each]
          const shift = read ? Math.round(centreShift(read.feet, read.width, pose.mirrored) * pixel * ratio) / ratio : 0
          return (
            <span key={each} className="dn-showcase__stand" style={{ left: shift, display: each === view ? undefined : 'none' }}>
              {each === view && <SpriteShadow species={member.species} female={member.female} back={each === 'back'} mirrored={pose.mirrored} pixel={pixel} />}
              <span className="dn-showcase__sprite" style={{ left: -half, translate: `0 ${-pose.lift * pixel}px` }}>
                <span className={`dn-showcase__look${pose.mirrored ? ' dn-showcase__look--mirrored' : ''}`}>
                  <PokemonSprite
                    species={member.species}
                    name={member.name}
                    female={member.female}
                    back={each === 'back'}
                    scale={pixel / unit}
                    frozen={still}
                    decorative
                    onSize={(size) => setSizes((before) => ({ ...before, [each]: size }))}
                  />
                </span>
              </span>
            </span>
          )
        })}
      </span>
    </Stand>
  )
}

/**
 * A dead one: its sprite's first frame as a ghost, tinted and glowing in the
 * Ghost type's colour (decision 228), floating over the ground, swaying and
 * wavering. It does nothing else. Leaving, it breaks up in squares that
 * drift up, as it does in the den's light. Still, it stands whole.
 */
function GhostFigure(props: FigureProps) {
  const { member, leaving, still, room } = props
  const { unit, ratio } = useScreenMetrics()
  const canvas = useRef<HTMLCanvasElement>(null)
  const picture = useGhostPicture(member.species, member.female, () =>
    canvas.current ? getComputedStyle(canvas.current).getPropertyValue('--dn-type-ghost').trim() : undefined,
  )
  const pixel = picture ? showcasePixel(picture, spriteRoom(room, unit), unit, ratio) : unit
  const sheet = picture ? ghostSheetOf(picture, SHOWCASE.ghostReach) : undefined
  const width = sheet ? sheet.width * pixel : 0
  const { scope } = usePassage('ghost', props, picture ? picture.width * pixel : undefined, pixel)
  // It floats over the middle of its feet, as the living stand on theirs (decision 257).
  const feet = useSpriteFeet(member.species, { female: member.female })
  const shift = feet ? Math.round(centreShift(feet.feet, feet.width, false) * pixel * ratio) / ratio : 0

  // None can be had, not even MissingNo.'s: it leaves at once.
  const ended = useRef(props.onGone)
  useEffect(() => {
    ended.current = props.onGone
  })
  useEffect(() => {
    if (picture === null && leaving !== undefined) ended.current()
  }, [picture, leaving])

  // Drawn again and again: swaying, wavering, glowing; breaking up once it leaves. Still, drawn once, whole.
  const born = useRef<number>(undefined)
  useEffect(() => {
    const on = canvas.current?.getContext('2d')
    if (!picture || !on) return
    const reach = SHOWCASE.ghostReach
    if (still && leaving === undefined) {
      drawGhost(on, picture, { elapsed: 0, reach, gone: 0 })
      return
    }
    born.current ??= performance.now()
    const left = performance.now()
    const draw = (): void => {
      const now = performance.now()
      const gone = leaving === undefined ? 0 : Math.min(1, (now - left) / SHOWCASE.ghostLeave)
      drawGhost(on, picture, { elapsed: still ? 0 : now - (born.current ?? now), reach, gone })
    }
    draw()
    const frames = window.setInterval(draw, GHOST.frame)
    return () => window.clearInterval(frames)
  }, [picture, still, leaving])

  const style: CSSProperties = sheet ? { width, height: sheet.height * pixel, left: shift - Math.floor((width * ratio) / 2) / ratio, bottom: (FLOAT - GLOW) * pixel } : {}
  return (
    <Stand shown={sheet !== undefined}>
      <span ref={scope} className="dn-showcase__body">
        <canvas ref={canvas} className="dn-showcase__ghost" width={sheet?.width ?? 0} height={sheet?.height ?? 0} style={style} aria-hidden="true" />
      </span>
    </Stand>
  )
}
