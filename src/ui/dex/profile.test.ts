import { describe, expect, it } from 'vitest'
import { cornerPoint, polygonOf, shapePoints } from './profile'

describe('the corners of the profile graph', () => {
  it('start at the top and go round clockwise', () => {
    const top = cornerPoint(0, 6, 1)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-1)
    // Of six, the second is up and to the right, the fourth straight down.
    expect(cornerPoint(1, 6, 1).x).toBeGreaterThan(0)
    expect(cornerPoint(1, 6, 1).y).toBeLessThan(0)
    expect(cornerPoint(3, 6, 1).y).toBeCloseTo(1)
  })

  it('are as far out as the stat is up its scale, the rim at its top', () => {
    const points = shapePoints([1, 0.2, 0.2, 0.5, 0.2, 0.2])
    expect(points[0]?.y).toBeCloseTo(-1)
    expect(points[3]?.y).toBeCloseTo(0.5)
  })

  it('never close to a dot, nor pass the rim', () => {
    const points = shapePoints([4, 0, 0, 0, 0, 0])
    expect(points[0]?.y).toBeCloseTo(-1)
    expect(Math.hypot(points[1]?.x ?? 0, points[1]?.y ?? 0)).toBeCloseTo(0.04)
  })

  it('are written for a drawing with the graph’s middle at its own', () => {
    expect(polygonOf([{ x: 0, y: -1 }, { x: 1, y: 0 }], 40)).toBe('40.00,0.00 80.00,40.00')
  })
})
