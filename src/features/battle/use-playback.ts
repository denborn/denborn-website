import { useEffect, useMemo, useState } from 'react'
import type { PlayerFight } from '../../shared/protocol/battle'
import { type RoundScript, type Step, roundScript } from './round-script'

/** How long each step of a round stays, by the text speed chosen in the Options (decision 155). */
export interface Pace {
  /** A step that says something. */
  saidMs: number
  /** A step that only moves something. */
  quietMs: number
}

export interface Playback {
  script: RoundScript
  /** How many steps have been told; the one being told is the next. */
  told: number
  /** True while steps are left to tell. */
  playing: boolean
  /** The step being told. */
  step: Step | undefined
  /** Goes on to the next step now. */
  advance: () => void
  /** Goes straight to the round's end. */
  skip: () => void
}

/**
 * The round that was just played, told step by step before its result shows
 * (decisions 91 and 155). A fight met in its course is shown as it stands; one
 * that begins tells what happened as the Pokémon entered. Each step stays for
 * as long as the pace says, unless it is advanced or skipped.
 */
export function usePlayback(last: PlayerFight['last'], say: (key: string) => string | undefined, pace: Pace): Playback {
  const script = useMemo(() => roundScript(last, say), [last, say])
  const [heard, setHeard] = useState(() => ({ round: last.round, steps: last.round === 0 ? 0 : Number.MAX_SAFE_INTEGER }))
  const told = heard.round === last.round ? heard.steps : 0
  const playing = told < script.steps.length
  const step = playing ? script.steps[told] : undefined

  useEffect(() => {
    if (!step) return
    const next = setTimeout(
      () => {
        setHeard({ round: last.round, steps: told + 1 })
      },
      // An Ability's band only has to slide in: the sentence that follows is what is read.
      step.said && step.said.key !== 'ability' ? pace.saidMs : pace.quietMs,
    )
    return () => {
      clearTimeout(next)
    }
  }, [step, told, last.round, pace])

  return {
    script,
    told,
    playing,
    step,
    advance: () => {
      setHeard({ round: last.round, steps: told + 1 })
    },
    skip: () => {
      setHeard({ round: last.round, steps: script.steps.length })
    },
  }
}
