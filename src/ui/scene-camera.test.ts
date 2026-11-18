import { describe, expect, it } from 'vitest'
import { BATTLE_BACKDROPS } from '../data/battle-backdrops'
import { type Camera, CAMERA_HOME, ROAM, SCENE_SCREEN, SHOTS, type SceneGround, heldCamera, layerView, sceneLayout, seenAt, spriteScale } from './scene-camera'

/** A picture wider than the screen needs, with its bases where the app's pictures have theirs. */
const WIDE: SceneGround = { own: { width: 240, height: 160 }, bases: { far: { x: 170, y: 74 }, near: { x: 80, y: 124 } } }

/** Every place the camera can be asked for by the app. */
const ASKED: readonly Camera[] = [...Object.values(SHOTS), ...ROAM.map((leg) => leg.to)]

/** Whether the background, as the camera shows it, leaves no edge of the screen bare. */
function covers(ground: SceneGround, camera: Camera): boolean {
  const { backdrop } = sceneLayout(ground)
  const corner = seenAt({ x: backdrop.left, y: backdrop.top }, camera, 'far')
  const opposite = seenAt({ x: backdrop.left + backdrop.width, y: backdrop.top + backdrop.height }, camera, 'far')
  const hair = 1e-9
  return corner.x <= hair && corner.y <= hair && opposite.x >= SCENE_SCREEN.width - hair && opposite.y >= SCENE_SCREEN.height - hair
}

describe('a scene at rest', () => {
  it.each(BATTLE_BACKDROPS.map((backdrop) => [backdrop.id, backdrop] as const))('the background "%s" is as tall as the screen and leaves no edge of it bare', (_id, backdrop) => {
    const box = sceneLayout(backdrop).backdrop
    expect(box.top).toBe(0)
    expect(box.height).toBe(SCENE_SCREEN.height)
    expect(covers(backdrop, CAMERA_HOME)).toBe(true)
  })

  it('enlarges a picture by the same amount across and down: its pixels stay square', () => {
    const box = sceneLayout(WIDE).backdrop
    expect(box.width / WIDE.own.width).toBeCloseTo(box.height / WIDE.own.height)
  })

  it.each(BATTLE_BACKDROPS.map((backdrop) => [backdrop.id, backdrop] as const))('each Pokémon of "%s" stands across the middle of its base, its feet a little under that middle', (_id, backdrop) => {
    const { backdrop: box, feet } = sceneLayout(backdrop)
    const scale = box.height / backdrop.own.height
    for (const side of ['far', 'near'] as const) {
      const base = { x: box.left + backdrop.bases[side].x * scale, y: box.top + backdrop.bases[side].y * scale }
      expect(feet[side].x).toBeCloseTo(base.x)
      expect(feet[side].y).toBeGreaterThan(base.y)
      // Never off the base: a base is over twenty of the picture's pixels tall.
      expect(feet[side].y - base.y).toBeLessThan(10 * scale)
    }
  })

  it('puts the near Pokémon’s feet further under its base’s middle than the far one’s: as much as it is drawn larger', () => {
    const { backdrop, feet } = sceneLayout(WIDE)
    const scale = backdrop.height / WIDE.own.height
    const under = (side: 'far' | 'near'): number => feet[side].y - WIDE.bases[side].y * scale
    expect(under('near') / under('far')).toBeCloseTo(spriteScale('near', 'gen5ani') / spriteScale('far', 'gen5ani'))
  })

  it('puts the far base at the same place across whatever the picture, when the picture has the room', () => {
    const shifted: SceneGround = { ...WIDE, bases: { ...WIDE.bases, far: { x: WIDE.bases.far.x - 6, y: WIDE.bases.far.y } } }
    expect(sceneLayout(shifted).feet.far.x).toBeCloseTo(sceneLayout(WIDE).feet.far.x)
  })

  it('does not leave the screen bare to put a narrow picture’s base there: the Pokémon stays on its base', () => {
    // Barely wider than the screen once enlarged: its base cannot be brought to the usual place.
    const narrow: SceneGround = { own: { width: 135, height: 100 }, bases: { far: { x: 60, y: 46 }, near: { x: 30, y: 78 } } }
    const { backdrop, feet } = sceneLayout(narrow)
    expect(covers(narrow, CAMERA_HOME)).toBe(true)
    expect(feet.far.x).toBeLessThan(sceneLayout(WIDE).feet.far.x)
    expect(feet.far.x).toBeCloseTo(backdrop.left + (narrow.bases.far.x * backdrop.height) / narrow.own.height)
  })

  it.each(BATTLE_BACKDROPS.map((backdrop) => [backdrop.id, backdrop] as const))('both Pokémon stand on the screen of "%s", the near one lower and to the left', (_id, backdrop) => {
    const { far, near } = sceneLayout(backdrop).feet
    for (const point of [far, near]) {
      expect(point.x).toBeGreaterThan(0)
      expect(point.x).toBeLessThan(SCENE_SCREEN.width)
      expect(point.y).toBeGreaterThan(0)
      expect(point.y).toBeLessThan(SCENE_SCREEN.height)
    }
    expect(near.x).toBeLessThan(far.x)
    expect(near.y).toBeGreaterThan(far.y)
  })
})

describe('a Pokémon’s size on the scene', () => {
  it('is no smaller on the near side than on the far side', () => {
    for (const set of ['gen5ani', 'ani']) expect(spriteScale('near', set)).toBeGreaterThanOrEqual(spriteScale('far', set))
  })

  it('is the Gen 5 animated set’s for a set this app does not know', () => {
    expect(spriteScale('near', undefined)).toBe(spriteScale('near', 'gen5ani'))
    expect(spriteScale('far', null)).toBe(spriteScale('far', 'gen5ani'))
    expect(spriteScale('near', 'another')).toBe(spriteScale('near', 'gen5ani'))
  })
})

describe('the camera', () => {
  it('at rest shows each side as it is drawn', () => {
    for (const side of ['far', 'near'] as const) {
      const view = layerView(CAMERA_HOME, side)
      expect(view.x).toBeCloseTo(0)
      expect(view.y).toBeCloseTo(0)
      expect(view.scale).toBe(1)
      expect(seenAt({ x: 40, y: 150 }, CAMERA_HOME, side)).toEqual({ x: 40, y: 150 })
    }
  })

  it('moving across, shifts the far side the other way by as much, and the near side further: as much as it is drawn larger', () => {
    const moved: Camera = { x: 5, y: -2, z: 0 }
    const far = layerView(moved, 'far')
    const near = layerView(moved, 'near')
    const nearer = spriteScale('near', 'gen5ani') / spriteScale('far', 'gen5ani')
    expect(nearer).toBeGreaterThan(1)
    expect(far.x).toBeCloseTo(-5)
    expect(far.y).toBeCloseTo(2)
    expect(near.x).toBeCloseTo(nearer * far.x)
    expect(near.y).toBeCloseTo(nearer * far.y)
    expect(far.scale).toBe(1)
    expect(near.scale).toBe(1)
  })

  it('going forward, grows both sides, the near one faster', () => {
    const forward: Camera = { x: 0, y: 0, z: 0.2 }
    const far = layerView(forward, 'far').scale
    const near = layerView(forward, 'near').scale
    expect(far).toBeGreaterThan(1)
    expect(near).toBeGreaterThan(far)
  })

  it.each(BATTLE_BACKDROPS.map((backdrop) => [backdrop.id, backdrop] as const))('once held, never shows an edge of "%s", wherever it was asked to go', (_id, backdrop) => {
    const { backdrop: box } = sceneLayout(backdrop)
    for (const z of [-0.3, 0, 0.05, 0.2, 0.5, 0.95, 3]) {
      for (const x of [-400, -30, -4, 0, 4, 30, 400]) {
        for (const y of [-300, -20, -3, 0, 3, 20, 300]) {
          expect(covers(backdrop, heldCamera({ x, y, z }, box))).toBe(true)
        }
      }
    }
  })

  it('is left where it was asked to go when the background has the room', () => {
    const { backdrop } = sceneLayout(WIDE)
    const asked: Camera = { x: 2, y: 1, z: 0.1 }
    expect(heldCamera(asked, backdrop)).toEqual(asked)
  })

  it('cannot go up or down at rest: the background is no taller than the screen', () => {
    const { backdrop } = sceneLayout(WIDE)
    expect(heldCamera({ x: 0, y: 6, z: 0 }, backdrop).y).toBeCloseTo(0)
    expect(heldCamera({ x: 0, y: -6, z: 0 }, backdrop).y).toBeCloseTo(0)
  })

  it.each(BATTLE_BACKDROPS.map((backdrop) => [backdrop.id, backdrop] as const))('goes where each of its shots asks on "%s": none has to be held back', (_id, backdrop) => {
    const { backdrop: box } = sceneLayout(backdrop)
    for (const asked of ASKED) expect(heldCamera(asked, box)).toEqual(asked)
  })

  it('ends its round where it began, and rests on the way', () => {
    expect(ROAM.at(-1)?.to).toEqual(CAMERA_HOME)
    expect(ROAM.at(0)?.to).toEqual(CAMERA_HOME)
    // The round is played in a loop: without a real wait in it, glides that end at once would never let the page breathe.
    expect(ROAM.reduce((waited, leg) => waited + leg.hold, 0)).toBeGreaterThan(0)
  })
})
