import { useEffect, useState } from 'react'

/** A fight's timer as it was told: whether it is counting down, and the milliseconds left at that moment. */
interface ToldTimer {
  running: boolean
  left: number
}

/** The milliseconds left on the timer: what the fight said, counted down here while it runs. */
export function useCountdown(timer: ToldTimer): number {
  const [ticked, setTicked] = useState<{ timer: ToldTimer; left: number }>()
  useEffect(() => {
    if (!timer.running) return
    const start = Date.now()
    const interval = setInterval(() => {
      setTicked({ timer, left: Math.max(0, timer.left - (Date.now() - start)) })
    }, 250)
    return () => {
      clearInterval(interval)
    }
  }, [timer])
  return ticked?.timer === timer ? ticked.left : timer.left
}
