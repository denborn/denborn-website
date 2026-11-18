/**
 * Where a fight's scene lays its background and stands its two Pokémon, and
 * how its camera moves them (decisions 277, 279 and 283).
 *
 * **Where**: each Pokémon stands on the battle base painted for it in the
 * background, the middle of its feet on the middle of the base, as Black and
 * White stand theirs on their bases: on the owner's screenshots of the games
 * the far Pokémon's feet are 1.5 to 5.5 pixels under the middle of its base,
 * and across it. Where a picture has its two bases is in
 * `src/data/battle-backdrops.ts`.
 *
 * Pokémon Showdown's own client is not followed for that. It centres a
 * Pokémon's picture on one of two points of its frame of 640 by 360, (210,
 * 245) and (430, 135), a backdrop being drawn 50 to the left of the frame and
 * 90 above it (`BattleScene.pos` in battle-animations.ts and `.backdrop` in
 * battle.css, at commit 1cf9b38). On a picture that is 82 across and 106
 * down for the near side, and 152 across and 71 down for the far side, in
 * the picture's own pixels: the far point is 21 left of the middle of the far
 * base, and both are a picture's middle, not its feet. With Pokémon a third
 * of the games' size, as Showdown draws them, it does not show; at the
 * games' size they stand beside their bases (decision 283).
 *
 * **How large**: as on Black and White's own screen, measured on the owner's
 * screenshots (256 by 192) against the games' own pictures of the Pokémon on
 * them: the far Pokémon a pixel of the screen to a pixel of its picture
 * (Zorua, Oshawott, Excadrill), the near one one and a half (Zoroark, 107
 * wide for 74). Showdown's backdrops are drawn at the games' scale: a
 * picture's far base is as large, in its own pixels, as the games' far base
 * on their screen. So a backdrop is laid at close to its own size, its whole
 * height the screen's.
 *
 * The camera is Denborn's own, after the games', whose scene is in three
 * dimensions: the background and the far Pokémon are one layer, the near
 * Pokémon another, as much nearer as it is drawn larger, which a move of the
 * camera shifts further and grows faster. Nothing here is placed by eye.
 */

/** The side of the scene a Pokémon stands on: the viewer's own line is `near`, seen from behind; the other is `far`. */
export type SceneSide = 'near' | 'far'

/** The set a battle sprite comes from, as the data pack names it. */
type SpriteSet = 'gen5ani' | 'ani'

export interface ScenePoint {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** A DS screen, in DS pixels. */
export const SCENE_SCREEN = { width: 256, height: 192 } as const

/**
 * How many DS pixels a pixel of a Pokémon's picture takes while the camera
 * rests: Black and White's own sizes for the Gen 5 animated set. The later
 * "ani" set is drawn larger to begin with: Showdown's client, which draws
 * both sets on one scene, gives it three quarters of the near size.
 */
const SPRITE_SCALE = { gen5ani: { near: 1.5, far: 1 }, ani: { near: 1.125, far: 1 } } as const

/** How far each side is from the resting camera, the near side's distance being 1: the far side is as many times further as it is drawn smaller. */
const DISTANCE = { near: 1, far: SPRITE_SCALE.gen5ani.near / SPRITE_SCALE.gen5ani.far } as const

/** Where the far base's middle is across the screen: the games' far base is at 186.5 and at 193 on the two screenshots. */
const FAR_BASE_X = 190

/** How far under the middle of its base the far Pokémon's feet are: 1.5 to 5.5 in the games. On the near side everything is larger, as the Pokémon is. */
const FAR_FEET_UNDER = 3

/**
 * The row a Pokémon's head is never above while the camera rests: one too
 * tall for the room over its feet stands lower, its feet further under the
 * message band, as the games' tall ones do.
 */
export const HEAD_ROW = 2

/** How many DS pixels a pixel of a Pokémon's picture takes on the scene. A set this file does not know is drawn as the Gen 5 animated one. */
export function spriteScale(side: SceneSide, set: string | null | undefined): number {
  const known: SpriteSet = set === 'ani' ? 'ani' : 'gen5ani'
  return SPRITE_SCALE[known][side]
}

/** A background, as the scene needs it: its size in its own pixels and the middle of each of its two battle bases. */
export interface SceneGround {
  own: Size
  bases: Record<SceneSide, ScenePoint>
}

export interface SceneLayout {
  /** Where the background lies on the screen, in DS pixels. */
  backdrop: Box
  /** Where each side's Pokémon stands, in DS pixels: the middle of its feet. */
  feet: Record<SceneSide, ScenePoint>
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

/**
 * A scene with the camera at rest. The background's whole height is the
 * screen's: the least it can be enlarged and still fill the screen. Across,
 * its far base is where the games' far base is, or as near to it as a
 * narrower picture can be without leaving the screen bare. Each Pokémon
 * stands across the middle of its base, its feet a little under that middle.
 */
export function sceneLayout(ground: SceneGround): SceneLayout {
  const scale = SCENE_SCREEN.height / ground.own.height
  const width = ground.own.width * scale
  const left = clamp(FAR_BASE_X - ground.bases.far.x * scale, SCENE_SCREEN.width - width, 0)
  const feetOf = (side: SceneSide): ScenePoint => ({
    x: left + ground.bases[side].x * scale,
    y: ground.bases[side].y * scale + (FAR_FEET_UNDER * DISTANCE.far) / DISTANCE[side],
  })
  return { backdrop: { left, top: 0, width, height: SCENE_SCREEN.height }, feet: { far: feetOf('far'), near: feetOf('near') } }
}

/**
 * The camera, from where it rests: `x` to the right and `y` down, in the DS
 * pixels the far side then moves the other way by; `z` forward, as a share of
 * the way to the near Pokémon (at 1 the camera would be on it).
 */
export interface Camera {
  x: number
  y: number
  z: number
}

export const CAMERA_HOME: Camera = { x: 0, y: 0, z: 0 }

/** The camera never goes further forward than this: the near Pokémon would fill the screen. */
const NEAREST = 0.5

/**
 * The point of the screen the camera goes toward: a layer grows away from it
 * as the camera nears. The middle across; a third of the way down, about
 * where the grounds end.
 */
export const VANISHING_POINT: ScenePoint = { x: 128, y: 64 }

/** What the camera does to one side's layer: a size, about the vanishing point, then a shift in DS pixels. */
export interface LayerView {
  x: number
  y: number
  scale: number
}

/** A side's layer as the camera sees it. At rest it is as it is drawn. */
export function layerView(camera: Camera, side: SceneSide): LayerView {
  const away = DISTANCE[side] - camera.z
  // A move of the camera across shifts a layer the other way, more as it is nearer: by the move itself for the far side at rest.
  const shift = DISTANCE.far / away
  return { x: -camera.x * shift, y: -camera.y * shift, scale: DISTANCE[side] / away }
}

/**
 * The camera, kept where the background still covers the whole screen: it
 * goes no further forward than it may, and no further across or down than
 * the picture has room for at that distance.
 */
export function heldCamera(camera: Camera, backdrop: Box): Camera {
  const z = clamp(camera.z, 0, NEAREST)
  const { scale } = layerView({ x: 0, y: 0, z }, 'far')
  /** Where an edge of the picture is once it has grown about the vanishing point. */
  const grown = (edge: number, about: number): number => about + (edge - about) * scale
  const left = grown(backdrop.left, VANISHING_POINT.x)
  const right = grown(backdrop.left + backdrop.width, VANISHING_POINT.x)
  const top = grown(backdrop.top, VANISHING_POINT.y)
  const bottom = grown(backdrop.top + backdrop.height, VANISHING_POINT.y)
  return {
    x: clamp(camera.x, left / scale, (right - SCENE_SCREEN.width) / scale),
    y: clamp(camera.y, top / scale, (bottom - SCENE_SCREEN.height) / scale),
    z,
  }
}

/** A point of a side's layer, where the camera shows it on the screen. */
export function seenAt(point: ScenePoint, camera: Camera, side: SceneSide): ScenePoint {
  const view = layerView(camera, side)
  return { x: VANISHING_POINT.x + (point.x - VANISHING_POINT.x) * view.scale + view.x, y: VANISHING_POINT.y + (point.y - VANISHING_POINT.y) * view.scale + view.y }
}

/**
 * What the camera is asked for. `home`: at rest. `roam`: its slow round while
 * a choice is awaited. `far`, `near`: closing in on that side's Pokémon,
 * while what is told is about it.
 */
export type SceneShot = 'home' | 'roam' | SceneSide

/**
 * Where the camera goes for each shot that has one place. Both come forward
 * and a little to the left, so that the near Pokémon, which stands near the
 * left edge, stays on the screen as it grows; closing in on the far side,
 * the camera also looks a little down. Neither goes far: the near Pokémon is
 * never more than a fifth larger than at rest.
 */
export const SHOTS: Readonly<Record<Exclude<SceneShot, 'roam'>, Camera>> = {
  home: CAMERA_HOME,
  far: { x: -4, y: 4, z: 0.15 },
  near: { x: -8, y: 2, z: 0.1 },
}

/** One leg of the camera's round: where it glides to, in how many seconds, and how long it then stays. */
export interface RoamLeg {
  to: Camera
  seconds: number
  hold: number
}

/**
 * The camera's round while a choice is awaited: it rests, comes forward
 * drifting to the left, goes back across to the right a little further
 * away, and returns. Slow enough to be watched, never still for long.
 */
export const ROAM: readonly RoamLeg[] = [
  { to: CAMERA_HOME, seconds: 0, hold: 2.5 },
  { to: { x: -3, y: 1, z: 0.08 }, seconds: 7, hold: 1.2 },
  { to: { x: 4, y: 2, z: 0.04 }, seconds: 9, hold: 1.2 },
  { to: CAMERA_HOME, seconds: 6, hold: 0 },
]
