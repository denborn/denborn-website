import { describe, expect, it } from 'vitest'
import { ACTS, AT_REST, SHOWCASE, directionOf, framesOf, groundTypeOf, isSliding, nextAct, passageOf, restOf, showcasePixel, slidTo, stepTo } from './showcase'

/** Random numbers that go round the ones given. */
function numbers(...given: number[]): () => number {
  let next = 0
  return () => given[next++ % given.length] ?? 0
}

describe('going round the characters', () => {
  it('goes from the last to the first, and from the first to the last', () => {
    expect(stepTo(4, 1, 5)).toBe(0)
    expect(stepTo(0, -1, 5)).toBe(4)
    expect(stepTo(2, 1, 5)).toBe(3)
    expect(stepTo(2, -1, 5)).toBe(1)
  })

  it('stays on the one there is when there is only one', () => {
    expect(stepTo(0, 1, 1)).toBe(0)
    expect(stepTo(0, -1, 1)).toBe(0)
  })

  it('brings one picked further along the strip in from the right, one picked before it from the left', () => {
    expect(directionOf(1, 4)).toBe(1)
    expect(directionOf(4, 1)).toBe(-1)
  })
})

describe('the shown Pokémon, alive', () => {
  it('never does the same act twice in a row, whatever the numbers', () => {
    for (const last of ACTS) {
      for (const drawn of [0, 0.2, 0.5, 0.8, 0.9999]) expect(nextAct(numbers(drawn), last)).not.toBe(last)
    }
  })

  it('can do every act', () => {
    const done = new Set(Array.from({ length: 60 }, (_, nth) => nextAct(numbers(nth / 60), undefined)))
    expect([...done].sort()).toEqual([...ACTS].sort())
  })

  it('ends every act standing at rest, its frames in order', () => {
    for (const act of ACTS) {
      const frames = framesOf(act)
      const last = frames[frames.length - 1]
      expect(last && { view: last.view, mirrored: last.mirrored, lift: last.lift }).toEqual(AT_REST)
      expect(frames.every((frame, nth) => nth === 0 || frame.after >= (frames[nth - 1]?.after ?? 0))).toBe(true)
    }
  })

  it('hops in whole pixels, never higher than a hop', () => {
    const lifts = ACTS.flatMap((act) => framesOf(act).map((frame) => frame.lift))
    expect(lifts.every((lift) => Number.isInteger(lift) && lift >= 0 && lift <= SHOWCASE.hopHeight)).toBe(true)
  })

  it('turns round in a turn and a spin, and looks the other way in a look and a glance', () => {
    expect(framesOf('turn').some((frame) => frame.view === 'back')).toBe(true)
    expect(framesOf('spin').some((frame) => frame.view === 'back' && frame.mirrored)).toBe(true)
    expect(framesOf('look').some((frame) => frame.mirrored)).toBe(true)
    expect(framesOf('glance').filter((frame) => frame.mirrored)).toHaveLength(2)
  })

  it('rests between its least and its most', () => {
    expect(restOf(numbers(0))).toBe(SHOWCASE.rest[0])
    expect(restOf(numbers(1))).toBe(SHOWCASE.rest[1])
  })
})

describe('how one leaves and comes', () => {
  it('breaks up as a ghost when dead, whatever it is', () => {
    expect(passageOf(true, ['Normal', 'Flying'])).toBe('ghost')
  })

  it('flies when it is of the Flying type, hops otherwise', () => {
    expect(passageOf(false, ['Fire', 'Flying'])).toBe('fly')
    expect(passageOf(false, ['Electric'])).toBe('hop')
  })
})

describe('the ground it stands on', () => {
  it('is its first type’s', () => {
    expect(groundTypeOf(false, ['Water', 'Flying'])).toBe('Water')
  })

  it('is the Ghost type’s for a dead one, whatever it was', () => {
    expect(groundTypeOf(true, ['Water', 'Flying'])).toBe('Ghost')
  })
})

describe('the size of the shown Pokémon', () => {
  const room = { width: 100, height: 80 }

  it('is a DS pixel to a pixel of the sprite when it fits, on whole device pixels', () => {
    const pixel = showcasePixel({ width: 50, height: 50 }, room, 1.25, 3)
    expect(pixel * 3).toBe(Math.round(1.25 * 3))
  })

  it('is smaller, by whole device pixels, for a sprite that would not fit', () => {
    for (const ratio of [2, 3]) {
      const pixel = showcasePixel({ width: 70, height: 70 }, room, 1.25, ratio)
      expect(Number.isInteger(pixel * ratio)).toBe(true)
      expect(pixel).toBeLessThan(1.25)
      expect(70 * pixel).toBeLessThanOrEqual(room.height)
    }
  })

  it('is never under one device pixel, even where nothing fits', () => {
    expect(showcasePixel({ width: 500, height: 500 }, room, 1.25, 2)).toBe(0.5)
  })
})

describe('sliding the shown Pokémon', () => {
  it('becomes a slide once it has moved a little, more across than up or down', () => {
    expect(isSliding(SHOWCASE.slideStarts, 0)).toBe(true)
    expect(isSliding(SHOWCASE.slideStarts - 1, 0)).toBe(false)
    expect(isSliding(10, 12)).toBe(false)
  })

  it('shows the next one when let go far enough to the left, the one before far enough to the right', () => {
    expect(slidTo(-SHOWCASE.swipe, 0)).toBe(1)
    expect(slidTo(SHOWCASE.swipe, 0)).toBe(-1)
  })

  it('springs back when let go too near, or after moving more up and down than across', () => {
    expect(slidTo(SHOWCASE.swipe - 1, 0)).toBe(0)
    expect(slidTo(-30, 40)).toBe(0)
  })
})
