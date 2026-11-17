import { AnimatePresence, MotionConfig, type Variants, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ScrollingText, TypeLabel } from '../../ui'
import { DURATION, EASE, SCREEN } from '../../ui/motion'

/** What the card tells: a character, or a sentence where there is none to tell of (none kept, one that cannot be read). */
export type CardFace =
  | {
      kind: 'character'
      level: number
      name: string
      species: string
      /** Its types: the English name picks the colour, the word is in the app's language. */
      types: readonly { type: string; text: string }[]
      campaign: string
      /** Said in words on a dark plate beside its name, as on its sheet (decision 104). */
      dead?: string | undefined
    }
  | { kind: 'said'; text: string }

export interface CharacterCardProps {
  /** What tells this face from the next: another one slides in. */
  id: string
  face: CardFace
  /** The side the next face comes in from: 1 the right, -1 the left. */
  direction: 1 | -1
  /** The word before the level: Lv. or N. */
  levelLabel: string
  /** Nothing moves by itself: a campaign too long for its plate is cut, not going by. */
  still: boolean
}

/**
 * Each line goes out by the side away from where the next character comes in,
 * then the next one's lines come in from that side, one after the other, as a
 * screen's pieces do: the old lines are gone before the new ones come.
 */
const LINE: Variants = {
  away: (direction: number) => ({ x: `${direction * 110}%` }),
  here: { x: 0, transition: { duration: DURATION.move, ease: EASE.out } },
  gone: (direction: number) => ({ x: `${-direction * 110}%`, transition: { duration: DURATION.quick, ease: EASE.in } }),
}

const LINES: Variants = {
  here: { transition: { delayChildren: DURATION.quick, staggerChildren: SCREEN.piece } },
  gone: { transition: { staggerChildren: SCREEN.pieceOut } },
}

/**
 * What is told of the character shown (decision 241), as a small sheet in a
 * game's text box: its name on a band, as on a summary screen, then its
 * level and its species, its types each half the width, and its campaign
 * across the whole width, going by inside its plate when it is too long for
 * it (decision 254). Another character shown, the
 * lines go out by one side and the next one's come in from the other, line
 * after line, as a screen's pieces do. With reduced motion they change at
 * once. What it says is read out when it changes.
 */
export function CharacterCard({ id, face, direction, levelLabel, still }: CharacterCardProps) {
  const lines: readonly { line: string; shows: ReactNode }[] =
    face.kind === 'said'
      ? [{ line: 'said', shows: <p className="dn-summary__said">{face.text}</p> }]
      : [
          {
            line: 'name',
            shows: (
              <p className="dn-summary__head dn-text-shadow">
                <span className="dn-summary__name">{face.name}</span>
                {face.dead && <span className="dn-status dn-summary__dead">{face.dead}</span>}
              </p>
            ),
          },
          {
            line: 'level',
            shows: (
              <p className="dn-summary__line dn-summary__line--apart">
                <span>
                  {levelLabel} {face.level}
                </span>
                <span>{face.species}</span>
              </p>
            ),
          },
          {
            line: 'types',
            shows: (
              <p className="dn-summary__types">
                {face.types.map(({ type, text }) => (
                  <TypeLabel key={type} type={type} text={text} />
                ))}
              </p>
            ),
          },
          {
            line: 'campaign',
            shows: (
              <p className="dn-summary__line">
                <span className="dn-summary__campaign">
                  <ScrollingText text={face.campaign} still={still} />
                </span>
              </p>
            ),
          },
        ]
  return (
    <div className="dn-panel dn-panel--light dn-summary" aria-live="polite">
      <MotionConfig reducedMotion="user">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div key={id} className="dn-summary__lines" variants={LINES} initial="away" animate="here" exit="gone" custom={direction}>
            {lines.map(({ line, shows }) => (
              <motion.div key={line} variants={LINE} custom={direction}>
                {shows}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
    </div>
  )
}
