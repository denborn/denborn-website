import { describe, expect, it } from 'vitest'
import { type WheelSize, jumpBefore, nearestRow, poseOf, reachOf, rowAt, rowByKey, rowByName, rowOnRail, rowsDrawn, thumbOf, turnOf } from './wheel-math'

/** The wheel of species: 142 DS pixels tall, a row of 26. */
const SIZE: WheelSize = { height: 142, row: 26 }

describe('a row on the wheel', () => {
  it('is whole and bright in the middle', () => {
    expect(poseOf(0, SIZE)).toEqual({ y: 0, scaleX: 1, scaleY: 1, opacity: 1, shown: true })
  })

  it('gets shorter, smaller and fainter the further it is from the middle, the same above and below', () => {
    const poses = [1, 2, 3].map((rows) => poseOf(rows, SIZE))
    for (const [index, pose] of poses.entries()) {
      const nearer = index === 0 ? poseOf(0, SIZE) : poses[index - 1]
      if (!nearer) throw new Error('no nearer row')
      expect(pose.scaleY).toBeLessThan(nearer.scaleY)
      expect(pose.scaleX).toBeLessThan(nearer.scaleX)
      expect(pose.opacity).toBeLessThan(nearer.opacity)
      expect(pose.y).toBeGreaterThan(nearer.y)
    }
    const above = poseOf(-2, SIZE)
    const below = poseOf(2, SIZE)
    expect(above.y).toBeCloseTo(-below.y)
    expect(above.scaleY).toBeCloseTo(below.scaleY)
  })

  it('never overlaps the next: each ends before the next begins', () => {
    for (let rows = 0; rows < reachOf(SIZE); rows++) {
      const one = poseOf(rows, SIZE)
      const next = poseOf(rows + 1, SIZE)
      expect(one.y + (one.scaleY * SIZE.row) / 2).toBeLessThanOrEqual(next.y - (next.scaleY * SIZE.row) / 2)
    }
  })

  it('is a sliver at the wheel’s edge, its middle still inside, and is gone once over it', () => {
    const last = poseOf(reachOf(SIZE), SIZE)
    expect(last.shown).toBe(true)
    expect(last.y).toBeLessThan(SIZE.height / 2)
    expect(last.scaleY * SIZE.row).toBeLessThan(3)
    expect(poseOf(reachOf(SIZE) + 1, SIZE)).toMatchObject({ shown: false, opacity: 0 })
  })
})

describe('the row under a point of the wheel', () => {
  it('is the one in the middle at the middle, and its neighbours where they are drawn', () => {
    expect(rowAt(0, 10, 151, SIZE)).toBe(10)
    expect(rowAt(poseOf(1, SIZE).y, 10, 151, SIZE)).toBe(11)
    expect(rowAt(poseOf(-2, SIZE).y, 10, 151, SIZE)).toBe(8)
  })

  it('follows the wheel as it turns: half a row on, the middle is between two rows', () => {
    // Turned by half a row, the rows 10 and 11 are each half a row from the middle.
    expect(rowAt(poseOf(-0.5, SIZE).y, 10.5, 151, SIZE)).toBe(10)
    expect(rowAt(poseOf(0.5, SIZE).y, 10.5, 151, SIZE)).toBe(11)
  })

  it('is none past the ends of the list, nor off the wheel', () => {
    expect(rowAt(poseOf(-1, SIZE).y, 0, 151, SIZE)).toBeUndefined()
    expect(rowAt(poseOf(1, SIZE).y, 150, 151, SIZE)).toBeUndefined()
    expect(rowAt(SIZE.height, 10, 151, SIZE)).toBeUndefined()
    expect(rowAt(0, 0, 0, SIZE)).toBeUndefined()
  })
})

describe('the rows a wheel draws', () => {
  it('are those that show and one more each way, cut at the ends of the list', () => {
    expect(reachOf(SIZE)).toBe(4)
    expect(rowsDrawn(75, 151, SIZE)).toEqual({ first: 70, last: 80 })
    expect(rowsDrawn(1, 151, SIZE)).toEqual({ first: 0, last: 6 })
    expect(rowsDrawn(150, 151, SIZE)).toEqual({ first: 145, last: 150 })
    expect(rowsDrawn(0, 2, SIZE)).toEqual({ first: 0, last: 1 })
  })
})

describe('how far a wheel has turned', () => {
  it('is how far it has scrolled, in rows, never past its ends', () => {
    expect(turnOf(65, 26, 151)).toBe(2.5)
    expect(turnOf(-30, 26, 151)).toBe(0)
    expect(turnOf(99_999, 26, 151)).toBe(150)
    expect(turnOf(40, 26, 0)).toBe(0)
  })

  it('names the row nearest the middle', () => {
    expect(nearestRow(26 * 3 + 12, 26, 151)).toBe(3)
    expect(nearestRow(26 * 3 + 14, 26, 151)).toBe(4)
  })
})

describe('the keys on a wheel', () => {
  it('go by one row, by a wheel’s worth, and to the ends, never past them', () => {
    expect(rowByKey('ArrowDown', 10, 151, SIZE)).toBe(11)
    expect(rowByKey('ArrowUp', 0, 151, SIZE)).toBe(0)
    expect(rowByKey('PageDown', 10, 151, SIZE)).toBe(19)
    expect(rowByKey('PageUp', 3, 151, SIZE)).toBe(0)
    expect(rowByKey('Home', 77, 151, SIZE)).toBe(0)
    expect(rowByKey('End', 77, 151, SIZE)).toBe(150)
  })

  it('leave any other key alone, and an empty wheel too', () => {
    expect(rowByKey('a', 10, 151, SIZE)).toBeUndefined()
    expect(rowByKey('ArrowDown', 0, 0, SIZE)).toBeUndefined()
  })
})

describe('a name typed on a wheel', () => {
  const names = ['abra', 'bulbasaur', 'butterfree', 'caterpie', 'beedrill']

  it('goes to the next name that starts with the letter, round the list', () => {
    expect(rowByName(names, 0, 'b')).toBe(1)
    expect(rowByName(names, 1, 'b')).toBe(2)
    expect(rowByName(names, 4, 'b')).toBe(1)
  })

  it('stays on a name that still answers as more letters come', () => {
    expect(rowByName(names, 1, 'bu')).toBe(1)
    expect(rowByName(names, 1, 'but')).toBe(2)
  })

  it('goes nowhere when no name answers, or nothing is typed', () => {
    expect(rowByName(names, 0, 'z')).toBeUndefined()
    expect(rowByName(names, 0, '')).toBeUndefined()
    expect(rowByName([], 0, 'a')).toBeUndefined()
  })
})

describe('the rail beside a wheel', () => {
  it('has a thumb as long as the share of the list that shows, never too short to take hold of', () => {
    expect(thumbOf(0, 18, SIZE).length).toBeCloseTo(0.5)
    expect(thumbOf(0, 1025, SIZE).length).toBe(0.12)
    // A list that shows whole has nothing to slide.
    expect(thumbOf(0, 9, SIZE)).toEqual({ start: 0, length: 1 })
  })

  it('has its thumb at the top for the first row and at the bottom for the last', () => {
    expect(thumbOf(0, 151, SIZE).start).toBe(0)
    const end = thumbOf(150, 151, SIZE)
    expect(end.start + end.length).toBeCloseTo(1)
  })

  it('stands for a row at each point, the ends included', () => {
    expect(rowOnRail(0, 151)).toBe(0)
    expect(rowOnRail(0.5, 151)).toBe(75)
    expect(rowOnRail(1.3, 151)).toBe(150)
    expect(rowOnRail(0.5, 0)).toBe(0)
  })
})

describe('going to a far row', () => {
  it('jumps to a few rows short of it, on the side the wheel comes from', () => {
    expect(jumpBefore(3, 120, SIZE)).toBe(116)
    expect(jumpBefore(120, 3, SIZE)).toBe(7)
  })

  it('slides all the way when the row is near', () => {
    expect(jumpBefore(10, 18, SIZE)).toBeUndefined()
    expect(jumpBefore(10, 10, SIZE)).toBeUndefined()
  })
})
