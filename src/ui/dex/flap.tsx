import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { DURATION, HOLD } from '../motion'

export interface FlapProps {
  /** What tells one thing shown from the next: when it changes, the flap turns. */
  shown: string
  /** Laid out as a block of its own line, where it stands alone on one. */
  block?: boolean
  children: ReactNode
}

/** A turn of the flap, in the hard steps of a split-flap board: shut in three, open in three. */
const TURN = { duration: DURATION.quick / 2, ease: HOLD, times: [0, 0.34, 0.67, 1] }

/**
 * Something on the Pokédex's top screen that changes (decision 288): it does
 * not swap at once, it turns as a flap of a departure board does. What was
 * there shuts on its middle line, then what is there now opens from it. With
 * reduced motion it is replaced at once.
 */
export function Flap({ shown, block = false, children }: FlapProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={shown}
          className={`dn-flap${block ? ' dn-flap--block' : ''}`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 0.4, 0.75, 1], transition: TURN }}
          exit={{ scaleY: [1, 0.75, 0.4, 0], transition: TURN }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </MotionConfig>
  )
}
