import { MotionConfig, motion } from 'motion/react'
import { DURATION, EASE } from './motion'
import { PokemonIcon } from './sprites'

export interface OrderBarEntry {
  id: string
  /** Its place in the round's order, from 1; nothing for one whose order is not told, or that does not act this round. */
  rank?: number | undefined
  /** The letter of its place on its line: written on one that has no rank. */
  letter?: string | undefined
  /** National Pokédex number, for its icon. */
  num: number
  /** Said of it: its rank or its place, its name, and whatever else is worth saying. */
  label: string
  /** It has locked its action: a tick. */
  locked?: boolean
  /** The one being played. */
  current?: boolean
  /** The one of its line that is on the scene. */
  shown?: boolean
  /** Downed: it stands greyed. */
  down?: boolean
  /** It cannot be picked. */
  disabled?: boolean
}

export interface OrderBarProps {
  entries: readonly OrderBarEntry[]
  /** What the bar is, read out. */
  label: string
  /** Given when each Pokémon can be picked: the bar is then a row of buttons. */
  onPick?: ((id: string) => void) | undefined
}

/**
 * A line of a fight on the command screen (decisions 248 and 272), where the
 * games line up Poké Balls: each Pokémon's icon, with its rank in the
 * round's order and a small arrow to the one that acts after it, or, for a
 * line whose order is not told, the letter of its place; a tick on who has
 * locked; a gold frame on the one being played and a light one on the one
 * the scene shows. A press on a Pokémon picks it: the scene then shows it. A
 * Pokémon whose rank changes slides to its new place. Denborn's own.
 */
export function OrderBar({ entries, label, onPick }: OrderBarProps) {
  const ranked = entries.filter((entry) => entry.rank !== undefined).length
  const row = entries.map((entry, index) => {
    const classes = ['dn-orderbar__entry']
    if (entry.shown) classes.push('dn-orderbar__entry--shown')
    if (entry.current) classes.push('dn-orderbar__entry--current')
    if (entry.down) classes.push('dn-orderbar__entry--down')
    // An arrow points from each Pokémon that acts to the one that acts next.
    if (index < ranked - 1) classes.push('dn-orderbar__entry--before')
    const drawn = (
      <>
        {(entry.rank ?? entry.letter) !== undefined && <span className="dn-orderbar__rank dn-text-outline">{entry.rank ?? entry.letter}</span>}
        <PokemonIcon num={entry.num} scale={0.5} />
        {entry.locked && <span className="dn-tick dn-orderbar__tick" />}
      </>
    )
    const moving = { layout: 'position' as const, transition: { duration: DURATION.move, ease: EASE.out } }
    return onPick ? (
      <motion.button key={entry.id} type="button" className={classes.join(' ')} aria-pressed={entry.shown ?? false} aria-label={entry.label} disabled={entry.disabled} onClick={() => onPick(entry.id)} {...moving}>
        {drawn}
      </motion.button>
    ) : (
      <motion.span key={entry.id} className={classes.join(' ')} {...moving}>
        {drawn}
      </motion.span>
    )
  })
  return (
    <MotionConfig reducedMotion="user">
      {onPick ? (
        <div className="dn-orderbar" role="group" aria-label={label}>
          {row}
        </div>
      ) : (
        <div className="dn-orderbar" role="img" aria-label={label}>
          {row}
        </div>
      )}
    </MotionConfig>
  )
}
