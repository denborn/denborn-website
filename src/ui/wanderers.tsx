import { AnimatePresence, usePresence } from 'motion/react'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TITLE_DEN } from '../data/sprites'
import type { SpeciesData } from '../data/types'
import { useScreenMetrics } from './Screen'
import { GHOST, chanceOf, driftOf, ghostPixel, goneAt } from './ghost'
import { GLOW, drawGhost, ghostSheetOf, useGhostPicture } from './ghost-picture'
import { TITLE } from './motion'
import type { SceneArea } from './scene-fit'
import { PokemonSprite } from './sprites'
import { type Arrival, type Build, type Leg, type Spot, WANDER, arrivals, ghostWait, groundOf, legOf, nextWalk, onStage, restTime, standing, walkerPixel, wayIn, wayOut } from './wander'

/** One of the characters shown on the plain. */
export interface CastMember {
  /** What tells it from the others: what its character is kept under. */
  id: string
  name: string
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  female: boolean
  /** A dead character does not walk: it rises in the den's light (decision 228). */
  dead: boolean
}

interface Size {
  width: number
  height: number
}

/** A walker is seen from the front, or from behind when it walks away. */
type View = 'front' | 'back'
const VIEWS = ['front', 'back'] as const

/** What was read of a walker once a sprite of it was there: its name's size in DS pixels, and each sprite's own size in its own pixels. */
interface Measure {
  name: Size
  front?: Size
  back?: Size
}

interface DenizenProps {
  member: CastMember
  /** One pixel of its sprites, in CSS pixels. */
  spritePixel: number
  /** Nothing of it shows until its front is measured: its name would stand at its feet. */
  measure: Measure | undefined
  onMeasure: (view: View, sprite: Size, name: Size) => void
  /** Its sprite is held on one frame. */
  frozen: boolean
  /** It heads right. */
  right: boolean
  /** It walks away from whoever looks: it is seen from behind. */
  away: boolean
  /** It is walking: it hops. */
  hops: boolean
}

/**
 * A character standing on the scene: its sprite, the middle of its bottom edge
 * at the box's own place (its feet), and its name over it. It is seen from the
 * front, or from behind when it walks away; the front sprites look left and
 * the back ones right, so each is mirrored to head the other way. Both are
 * there from the start, one hidden, so that turning round never waits for a
 * picture. The sprite is set on whole device pixels, so that it stays sharp.
 */
function Denizen({ member, spritePixel, measure, onMeasure, frozen, right, away, hops }: DenizenProps) {
  const { unit, ratio } = useScreenMetrics()
  const name = useRef<HTMLSpanElement>(null)
  // Seen from behind only once that sprite is there.
  const view: View = away && measure?.back ? 'back' : 'front'
  const height = (measure?.[view]?.height ?? 0) * spritePixel
  return (
    <span className={`dn-denizen${hops ? ' dn-denizen--hops' : ''}`} style={measure?.front ? undefined : { visibility: 'hidden' }}>
      <span ref={name} className="dn-denizen__name dn-text-outline" style={{ bottom: height }}>
        {member.name}
      </span>
      {VIEWS.map((each) => {
        const width = (measure?.[each]?.width ?? 0) * spritePixel
        const half = Math.floor((width * ratio) / 2) / ratio
        const mirrored = each === 'front' ? right : !right
        return (
          <span key={each} className="dn-denizen__sprite" style={{ left: -half, display: each === view ? undefined : 'none' }}>
            <span className={`dn-denizen__look${mirrored ? ' dn-denizen__look--mirrored' : ''}`}>
              <PokemonSprite
                species={member.species}
                name={member.name}
                female={member.female}
                back={each === 'back'}
                scale={spritePixel / unit}
                frozen={frozen}
                decorative
                onSize={(sprite) => {
                  const label = name.current
                  onMeasure(each, sprite, { width: (label?.offsetWidth ?? 0) / unit, height: (label?.offsetHeight ?? 0) / unit })
                }}
              />
            </span>
          </span>
        )
      })}
    </span>
  )
}

/** Where a walker is drawn, and how: at a spot, come to by a walk or put there at once. */
interface Pose {
  at: Spot
  leg: Leg | undefined
  right: boolean
  away: boolean
  walking: boolean
}

/** How long the browser is given to draw what was just set before the next move starts from it, in milliseconds. */
const DRAWN = 50

interface WandererProps {
  member: CastMember
  arrival: Arrival
  /** Its place among those out, and how many they are: where it stands when nothing moves. */
  place: number
  count: number
  visible: SceneArea
  /** One pixel of the scene, in CSS pixels. */
  pixel: number
  still: boolean
}

/**
 * One character walking on the plain (decision 225). It comes in from a bottom
 * corner of the screen once its sprite is there, stops not far from it, then
 * walks from spot to spot and rests between two walks; when it is no longer
 * among those out, it ends the walk it is on and leaves by a bottom corner.
 * It hops as it walks, is seen from behind when it walks away, and turns to
 * face whoever looks when it stops. Each straight walk is one move of the
 * browser's, a pixel of the scene at a time, like the rain: its columns on
 * the outer box, its rows on the inner one. When nothing moves it stands in
 * its place.
 */
function Wanderer({ member, arrival, place, count, visible, pixel, still }: WandererProps) {
  const { unit, ratio } = useScreenMetrics()
  const [here, gone] = usePresence()
  const [measure, setMeasure] = useState<Measure>()
  const [pose, setPose] = useState<Pose>()
  const measured = useCallback((view: View, sprite: Size, name: Size) => setMeasure((before) => ({ ...before, name, [view]: sprite })), [])
  const spritePixel = walkerPixel(pixel, ratio)
  // The room it takes whichever way it is seen, once its front is there.
  const widest = measure?.front && Math.max(measure.front.width, measure.back?.width ?? 0)
  const tallest = measure?.front && Math.max(measure.front.height, measure.back?.height ?? 0)
  const half = measure && widest !== undefined ? Math.max(widest * spritePixel, measure.name.width * unit) / 2 / pixel : undefined
  const tall = measure && tallest !== undefined ? (tallest * spritePixel + measure.name.height * unit) / pixel : undefined
  const { left, top, right, bottom } = visible
  const ground = useMemo(() => {
    if (half === undefined || tall === undefined) return undefined
    const build: Build = { half, tall }
    return groundOf({ left, top, right, bottom }, build)
  }, [left, top, right, bottom, half, tall])

  // Nothing moves: it is put where it stands, as soon as its ground is known and whenever that changes.
  const stand = still && ground ? standing(place, count, ground) : undefined
  if (stand && (pose?.at.x !== stand.x || pose.at.y !== stand.y || pose.leg || pose.away || pose.walking)) {
    setPose({ at: stand, leg: undefined, right: false, away: false, walking: false })
  }

  // What its walks go by, as it is now: a walk under way is not started again when one of these changes.
  const latest = useRef({ ground, here, gone, arrival, pose })
  useEffect(() => {
    latest.current = { ground, here, gone, arrival, pose }
  })
  /** Ends its rest at once. */
  const wake = useRef<(() => void) | undefined>(undefined)

  const ready = ground !== undefined
  useEffect(() => {
    if (still || !ready) return
    const timers = new Set<number>()
    const later = (task: () => void, wait: number): number => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        task()
      }, wait)
      timers.add(timer)
      return timer
    }
    let at = latest.current.pose?.at
    const walk = (way: readonly Spot[], pace: number, then: () => void): void => {
      const [to, ...rest] = way
      if (!to || !at) {
        // It has arrived: it turns to face whoever looks.
        setPose((before) => before && { ...before, away: false, walking: false })
        then()
        return
      }
      const from = at
      const leg = legOf(from, to, pace)
      at = to
      setPose((before) => ({ at: to, leg, right: to.x === from.x ? (before?.right ?? false) : to.x > from.x, away: to.y < from.y, walking: true }))
      // The next walk starts from where this one ends: not before the browser has shown its last pixel.
      later(() => walk(rest, pace, then), leg.seconds * 1000 + DRAWN)
    }
    const roam = (): void => {
      const now = latest.current
      if (!now.here) {
        // Called back among those out while it was leaving, it walks in again from where it is.
        const out = (): void => {
          if (latest.current.here) roam()
          else latest.current.gone?.()
        }
        if (now.ground && at) walk(wayOut(at, now.ground), WANDER.run, out)
        else out()
        return
      }
      const rest = later(() => {
        wake.current = undefined
        const { ground: where } = latest.current
        walk(where && at ? nextWalk(at, where, Math.random) : [], WANDER.walk, roam)
      }, restTime(Math.random))
      wake.current = () => {
        window.clearTimeout(rest)
        timers.delete(rest)
        wake.current = undefined
        roam()
      }
    }
    if (at) roam()
    else {
      const { wait, runs, side } = latest.current.arrival
      later(() => {
        const where = latest.current.ground
        const [from, ...way] = where ? wayIn(where, side ?? (Math.random() < 0.5 ? 'left' : 'right'), Math.random) : []
        if (!from) return
        const first = way[0] ?? from
        at = from
        setPose({ at: from, leg: undefined, right: first.x > from.x, away: first.y < from.y, walking: false })
        later(() => walk(way, runs ? WANDER.run : WANDER.walk, roam), DRAWN)
      }, wait)
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      wake.current = undefined
    }
  }, [still, ready])

  // No longer among those out. One that is resting leaves at once, one that is walking when its walk ends; one that is not on
  // the plain yet, or cannot move, is taken away.
  const placed = pose !== undefined
  useEffect(() => {
    if (here) return
    if (still || !placed) gone()
    else wake.current?.()
  }, [here, gone, still, placed])

  const leg = pose?.leg
  const moves = leg !== undefined && leg.seconds > 0
  const columns: CSSProperties = pose
    ? {
        zIndex: pose.at.y,
        transform: `translateX(${pose.at.x * pixel}px)`,
        transition: moves ? `transform ${leg.seconds}s steps(${Math.max(1, leg.columns)}), z-index ${leg.seconds}s steps(${Math.max(1, leg.rows)})` : 'none',
      }
    : { visibility: 'hidden' }
  const rows: CSSProperties = pose
    ? { transform: `translateY(${pose.at.y * pixel}px)`, transition: moves ? `transform ${leg.seconds}s steps(${Math.max(1, leg.rows)})` : 'none' }
    : {}
  return (
    <div className="dn-wanderer" style={columns}>
      <div className="dn-wanderer__rows" style={rows}>
        <Denizen
          member={member}
          spritePixel={spritePixel}
          measure={measure}
          onMeasure={measured}
          frozen={still}
          right={pose?.right ?? false}
          away={pose?.away ?? false}
          hops={pose?.walking ?? false}
        />
      </div>
    </div>
  )
}

const sameNames = (one: readonly string[], other: readonly string[]): boolean => one.length === other.length && one.every((name, at) => name === other[at])

export interface WanderersProps {
  /** The characters that walk: the living ones. */
  cast: readonly CastMember[]
  /** The part of the scene the screen shows, in the scene's pixels. */
  visible: SceneArea
  /** One pixel of the scene, in CSS pixels. */
  pixel: number
  /** Nothing moves: they stand in their places (reduced motion, or the Options' switch). */
  still: boolean
}

/**
 * The characters walking round the den (decisions 225 and 227): `stage` of
 * them at most. With more, they take turns: now and then the one out longest
 * leaves and the next comes in. Each is a box of the scene's world, drawn
 * among its layers by the row its feet stand on. One that is no longer in the
 * cast walks out before it is taken away.
 */
export function Wanderers({ cast, visible, pixel, still }: WanderersProps) {
  const [turn, setTurn] = useState(0)
  const waiting = cast.length > WANDER.stage
  useEffect(() => {
    if (still || !waiting) return
    const timer = window.setInterval(() => setTurn((before) => before + 1), WANDER.turn)
    return () => window.clearInterval(timer)
  }, [still, waiting])
  const out = onStage(cast.length, turn).flatMap((index) => cast[index] ?? [])

  // How each came in is settled when it joins those out, and kept for as long as it is out.
  const names = out.map((member) => member.id)
  const [came, setCame] = useState<{ names: readonly string[]; how: ReadonlyMap<string, Arrival> }>({ names: [], how: new Map() })
  if (!sameNames(names, came.names)) {
    const stayed = [...came.how].filter(([name]) => names.includes(name))
    setCame({ names, how: new Map([...stayed, ...arrivals(came.names, names)]) })
  }

  return (
    <AnimatePresence>
      {out.map((member, place) => (
        <Wanderer
          key={member.id}
          member={member}
          arrival={came.how.get(member.id) ?? { wait: 0, runs: false }}
          place={place}
          count={out.length}
          visible={visible}
          pixel={pixel}
          still={still}
        />
      ))}
    </AnimatePresence>
  )
}

/** Where its feet end their rise: this many rows of the scene under the top of the screen, where the light breaks up. */
const GHOST_END = 28
/** Its name's height, in rows of the scene, more or less: it starts that much lower, out of sight with its name. */
const GHOST_NAME_ROWS = 10

/** The name's squares are told from the ghost's own by this: they let go at moments of their own. */
const NAME_SQUARES = 1000

/**
 * Writes a ghost's name as its label shows it: its font, its colours, its
 * outline, cut where the label cuts it, on a sheet of the device's own pixels
 * as large as the label. Nothing if the browser will not draw.
 */
function nameOf(text: string, label: HTMLElement, unit: number, ratio: number): HTMLCanvasElement | undefined {
  const style = getComputedStyle(label)
  const made = document.createElement('canvas')
  const box = label.getBoundingClientRect()
  made.width = Math.ceil(box.width * ratio)
  made.height = Math.ceil(box.height * ratio)
  const context = made.getContext('2d')
  if (!context || made.width === 0 || made.height === 0) return undefined
  // The outline is one DS pixel wide, as the label's is, and so is the room the label leaves on every side.
  const edge = Math.max(1, Math.round(unit * ratio))
  context.font = `${parseFloat(style.fontSize) * ratio}px ${style.fontFamily}`
  context.textBaseline = 'middle'
  // Cut only where the label itself is too short for it, to as many letters as fit with the mark that says so.
  let written = text
  if (label.scrollWidth > label.clientWidth) {
    const fits = (kept: string): boolean => context.measureText(`${kept}…`).width <= made.width - 2 * edge
    let kept = text
    while (kept.length > 1 && !fits(kept)) kept = kept.slice(0, -1)
    written = `${kept}…`
  }
  const middle = made.height / 2
  context.fillStyle = style.getPropertyValue('--dn-ink-soft').trim()
  for (const across of [-edge, 0, edge]) {
    for (const down of [-edge, 0, edge]) {
      if (across !== 0 || down !== 0) context.fillText(written, edge + across, middle + down)
    }
  }
  context.fillStyle = style.color
  context.fillText(written, edge, middle)
  return made
}

interface GhostProps {
  member: CastMember
  pixel: number
  /** The first row of the scene the screen shows. */
  top: number
  still: boolean
  /** Called when it has gone, or if no picture of it can be had. */
  onGone: () => void
}

/**
 * A dead character in the den's light (decision 228): a ghost, smaller than
 * those who walk. Its sprite's first frame is read once, tinted, and given a
 * glow in the Ghost type's colour; its name is written once, as a name is on
 * the plain. It rises from behind the rocks in front, a row of the scene at a
 * time, under its name; all the while both are drawn again on sheets of their
 * own: it sways from side to side within the light, its rows waver, its glow
 * comes and goes. Near the top it breaks up by itself, and its name with it,
 * in squares that drift up and go. When nothing moves it stands in the light,
 * whole.
 */
function Ghost({ member, pixel, top, still, onGone }: GhostProps) {
  const { unit, ratio } = useScreenMetrics()
  const dot = ghostPixel(pixel, ratio)
  const label = useRef<HTMLSpanElement>(null)
  const figure = useRef<HTMLCanvasElement>(null)
  const title = useRef<HTMLCanvasElement>(null)
  /** Its name, written; `null` if it could not be: the ghost then rises without one. */
  const [name, setName] = useState<HTMLCanvasElement | null>()
  const ended = useRef(onGone)
  useEffect(() => {
    ended.current = onGone
  })

  const { species, female } = member
  const picture = useGhostPicture(species, female, () => (label.current ? getComputedStyle(label.current).getPropertyValue('--dn-type-ghost').trim() : undefined))
  // No picture of it can be had, not even MissingNo.'s: none rises.
  useEffect(() => {
    if (picture === null) ended.current()
  }, [picture])

  // Its name is written once the label's font is there, and again if the screen's size changes.
  const text = member.name
  useEffect(() => {
    const written = label.current
    if (!written) return
    let current = true
    const write = (): void => {
      if (current) setName(nameOf(text, written, unit, ratio) ?? null)
    }
    const style = getComputedStyle(written)
    void document.fonts.load(`${style.fontSize} ${style.fontFamily}`, text).then(write, write)
    return () => {
      current = false
    }
  }, [text, unit, ratio])

  const { light } = TITLE_DEN
  // As wide as the light's columns, less its own width: how far it may sway and stay in the light, in its own pixels.
  const room = picture ? ((light.right - light.left) * pixel) / dot - picture.width : 0
  const reach = Math.max(0, Math.floor(room / 2))
  const sheet = picture ? ghostSheetOf(picture, reach) : undefined
  const sheetWidth = sheet?.width ?? 0
  const sheetHeight = sheet?.height ?? 0
  // The name's sheet is in device pixels: one of the ghost's pixels is this many of them, a square of its breaking up this
  // many a side, and its squares drift as far as the ghost's.
  const dotOnDevice = Math.round(dot * ratio)
  const square = GHOST.square * dotOnDevice
  const nameRoom = GHOST.drift * dotOnDevice

  const ready = Boolean(picture) && name !== undefined
  useEffect(() => {
    const onFigure = figure.current?.getContext('2d')
    const onName = title.current?.getContext('2d')
    if (!picture || name === undefined || !onFigure) return
    const draw = (elapsed: number, life: number): void => {
      const gone = goneAt(elapsed, life)
      drawGhost(onFigure, picture, { elapsed, reach, gone })
      if (!name || !onName) return
      onName.clearRect(0, 0, name.width, name.height + nameRoom)
      for (let y = 0; y < name.height; y += square) {
        for (let x = 0; x < name.width; x += square) {
          const up = driftOf(chanceOf(NAME_SQUARES + x / square, y / square), gone)
          if (up === undefined) continue
          onName.drawImage(name, x, y, square, square, x, nameRoom + y - up * dotOnDevice, square, square)
        }
      }
    }
    if (still) {
      draw(0, 1)
      return
    }
    const life = TITLE.ghost * 1000
    const born = performance.now()
    const frames = window.setInterval(() => {
      const elapsed = performance.now() - born
      draw(Math.min(elapsed, life), life)
      if (elapsed < life) return
      window.clearInterval(frames)
      ended.current()
    }, GHOST.frame)
    draw(0, life)
    return () => window.clearInterval(frames)
  }, [picture, name, sheetWidth, sheetHeight, reach, square, nameRoom, dotOnDevice, still])

  // Its feet, in rows of the scene: from under the light's foot, where the rocks in front hide it whole, up to where the light
  // breaks up. When nothing moves it stands over the rocks at the back.
  const tall = picture ? Math.ceil((picture.height * dot) / pixel) : 0
  const from = light.foot + tall + GHOST_NAME_ROWS
  const rows = Math.max(1, from - (top + GHOST_END))
  const feet = still ? TITLE_DEN.back.y : from
  const place = {
    left: ((light.left + light.right) / 2) * pixel,
    top: feet * pixel,
    '--dn-ghost-rows': rows,
    '--dn-ghost-run': `${-rows * pixel}px`,
  } as CSSProperties
  const width = sheetWidth * dot
  const height = sheetHeight * dot
  // The glow's lower edge hangs under its feet; each sheet's middle is on the light's, on a whole device pixel.
  const figureStyle: CSSProperties = { width, height, left: -Math.floor((width * ratio) / 2) / ratio, top: GLOW * dot - height }
  const nameStyle: CSSProperties = name
    ? { width: name.width / ratio, height: (name.height + nameRoom) / ratio, left: -Math.floor(name.width / 2) / ratio, bottom: (picture?.height ?? 0) * dot }
    : {}
  return (
    <div className={`dn-ghost dn-title-scene__near${still ? ' dn-ghost--still' : ''}`} style={place}>
      {/* Its name as the page writes one, never shown: the written name takes its size, its font and its colours from it. */}
      <span ref={label} className="dn-denizen__name dn-text-outline dn-ghost__label">
        {member.name}
      </span>
      {/* Once both are there, so that its rise and its breaking up start together. */}
      {ready && (
        <div className="dn-ghost__rise">
          {name && <canvas ref={title} className="dn-ghost__name" width={name.width} height={name.height + nameRoom} style={nameStyle} />}
          <canvas ref={figure} className="dn-ghost__figure" width={sheetWidth} height={sheetHeight} style={figureStyle} />
        </div>
      )}
    </div>
  )
}

export interface GhostsProps {
  /** The characters that rise in the light: the dead ones. */
  cast: readonly CastMember[]
  pixel: number
  top: number
  still: boolean
}

/**
 * The dead characters, in the den's light, one at a time (decision 228): the
 * first soon after the scene is there, then one a few seconds after the last
 * has gone, each in its turn. It goes among the scene's layers right after the
 * light: over it, under the rocks in front. When nothing moves the first of
 * them stands in the light.
 */
export function Ghosts({ cast, pixel, top, still }: GhostsProps) {
  const [rise, setRise] = useState({ nth: -1, up: false })
  const haunted = cast.length > 0
  const { nth, up } = rise
  useEffect(() => {
    if (still || !haunted || up) return
    const wait = nth < 0 ? WANDER.ghostFirst : ghostWait(Math.random)
    const timer = window.setTimeout(() => setRise({ nth: nth + 1, up: true }), wait)
    return () => window.clearTimeout(timer)
  }, [still, haunted, up, nth])
  const down = useCallback(() => setRise((before) => ({ ...before, up: false })), [])

  const member = still ? cast[0] : up ? cast[nth % cast.length] : undefined
  if (!member) return null
  return <Ghost key={still ? 'still' : nth} member={member} pixel={pixel} top={top} still={still} onGone={down} />
}
