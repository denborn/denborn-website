import { describe, expect, it } from 'vitest'
import { BATTERY_FROM, PING_UP_TO, batteryMark, batteryStatus, clockTime, pingLevel } from './device'

describe('what the strip tells of the device', () => {
  it('grades a ping by the time it took, and says when none is known', () => {
    expect(pingLevel(undefined)).toBe('none')
    expect(pingLevel(0)).toBe('good')
    expect(pingLevel(PING_UP_TO.good)).toBe('good')
    expect(pingLevel(PING_UP_TO.good + 1)).toBe('fair')
    expect(pingLevel(PING_UP_TO.fair)).toBe('fair')
    expect(pingLevel(PING_UP_TO.fair + 1)).toBe('poor')
  })

  it('reads the battery as a whole percentage', () => {
    expect(batteryStatus({ level: 0.874, charging: false })).toEqual({ percent: 87, charging: false })
    expect(batteryStatus({ level: 1, charging: true })).toEqual({ percent: 100, charging: true })
    // A browser that tells nonsense is not passed on.
    expect(batteryStatus({ level: 1.4, charging: false }).percent).toBe(100)
    expect(batteryStatus({ level: -1, charging: false }).percent).toBe(0)
  })

  it('shows the battery as the games’ full mark, their half-full one or their empty one', () => {
    expect(batteryMark(100)).toBe(0)
    expect(batteryMark(BATTERY_FROM.full)).toBe(0)
    expect(batteryMark(BATTERY_FROM.full - 1)).toBe(1)
    expect(batteryMark(BATTERY_FROM.half)).toBe(1)
    expect(batteryMark(BATTERY_FROM.half - 1)).toBe(2)
    expect(batteryMark(0)).toBe(2)
  })

  it('writes the time as the language does, and the same for a machine', () => {
    // A minute built from the device's own time zone, so that the test reads the same anywhere.
    const minute = Math.floor(new Date(2026, 10, 17, 14, 4).getTime() / 60_000)
    expect(clockTime(minute, 'fr')).toEqual({ text: '14:04', iso: '14:04' })
    expect(clockTime(minute, 'en').iso).toBe('14:04')
    expect(clockTime(minute, 'en').text).toMatch(/^2:04\sPM$/)
  })
})
