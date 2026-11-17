import { describe, expect, it } from 'vitest'
import { awayOf, showsIn } from './screen-motion'

/** A screen 400 wide and 300 high, 50 from the left of the page and 100 from its top. */
const screen = { left: 50, right: 450, top: 100, bottom: 400 }

describe('where a piece waits while it is out of the screen', () => {
  const row = { left: 60, right: 440, top: 200, bottom: 240 }

  it('a row is out by the side it is told, far enough for none of it to show', () => {
    expect(awayOf(row, screen, 1, false)).toEqual({ x: 390, y: 0 })
    expect(row.left + awayOf(row, screen, 1, false).x).toBe(screen.right)
    expect(row.right + awayOf(row, screen, -1, false).x).toBe(screen.left)
  })

  it('a button is out by the side it is nearest to, whichever side the rows go by', () => {
    const onTheLeft = { left: 60, right: 160, top: 350, bottom: 394 }
    const onTheRight = { left: 340, right: 440, top: 350, bottom: 394 }
    for (const side of [1, -1] as const) {
      expect(onTheLeft.right + awayOf(onTheLeft, screen, side, false).x).toBe(screen.left)
      expect(onTheRight.left + awayOf(onTheRight, screen, side, false).x).toBe(screen.right)
    }
  })

  it('a narrow piece in the very middle goes by the side the rows go by', () => {
    const middle = { left: 200, right: 300, top: 200, bottom: 240 }
    expect(awayOf(middle, screen, 1, false).x).toBeGreaterThan(0)
    expect(awayOf(middle, screen, -1, false).x).toBeLessThan(0)
  })

  it('a title is out over the top edge, straight up', () => {
    const title = { left: 50, right: 450, top: 100, bottom: 130 }
    expect(awayOf(title, screen, 1, true)).toEqual({ x: 0, y: -30 })
    // Lower down, it still clears the edge.
    expect(awayOf({ ...title, top: 150, bottom: 180 }, screen, -1, true)).toEqual({ x: 0, y: -80 })
  })
})

describe('which pieces move', () => {
  it('one that shows in the screen, even in part', () => {
    expect(showsIn({ left: 60, right: 440, top: 380, bottom: 420 }, screen)).toBe(true)
  })

  it('not one scrolled out of the screen, nor one that takes no room', () => {
    expect(showsIn({ left: 60, right: 440, top: 400, bottom: 440 }, screen)).toBe(false)
    expect(showsIn({ left: 60, right: 440, top: 40, bottom: 100 }, screen)).toBe(false)
    expect(showsIn({ left: 60, right: 60, top: 200, bottom: 240 }, screen)).toBe(false)
  })
})
