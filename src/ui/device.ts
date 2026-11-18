/**
 * What the strip across a fight's bottom screen tells of the device (decision
 * 249), as the games' touch screen does: the time, the battery where the
 * browser tells it, and how far the relay is. Each asks the browser itself,
 * as `usePrefersReducedMotion` does.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'

/** How good the line to the relay is, by the time a check of it takes to come back; `none` while that is not known. */
export type PingLevel = 'good' | 'fair' | 'poor' | 'none'

/** Up to how many milliseconds a ping is good, and fair; past that it is poor. Denborn's own figures. */
export const PING_UP_TO = { good: 120, fair: 300 } as const

export function pingLevel(milliseconds: number | undefined): PingLevel {
  if (milliseconds === undefined) return 'none'
  if (milliseconds <= PING_UP_TO.good) return 'good'
  return milliseconds <= PING_UP_TO.fair ? 'fair' : 'poor'
}

export interface BatteryStatus {
  /** How full it is, from 0 to 100. */
  percent: number
  charging: boolean
}

/** The part of the browser's battery the strip reads. Only some browsers have one: none on an iPhone. */
interface BatteryLike {
  level: number
  charging: boolean
  addEventListener(type: 'levelchange' | 'chargingchange', listener: () => void): void
  removeEventListener(type: 'levelchange' | 'chargingchange', listener: () => void): void
}

export function batteryStatus(battery: Pick<BatteryLike, 'level' | 'charging'>): BatteryStatus {
  return { percent: Math.round(Math.min(1, Math.max(0, battery.level)) * 100), charging: battery.charging }
}

/** From how full a battery shows as the games' full mark, and as their half-full one; under that it shows empty. Denborn's own figures. */
export const BATTERY_FROM = { full: 60, half: 25 } as const

/** Which of the games' three battery marks shows a battery this full: 0 the full one, 1 the half-full one, 2 the empty one. */
export function batteryMark(percent: number): 0 | 1 | 2 {
  if (percent >= BATTERY_FROM.full) return 0
  return percent >= BATTERY_FROM.half ? 1 : 2
}

/** The device's battery, kept up to date; nothing where the browser does not tell. */
export function useBattery(): BatteryStatus | undefined {
  const [status, setStatus] = useState<BatteryStatus>()
  useEffect(() => {
    // TypeScript's own description of a browser leaves the battery out: it is asked for by name, and may not be there.
    const told: Navigator & { getBattery?: () => Promise<BatteryLike> } = navigator
    if (typeof told.getBattery !== 'function') return
    let battery: BatteryLike | undefined
    let gone = false
    const read = (): void => {
      if (battery) setStatus(batteryStatus(battery))
    }
    told
      .getBattery()
      .then((found) => {
        if (gone) return
        battery = found
        found.addEventListener('levelchange', read)
        found.addEventListener('chargingchange', read)
        read()
      })
      // A browser may have the battery and keep it to itself (a page inside another, a policy): then there is none to show.
      .catch(() => undefined)
    return () => {
      gone = true
      battery?.removeEventListener('levelchange', read)
      battery?.removeEventListener('chargingchange', read)
    }
  }, [])
  return status
}

const MINUTE_MS = 60_000

/** Tells when the minute changes, and when the page comes back into view: a hidden page's timers run late. */
function eachMinute(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>
  const wait = (): void => {
    timer = setTimeout(() => {
      onChange()
      wait()
    }, MINUTE_MS - (Date.now() % MINUTE_MS))
  }
  wait()
  document.addEventListener('visibilitychange', onChange)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onChange)
  }
}

const thisMinute = (): number => Math.floor(Date.now() / MINUTE_MS)

export interface ClockTime {
  /** The time as the language writes it: 2:44 PM, 14:44. */
  text: string
  /** The same for a machine: 14:44. */
  iso: string
}

/** The time at `minute`, a count of minutes since 1970, in the device's own time zone. */
export function clockTime(minute: number, language: string): ClockTime {
  const date = new Date(minute * MINUTE_MS)
  const two = (value: number): string => String(value).padStart(2, '0')
  return { text: new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(date), iso: `${two(date.getHours())}:${two(date.getMinutes())}` }
}

/** The device's time, to the minute, kept up to date. */
export function useClock(language: string): ClockTime {
  return clockTime(useSyncExternalStore(eachMinute, thisMinute), language)
}
