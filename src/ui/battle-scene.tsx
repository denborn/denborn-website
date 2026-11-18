import { AnimatePresence, type AnimationPlaybackControls, MotionConfig, type MotionValue, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { type CSSProperties, Fragment, type ReactNode, createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { BATTLE_HUD } from '../data/sprites'
import { useDsUnit, usePixelScale } from './Screen'
import { AgonyBars, AgonyMark, type AgonyProps, GenderMark, HpBar } from './battle'
import { DURATION, EASE } from './motion'
import { drawOwnPixels } from './own-pixels'
import { usePrefersReducedMotion } from './reduced-motion'
import { type Camera, CAMERA_HOME, HEAD_ROW, ROAM, SHOTS, type SceneGround, type SceneLayout, type SceneShot, type SceneSide, VANISHING_POINT, heldCamera, layerView, sceneLayout } from './scene-camera'
import { skyAt } from './sky'

/** The top of the message band on a fight's scene, in DS pixels. */
export const BAND_TOP = 146

/** What the camera does to a layer, as a moving element takes it: a shift in CSS pixels and a size. */
interface LayerMotion {
  x: MotionValue<number>
  y: MotionValue<number>
  scale: MotionValue<number>
}

/** A scene's layout, and its two layers as the camera now sees them. */
interface World {
  layout: SceneLayout
  layers: Record<SceneSide, LayerMotion>
  /** The point of the screen a layer grows about, for CSS. */
  origin: string
}

const WorldContext = createContext<World | null>(null)

/** The camera's three numbers. */
type CameraMotion = Record<keyof Camera, MotionValue<number>>

/**
 * The camera of a fight's scene: it glides to where a shot puts it, and goes
 * its slow round while the shot is `roam`. For anyone who asked for less
 * motion it stays at rest: the message and the plates already tell.
 */
function useCamera(shot: SceneShot): CameraMotion {
  const x = useMotionValue(CAMERA_HOME.x)
  const y = useMotionValue(CAMERA_HOME.y)
  const z = useMotionValue(CAMERA_HOME.z)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced) {
      x.jump(CAMERA_HOME.x)
      y.jump(CAMERA_HOME.y)
      z.jump(CAMERA_HOME.z)
      return
    }
    let ended = false
    /** Asked anew after each wait: the shot may have changed meanwhile. */
    const over = (): boolean => ended
    let glides: AnimationPlaybackControls[] = []
    let rest: ReturnType<typeof setTimeout> | undefined
    const glide = (to: Camera, seconds: number, ease: 'easeInOut' | typeof EASE.out): Promise<unknown> => {
      glides = [animate(x, to.x, { duration: seconds, ease }), animate(y, to.y, { duration: seconds, ease }), animate(z, to.z, { duration: seconds, ease })]
      return Promise.all(glides.map((running) => running.finished))
    }
    /** A real wait: a round whose glides ended at once would otherwise never let the page breathe. */
    const stay = (seconds: number): Promise<void> => new Promise((resolve) => (rest = setTimeout(resolve, seconds * 1000)))
    const play = async (): Promise<void> => {
      // From wherever the last shot left it.
      await glide(shot === 'roam' ? CAMERA_HOME : SHOTS[shot], DURATION.slow, EASE.out)
      if (shot !== 'roam') return
      for (;;) {
        for (const leg of ROAM) {
          if (over()) return
          if (leg.seconds > 0) await glide(leg.to, leg.seconds, 'easeInOut')
          if (over()) return
          await stay(leg.hold)
        }
      }
    }
    void play()
    return () => {
      ended = true
      clearTimeout(rest)
      for (const running of glides) running.stop()
    }
  }, [shot, reduced, x, y, z])
  return useMemo(() => ({ x, y, z }), [x, y, z])
}

/** One side's layer as the camera sees it, in CSS pixels: it follows the camera frame by frame. */
function useLayer(camera: CameraMotion, side: SceneSide, layout: SceneLayout, unit: number): LayerMotion {
  const view = useTransform(() => layerView(heldCamera({ x: camera.x.get(), y: camera.y.get(), z: camera.z.get() }, layout.backdrop), side))
  const x = useTransform(() => view.get().x * unit)
  const y = useTransform(() => view.get().y * unit)
  const scale = useTransform(() => view.get().scale)
  return useMemo(() => ({ x, y, scale }), [x, y, scale])
}

export interface SceneWorldProps {
  /** The background: one of those `src/data/battle-backdrops.ts` lists, with its size in its own pixels and where its two battle bases are. */
  backdrop: SceneGround
  /** Its picture. */
  url: string
  /** The hour of the day it is lit at, from 0 to 23 (decision 275). By day when left out. */
  hour?: number | undefined
  /** What the camera does (decision 279). At rest when left out. */
  shot?: SceneShot
  /** Who stands on it: a `SceneSpot` for each side. */
  children?: ReactNode
}

/**
 * What a fight's camera looks at (decisions 246, 268, 275, 277 and 279): one
 * of Showdown's backdrops, taken back to its own pixels and laid at close to
 * that size, its whole height the screen's, and on it the two Pokémon, each
 * standing on the battle base painted for it (`scene-camera.ts`). The camera moves the
 * background and the far Pokémon as one layer and the near Pokémon as
 * another, nearer; the plates and the message band are not its to move. An
 * hour that is not day lays a veil over the background alone.
 * Put first in a `scene` screen; with no picture to be had, the screen's own
 * sky and grass show.
 */
export function SceneWorld({ backdrop, url, hour, shot = 'home', children }: SceneWorldProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const unit = useDsUnit()
  const { own, bases } = backdrop
  const { width, height } = own
  useEffect(() => {
    let current = true
    const image = new Image()
    image.onload = () => {
      if (current && canvas.current) drawOwnPixels(canvas.current, image, { width, height })
    }
    image.src = url
    return () => {
      current = false
    }
  }, [url, width, height])
  const layout = useMemo(() => sceneLayout({ own: { width, height }, bases }), [width, height, bases])
  const camera = useCamera(shot)
  const far = useLayer(camera, 'far', layout, unit)
  const near = useLayer(camera, 'near', layout, unit)
  const origin = `${VANISHING_POINT.x * unit}px ${VANISHING_POINT.y * unit}px`
  const world = useMemo<World>(() => ({ layout, layers: { far, near }, origin }), [layout, far, near, origin])
  const box = layout.backdrop
  const sky = skyAt(hour ?? Number.NaN)
  return (
    <WorldContext value={world}>
      <motion.div className="dn-world" style={{ ...far, transformOrigin: origin }} aria-hidden="true">
        <canvas ref={canvas} className="dn-backdrop" width={width} height={height} style={{ left: box.left * unit, top: box.top * unit, width: box.width * unit, height: box.height * unit }} />
      </motion.div>
      {sky.veil && <div className={`dn-backdrop-sky dn-backdrop-sky--${sky.veil}`} style={{ opacity: sky.strength }} aria-hidden="true" />}
      {children}
    </WorldContext>
  )
}

export interface SceneSpotProps {
  side: SceneSide
  /** Who stands there: a name that stays its own. Nobody when the line is empty. */
  id: string | undefined
  /** The size its Pokémon is to be, in DS pixels per pixel of its sprite: `spriteScale(side, …)`, the same as its `Battler` is given. */
  scale: number
  /** The Pokémon itself: a `Battler`. */
  children: ReactNode
}

/**
 * Where one side's Pokémon stands on a fight's scene (decisions 277 and
 * 283): one Pokémon a side, on the battle base the background has for it,
 * the middle of its feet on the middle of the base, whatever its size, as
 * the games stand theirs. One too tall for the room over its feet stands
 * lower. It is a layer of the scene's world: the camera moves it. When
 * another one of its line takes its place, the one that was there goes out
 * by its side of the scene and the new one comes in by it. Nothing on the
 * scene is pressed (decision 272). Put inside a `SceneWorld`.
 *
 * A `Battler` draws its sprite on whole pixels of the device, which is a
 * fifth off its size on some phones. The spot brings it to its exact size,
 * from its feet: the scene is the same on every screen, and a sprite's
 * pixels are then not all one width.
 */
export function SceneSpot({ side, id, scale, children }: SceneSpotProps) {
  const world = useContext(WorldContext)
  const unit = useDsUnit()
  const drawn = usePixelScale(scale)
  if (!world) throw new Error('A SceneSpot stands on a SceneWorld')
  const feet = world.layout.feet[side]
  // The near side's Pokémon leaves by the left, the far side's by the right: the sides they came in by.
  const away = (side === 'near' ? -1 : 1) * 48 * unit
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={`dn-world dn-world--${side}`} style={{ ...world.layers[side], transformOrigin: world.origin }}>
        <div className="dn-spot" style={{ left: feet.x * unit, top: HEAD_ROW * unit, height: (feet.y - HEAD_ROW) * unit }}>
          <AnimatePresence initial={false}>
            {id !== undefined && (
              <motion.div key={id} className="dn-spot__stand" exit={{ x: away, opacity: 0 }} transition={{ duration: DURATION.quick, ease: EASE.in }}>
                <div className="dn-spot__pokemon" style={{ scale: (scale * unit) / drawn }}>
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  )
}

export interface BattlePlateProps {
  /** `far` plates start from the screen's left edge and point right; `near` ones start from its right edge and point left. */
  side: SceneSide
  /** Its place on its line, shown before its name. */
  letter: string
  name: string
  level: number
  gender: 'M' | 'F' | 'N'
  hp: number
  maxHp: number
  /** Words that change with the language. */
  text: {
    level: string
    hp: string
    hpLabel: (hp: number, max: number) => string
    gender: { M: string; F: string }
  }
  /** The Pokémon being played, on the near line: its plate is the games' larger one, with its HP in numbers. */
  own?: boolean
  /** For a downed Pokémon: its Agony (decision 266), a badge among its conditions and three bars in the HP bar's place. */
  agony?: AgonyProps
  /** Set when it carries stat changes or effects of its own: the words that say so. */
  changed?: string
  /** Set when the Pokémon the scene is centred on does not reach it: the words that say so. */
  outOfReach?: string
  /** Status badges. */
  children?: ReactNode
}

/** How many rows of a plate's band show when it carries no numbers: its light rows and the first of its dark ones, as the games' short plate. */
const SHORT_ROWS = 9

/**
 * One Pokémon's plate during a fight (decision 247): the games' own band
 * (decision 255), on whole pixels of the device, under its name, gender and
 * level, which stand on the scene. The app writes "HP" in the band's box and
 * draws the bar in its well; the played Pokémon's band is the taller one,
 * with its HP in numbers on the dark rows. No EXP.
 */
export function BattlePlate({ side, letter, name, level, gender, hp, maxHp, text, own = false, agony, changed, outOfReach, children }: BattlePlateProps) {
  const pixel = usePixelScale(1)
  const piece = BATTLE_HUD.plates[side]
  const numbers = own && 'numbers' in piece ? piece.numbers : undefined
  const classes = ['dn-plate', `dn-plate--${side}`]
  if (outOfReach) classes.push('dn-plate--unreached')
  /** A length of the band, from so many of its own pixels. */
  const px = (pixels: number): number => pixels * pixel
  const band: CSSProperties = {
    width: px(piece.width),
    height: px(numbers ? piece.height : SHORT_ROWS),
    backgroundImage: `url(${BATTLE_HUD.url})`,
    backgroundSize: `${px(BATTLE_HUD.width)}px ${px(BATTLE_HUD.height)}px`,
    backgroundPosition: `${-px(piece.x)}px ${-px(piece.y)}px`,
  }
  const well: CSSProperties = { left: px(piece.bar.x), top: px(piece.bar.y), width: px(piece.bar.width), height: px(piece.bar.height) }
  return (
    <div className={classes.join(' ')} style={{ '--dn-hud-px': `${pixel}px`, width: px(piece.width) } as CSSProperties}>
      <span className="dn-plate__title dn-text-outline">
        <span className="dn-plate__letter">{letter}</span>
        <span className="dn-plate__name">{name}</span>
        {outOfReach && <span className="dn-visually-hidden">{outOfReach}</span>}
        {gender !== 'N' && <GenderMark gender={gender} label={text.gender[gender]} />}
        <span>
          <span className="dn-hud__label">{text.level}</span>
          {level}
        </span>
      </span>
      <span className="dn-plate__band" style={band}>
        <span className="dn-plate__states" style={{ width: px(piece.hp.x) }}>
          {agony && <AgonyMark {...agony} />}
          {children}
          {changed && <span className="dn-changes" role="img" aria-label={changed} />}
        </span>
        {agony ? (
          <span className="dn-plate__bar" style={well}>
            <AgonyBars {...agony} />
          </span>
        ) : (
          <>
            <span className="dn-plate__hp" style={{ left: px(piece.hp.x), width: px(piece.hp.width) }} aria-hidden="true">
              {text.hp}
            </span>
            <span className="dn-plate__bar" style={well}>
              <HpBar current={hp} max={maxHp} label={text.hpLabel(hp, maxHp)} />
            </span>
          </>
        )}
        {numbers && !agony && (
          <span className="dn-plate__numbers" style={{ top: px(numbers.y), height: px(numbers.height) }} aria-hidden="true">
            {hp}/{maxHp}
          </span>
        )}
      </span>
    </div>
  )
}

export interface ScenePlateProps {
  side: SceneSide
  /** Whose plate it is: a name that stays its Pokémon's. Nobody when the line is empty. */
  id: string | undefined
  /** The plate: a `BattlePlate`. */
  children: ReactNode
}

/**
 * The plate of one side's Pokémon, where Black and White put it (decisions
 * 247 and 278): the far side's against the left edge, its band 40 down; the
 * near side's against the right edge, its band 120 down. It slides in from
 * its edge once, as the fight opens, and then never moves: the camera moves
 * the scene under it, and when another Pokémon of the line is shown the
 * plate stays and says that one's name and HP at once.
 */
export function ScenePlate({ side, id, children }: ScenePlateProps) {
  if (id === undefined) return null
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={`dn-scene__plate dn-scene__plate--${side}`} initial={{ x: side === 'far' ? '-100%' : '100%' }} animate={{ x: 0 }} transition={{ duration: DURATION.move, ease: EASE.out }}>
        {/* Another Pokémon's plate is a new one: its bar does not run from the last one's HP to its own, which would look like a hit. */}
        <Fragment key={id}>{children}</Fragment>
      </motion.div>
    </MotionConfig>
  )
}
