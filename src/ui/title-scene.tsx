import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { type ScenePlacement, TITLE_DEN, TITLE_PLAIN } from '../data/sprites'
import { DS_WIDTH, useScreenMetrics } from './Screen'
import { blockCentres, fitScene } from './scene-fit'
import { type BoltPoint, boltOnto, boltPath, nextStrike } from './storm'
import { type TitlePhase, nextPhase, phaseLength, reached } from './title-intro'
import { type CastMember, Ghosts, Wanderers } from './wanderers'

export interface TitleSceneProps {
  /** Plays the intro from the den in daylight. Without it, the storm is already there. */
  intro: boolean
  /** Nothing moves: no intro, the rain hangs, no lightning (reduced motion, or the Options' switch). */
  still: boolean
  /** Called once, when the intro reaches the storm. */
  onStorm?: () => void
  /** Holds the scene at one step of the intro, for the board to show each. */
  at?: TitlePhase
  /** The storm's bolts and flashes. Without them it is rain alone: the den behind another page (decision 217). */
  lightning?: boolean
  /** The characters on the plain (decision 225): the living walk round the den, the dead rise in its light. */
  cast?: readonly CastMember[]
  /** The title, set a little above the middle of the screen. */
  children?: ReactNode
}

/** Nobody on the plain: the same list at every draw, so that nothing is taken for a change. */
const NOBODY: readonly CastMember[] = []

/** The intro does not wait longer than this for the plain: if it is late, the scene's own sky shows meanwhile. */
const PLAIN_WAIT = 800

/** One lightning strike: its bolt, and a number that is new for each, so that its flash plays again. */
interface Strike {
  id: number
  bolt: BoltPoint[]
}

/**
 * The title screen (decisions 202 to 207, and 210 for the den): the den in
 * Showdown's meadow, on the meadow's own pixels, filling the top screen, in
 * layers from the back to the front. With `intro`, the den first stands in
 * daylight; its light rises out of the pit, its top fading in squares, and
 * turns the rocks and the ground pink; a red bolt falls down the light as the
 * plain turns dark; the name appears; then rain falls and red lightning
 * strikes at uneven gaps, now on the den, now in the sky. Everything but the
 * name is decoration, hidden from assistive technology.
 *
 * With a `cast`, its characters are on the plain (decision 225): each stands
 * among the layers by the row its feet are on, behind the rocks at the back,
 * between them and the light, or in front of the rocks in front.
 */
export function TitleScene({ intro, still, onStorm, at, lightning = true, cast = NOBODY, children }: TitleSceneProps) {
  const { unit, ratio } = useScreenMetrics()
  const fit = fitScene(TITLE_PLAIN, unit * DS_WIDTH, ratio, TITLE_DEN.middle.x)
  const [ready, setReady] = useState(false)
  const [played, setPlayed] = useState<TitlePhase>('day')
  const [strike, setStrike] = useState<Strike>()
  const playing = intro && !still && at === undefined
  const phase: TitlePhase = at ?? (playing ? played : 'storm')

  // The latest callback, so that a new one from the screen above does not restart the step under way.
  const stormed = useRef(onStorm)
  useEffect(() => {
    stormed.current = onStorm
  })

  useEffect(() => {
    if (!playing) return
    if (!ready) {
      const wait = window.setTimeout(() => setReady(true), PLAIN_WAIT)
      return () => window.clearTimeout(wait)
    }
    const length = phaseLength(played)
    if (length === undefined) return
    const timer = window.setTimeout(() => {
      const next = nextPhase(played)
      setPlayed(next)
      if (next === 'storm') stormed.current?.()
    }, length)
    return () => window.clearTimeout(timer)
  }, [playing, ready, played])

  // The lightning: a first strike down the den's light as the plain turns dark, then strikes at uneven gaps for as long
  // as the storm lasts, now on the den, now in the sky.
  const { left, top, right, bottom } = fit.visible
  useEffect(() => {
    if (still || !lightning || (phase !== 'strike' && phase !== 'storm')) return
    const timers = new Set<number>()
    const later = (task: () => void, wait: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        task()
      }, wait)
      timers.add(timer)
    }
    const sky = { left, top, right, bottom }
    const flash = (onDen: boolean) => {
      const bolt = onDen ? boltOnto(Math.random, sky, TITLE_DEN.middle) : boltPath(Math.random, sky, TITLE_DEN.light)
      setStrike((before) => ({ id: (before?.id ?? 0) + 1, bolt }))
    }
    const loop = () => {
      const next = nextStrike(Math.random)
      later(() => {
        flash(next.onDen)
        if (next.again !== undefined) later(() => flash(next.onDen), next.again)
        loop()
      }, next.wait)
    }
    if (phase === 'strike') later(() => flash(true), 0)
    else loop()
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [phase, still, lightning, left, top, right, bottom])

  const pixel = fit.pixel
  const place = (art: ScenePlacement): CSSProperties => ({
    left: art.x * pixel,
    top: art.y * pixel,
    width: art.width * pixel,
    height: art.height * pixel,
  })
  const picture = (art: ScenePlacement): CSSProperties => ({ ...place(art), backgroundImage: `url(${art.url})` })
  const mask = (art: ScenePlacement): CSSProperties => ({ ...place(art), maskImage: `url(${art.url})`, WebkitMaskImage: `url(${art.url})` })
  const { light } = TITLE_DEN
  // The light hangs from the top row the screen shows, so that its fade in squares is whole on every phone, and runs down to
  // its foot behind the rocks. It rises from there, one row of the scene at a time.
  const lightRows = light.foot - top
  const shaftStyle = {
    left: light.x * pixel,
    top: top * pixel,
    width: light.width * pixel,
    height: lightRows * pixel,
    '--dn-title-light-rows': lightRows,
    '--dn-title-rise-run': `${lightRows * pixel}px`,
  } as CSSProperties
  const lightStyle = {
    backgroundImage: `url(${light.url})`,
    backgroundSize: `${light.width * light.frames * pixel}px ${light.height * pixel}px`,
    '--dn-title-light-run': `${-light.width * light.frames * pixel}px`,
  } as CSSProperties
  // Where the layers stand for whoever walks among them, as rows of the scene: the rocks at the back on the row of the den's
  // middle, the light and the rocks in front on the row those stand on, the near rain over everything.
  const worldStyle = {
    left: fit.left,
    top: fit.top,
    width: TITLE_PLAIN.width * pixel,
    height: TITLE_PLAIN.height * pixel,
    '--dn-title-px': `${pixel}px`,
    '--dn-title-far': TITLE_DEN.middle.y,
    '--dn-title-near': TITLE_DEN.frontFoot,
    '--dn-title-over': TITLE_PLAIN.height + 1,
  } as CSSProperties
  const walking = cast.filter((member) => !member.dead)
  const dead = cast.filter((member) => member.dead)
  const steps: string[] = [
    reached(phase, 'rising') ? 'is-lit' : '',
    reached(phase, 'strike') ? 'is-dark' : '',
    reached(phase, 'named') ? 'is-named' : '',
    phase === 'storm' ? 'is-storm' : '',
    still ? 'dn-title-scene--still' : '',
  ]
  return (
    <div className={['dn-title-scene', ...steps].filter(Boolean).join(' ')}>
      <div className="dn-title-scene__world" style={worldStyle} aria-hidden="true">
        {/* From the back to the front: the plain, the light on its ground and the far rain; the rocks behind the light;
            the light and the bolts; the rocks in front; the near rain. Each layer of rocks has the night's veil over it,
            then what the light changes on it, which the night does not dim. The rocks at the back are `far`, the light
            and what is in front of it `near`: who walks on the plain is drawn before or after each by its own row. */}
        <Plain onReady={setReady} />
        <div className="dn-title-scene__night" />
        <div className="dn-title-scene__art dn-title-scene__glow dn-title-scene__glow--ground" style={picture(TITLE_DEN.spill)} />
        <div className="dn-title-scene__rain dn-title-scene__rain--far" />
        <div className="dn-title-scene__art dn-title-scene__far" style={picture(TITLE_DEN.back)} />
        <div className="dn-title-scene__night dn-title-scene__night--masked dn-title-scene__far" style={mask(TITLE_DEN.back)} />
        <div className="dn-title-scene__art dn-title-scene__glow dn-title-scene__far" style={picture(TITLE_DEN.backGlow)} />
        <div className="dn-title-scene__shaft dn-title-scene__near" style={shaftStyle}>
          <div className="dn-title-scene__light" style={lightStyle} />
        </div>
        {/* A ghost is `near` too, and comes right after the light: over it, under the rocks in front. */}
        <Ghosts cast={dead} pixel={pixel} top={top} still={still} />
        {strike && <Bolt key={strike.id} points={strike.bolt} />}
        <div className="dn-title-scene__art dn-title-scene__near" style={picture(TITLE_DEN.front)} />
        <div className="dn-title-scene__night dn-title-scene__night--masked dn-title-scene__near" style={mask(TITLE_DEN.front)} />
        <div className="dn-title-scene__art dn-title-scene__glow dn-title-scene__near" style={picture(TITLE_DEN.frontGlow)} />
        <div className="dn-title-scene__rain dn-title-scene__rain--near" />
        <Wanderers cast={walking} visible={fit.visible} pixel={pixel} still={still} />
      </div>
      {children !== undefined && <div className="dn-title-scene__name">{children}</div>}
      {strike && <div key={strike.id} className="dn-title-scene__flash" aria-hidden="true" />}
    </div>
  )
}

/**
 * Showdown's meadow, taken back to its own pixels: it is served enlarged by a
 * little over three, and a browser's own scaling would pick its pixels
 * unevenly. The centre of each of its blocks is read and drawn once.
 */
function Plain({ onReady }: { onReady: (ready: true) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let current = true
    const image = new Image()
    image.onload = () => {
      const target = canvas.current?.getContext('2d')
      const scratch = document.createElement('canvas')
      scratch.width = image.naturalWidth
      scratch.height = image.naturalHeight
      const source = scratch.getContext('2d', { willReadFrequently: true })
      if (!current || !target || !source) return
      source.drawImage(image, 0, 0)
      const read = source.getImageData(0, 0, scratch.width, scratch.height).data
      const out = target.createImageData(TITLE_PLAIN.width, TITLE_PLAIN.height)
      const columns = blockCentres(scratch.width, TITLE_PLAIN.width)
      blockCentres(scratch.height, TITLE_PLAIN.height).forEach((row, y) => {
        columns.forEach((column, x) => {
          const from = (row * scratch.width + column) * 4
          out.data.set(read.subarray(from, from + 4), (y * TITLE_PLAIN.width + x) * 4)
        })
      })
      target.putImageData(out, 0, 0)
      onReady(true)
    }
    // With no plain, the scene's own sky and grass show through, and the intro need not wait.
    image.onerror = () => {
      if (current) onReady(true)
    }
    image.src = TITLE_PLAIN.url
    return () => {
      current = false
    }
  }, [onReady])
  return <canvas ref={canvas} className="dn-title-scene__plain" width={TITLE_PLAIN.width} height={TITLE_PLAIN.height} />
}

/** A bolt on the scene's pixels: a pale core two pixels wide, edged in red on either side. */
function Bolt({ points }: { points: readonly BoltPoint[] }) {
  // A fork may run over its trunk: each pixel once.
  const unique = [...new Map(points.map((point) => [`${point.x} ${point.y}`, point])).values()]
  return (
    <svg className="dn-title-scene__bolt dn-title-scene__near" viewBox={`0 0 ${TITLE_PLAIN.width} ${TITLE_PLAIN.height}`} shapeRendering="crispEdges">
      {unique.map(({ x, y }) => (
        <rect key={`edge ${x} ${y}`} className="dn-title-scene__bolt-edge" x={x - 1} y={y} width={4} height={1} />
      ))}
      {unique.map(({ x, y }) => (
        <rect key={`core ${x} ${y}`} className="dn-title-scene__bolt-core" x={x} y={y} width={2} height={1} />
      ))}
    </svg>
  )
}
