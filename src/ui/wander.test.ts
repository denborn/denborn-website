import { describe, expect, it } from 'vitest'
import { TITLE_DEN, TITLE_PLAIN } from '../data/sprites'
import { fitScene } from './scene-fit'
import { type Build, type Ground, type Spot, WANDER, arrivals, ghostWait, groundOf, legOf, nextWalk, onStage, restTime, standing, walkerPixel, wayIn, wayOut, wayTo } from './wander'

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The narrowest phone, a common one and the widest the app gets: screen width in CSS pixels, device pixels to one of them. */
const PHONES = [
  { width: 320, ratio: 2 },
  { width: 412, ratio: 2.625 },
  { width: 480, ratio: 3 },
] as const

/** A small Pokémon with a short name, and the largest sprite there is with its name. */
const BUILDS: readonly Build[] = [
  { half: 13, tall: 32 },
  { half: 32, tall: 58 },
]

const fitOf = ({ width, ratio }: (typeof PHONES)[number]) => fitScene(TITLE_PLAIN, width, ratio, TITLE_DEN.middle.x)

const CASES = PHONES.flatMap((phone) => BUILDS.map((build) => ({ name: `${phone.width} px, a sprite ${build.half * 2} wide`, visible: fitOf(phone).visible, build })))

/** Whether the spot is on the rocks' own ground, its edge not counted. */
function onRocks(spot: Spot): boolean {
  const corners = TITLE_DEN.footprint
  const sides = corners.map((from, at) => {
    const to = corners[(at + 1) % corners.length] ?? from
    return Math.sign((to.x - from.x) * (spot.y - from.y) - (to.y - from.y) * (spot.x - from.x))
  })
  return sides.every((side) => side === sides[0] && side !== 0)
}

/** Every spot the feet are shown at on a straight walk: columns and rows are crossed one pixel at a time, each at its own even pace. */
function shownOn(from: Spot, to: Spot): Spot[] {
  const { columns, rows } = legOf(from, to, WANDER.walk)
  const moments = 4 * Math.max(columns, rows) + 1
  return Array.from({ length: moments + 1 }, (_, moment) => ({
    x: from.x + Math.sign(to.x - from.x) * Math.floor((moment / moments) * columns),
    y: from.y + Math.sign(to.y - from.y) * Math.floor((moment / moments) * rows),
  }))
}

/** A walker's first minutes: its way in, then walk after walk. Each walk is the spots it goes through, the first being where it starts. */
function walksOf(ground: Ground, random: () => number, count = 25): Spot[][] {
  const walks = [wayIn(ground, random() < 0.5 ? 'left' : 'right', random)]
  for (let walk = 0; walk < count; walk++) {
    const from = walks.at(-1)?.at(-1)
    if (from) walks.push([from, ...nextWalk(from, ground, random)])
  }
  return walks
}

const behindLight = (spot: Spot, build: Build): boolean =>
  spot.y < TITLE_DEN.light.foot && spot.x > TITLE_DEN.light.left - build.half && spot.x < TITLE_DEN.light.right + build.half

describe.each(CASES)('walking round the den on $name', ({ visible, build }) => {
  const ground = groundOf(visible, build)

  it('never sets foot on the rocks, at any pixel of any walk', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const walk of walksOf(ground, seeded(seed))) {
        const onThem = walk.slice(1).flatMap((to, at) => shownOn(walk[at] ?? to, to).filter(onRocks))
        expect(onThem).toEqual([])
      }
    }
  })

  it.each(['left', 'right'] as const)('comes in from out of sight, off the bottom %s corner of the screen', (side) => {
    for (let seed = 1; seed <= 30; seed++) {
      const [from] = wayIn(ground, side, seeded(seed))
      expect(from !== undefined && (side === 'left' ? from.x + build.half < visible.left : from.x - build.half > visible.right)).toBe(true)
      expect(from?.y).toBeGreaterThanOrEqual(visible.bottom - 8)
      expect(from?.y).toBeLessThanOrEqual(visible.bottom)
    }
  })

  it('first stops not far from where it came in, when there is a spot that near', () => {
    const away = (from: Spot, to: Spot): number => Math.hypot(to.x - from.x, to.y - from.y)
    for (let seed = 1; seed <= 60; seed++) {
      const way = wayIn(ground, seed % 2 === 0 ? 'left' : 'right', seeded(seed))
      const [from] = way
      const stop = way.at(-1)
      if (!from || !stop) continue
      const anyNear = ground.stops.some((spot) => away(from, spot) <= WANDER.arrival)
      if (anyNear) expect(away(from, stop)).toBeLessThanOrEqual(WANDER.arrival)
    }
  })

  it('stands in different places when nothing moves, while there is room', () => {
    if (build.half > 20) return
    const spots = Array.from({ length: WANDER.stage }, (_, index) => standing(index, WANDER.stage, ground))
    expect(new Set(spots.map(({ x, y }) => `${x} ${y}`)).size).toBe(WANDER.stage)
  })

  it('stops only where it shows whole, under the top of the screen, and never behind the light', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const walk of walksOf(ground, seeded(seed))) {
        const stop = walk.at(-1)
        if (!stop) continue
        expect(stop.x).toBeGreaterThanOrEqual(ground.rest.left)
        expect(stop.x).toBeLessThanOrEqual(ground.rest.right)
        expect(stop.y - build.tall).toBeGreaterThanOrEqual(visible.top)
        expect(stop.y).toBeLessThanOrEqual(visible.bottom)
        expect(behindLight(stop, build)).toBe(false)
      }
    }
  })

  it('has a way from any spot it stops at to any other', () => {
    const stops = walksOf(ground, seeded(7), 30).flatMap((walk) => walk.at(-1) ?? [])
    for (const from of stops) {
      for (const to of stops) {
        const way = wayTo(from, to, ground)
        expect(way?.at(-1), `${from.x},${from.y} to ${to.x},${to.y}`).toEqual(to)
      }
    }
  })

  it('leaves by a bottom corner, out of sight, without crossing the rocks', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const from = walksOf(ground, seeded(seed), 3).at(-1)?.at(-1)
      if (!from) continue
      const way = wayOut(from, ground)
      const end = way.at(-1)
      expect(end !== undefined && (end.x + build.half < visible.left || end.x - build.half > visible.right)).toBe(true)
      expect(end?.y).toBeGreaterThanOrEqual(visible.bottom - 8)
      expect(way.flatMap((to, at) => shownOn(way[at - 1] ?? from, to).filter(onRocks))).toEqual([])
    }
  })

  it('stands off the rocks, whole on the screen and clear of the light when nothing moves', () => {
    for (let count = 1; count <= WANDER.stage; count++) {
      for (let index = 0; index < count; index++) {
        const spot = standing(index, count, ground)
        expect(onRocks(spot), `${index} of ${count}`).toBe(false)
        expect(spot.x).toBeGreaterThanOrEqual(ground.rest.left)
        expect(spot.x).toBeLessThanOrEqual(ground.rest.right)
        expect(spot.y).toBeLessThanOrEqual(visible.bottom)
        expect(behindLight(spot, build)).toBe(false)
      }
    }
  })
})

describe('the way out', () => {
  it('goes by the corner that is the shorter walk away', () => {
    const { visible } = fitOf(PHONES[1])
    const build = BUILDS[0] ?? { half: 13, tall: 32 }
    const ground = groundOf(visible, build)
    const bottom = visible.bottom
    expect(wayOut({ x: visible.left + 20, y: bottom }, ground).at(-1)?.x).toBeLessThan(visible.left)
    expect(wayOut({ x: visible.right - 20, y: bottom }, ground).at(-1)?.x).toBeGreaterThan(visible.right)
  })
})

describe('a straight walk', () => {
  it('lasts its length at its pace, and crosses whole columns and rows', () => {
    expect(legOf({ x: 10, y: 60 }, { x: 13, y: 56 }, 5)).toEqual({ seconds: 1, columns: 3, rows: 4 })
    expect(legOf({ x: 13, y: 56 }, { x: 13, y: 56 }, 5)).toEqual({ seconds: 0, columns: 0, rows: 0 })
  })
})

describe('coming in', () => {
  it('sends the first one onto an empty plain at a run and at once, the others after it at a walk', () => {
    const came = arrivals([], ['a', 'b', 'c'])
    expect(came.get('a')).toMatchObject({ wait: 0, runs: true })
    expect(came.get('b')).toMatchObject({ wait: WANDER.stagger, runs: false })
    expect(came.get('c')).toMatchObject({ wait: 2 * WANDER.stagger, runs: false })
  })

  it('sends those who come in together by one side then the other, in turn', () => {
    const came = arrivals([], ['a', 'b', 'c'])
    expect(['a', 'b', 'c'].map((name) => came.get(name)?.side)).toEqual(['left', 'right', 'left'])
  })

  it('sends one who joins the others at once, at a walk, and leaves those already out alone', () => {
    const came = arrivals(['a', 'b'], ['b', 'c'])
    expect([...came.keys()]).toEqual(['c'])
    // Alone, it comes by either side.
    expect(came.get('c')).toEqual({ wait: 0, runs: false })
  })
})

describe('whose turn it is', () => {
  it('has everyone out while they are few enough', () => {
    expect(onStage(0, 3)).toEqual([])
    expect(onStage(WANDER.stage, 9)).toEqual(Array.from({ length: WANDER.stage }, (_, index) => index))
  })

  it('with more of them, has a full plain at every turn, one leaving for one coming, and everyone out in turn', () => {
    const count = WANDER.stage + 3
    const seen = new Set<number>()
    for (let turn = 0; turn < count; turn++) {
      const out = onStage(count, turn)
      const next = onStage(count, turn + 1)
      expect(new Set(out).size).toBe(WANDER.stage)
      expect(out.filter((index) => !next.includes(index))).toHaveLength(1)
      expect(next.filter((index) => !out.includes(index))).toHaveLength(1)
      out.forEach((index) => seen.add(index))
    }
    expect(seen.size).toBe(count)
  })
})

describe('waiting', () => {
  it('rests, and waits for a ghost, between the shortest and the longest time', () => {
    const random = seeded(3)
    for (let draw = 0; draw < 500; draw++) {
      const rest = restTime(random)
      const ghost = ghostWait(random)
      expect(rest).toBeGreaterThanOrEqual(WANDER.rest[0])
      expect(rest).toBeLessThanOrEqual(WANDER.rest[1])
      expect(ghost).toBeGreaterThanOrEqual(WANDER.ghostGap[0])
      expect(ghost).toBeLessThanOrEqual(WANDER.ghostGap[1])
    }
  })
})

describe("a walker's size", () => {
  it.each(PHONES)('is whole device pixels on a $width px phone, and no more than half the scene’s', (phone) => {
    const scenePixel = fitOf(phone).pixel
    const devicePixels = walkerPixel(scenePixel, phone.ratio) * phone.ratio
    expect(devicePixels).toBeCloseTo(Math.round(devicePixels), 9)
    expect(devicePixels).toBeGreaterThanOrEqual(1)
    expect(devicePixels).toBeLessThanOrEqual((scenePixel * phone.ratio) / 2)
  })
})
