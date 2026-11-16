import { MotionConfig, motion, useAnimate } from 'motion/react'
import { type Ref, useImperativeHandle } from 'react'
import type { SpeciesData } from '../data/types'
import { useDsUnit } from './Screen'
import { DURATION, EASE, HOLD } from './motion'
import { usePrefersReducedMotion } from './reduced-motion'
import { PokemonSprite } from './sprites'

/** `standing`: in the fight. `downed`: agonizing, still on the field. `gone`: out of the fight. */
export type BattlerPose = 'standing' | 'downed' | 'gone'

/** One-off moves, for the playback of a round. Each resolves when it has finished playing. */
export interface BattlerHandle {
  /** The blink of a Pokémon that takes a hit. */
  hit: () => Promise<void>
  /** The short lunge of a Pokémon that uses a move. */
  attack: () => Promise<void>
}

export interface BattlerProps {
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  name: string
  /** The player's side is seen from behind. */
  side: 'player' | 'foe'
  female?: boolean
  pose?: BattlerPose
  /** Size in DS pixels per sprite pixel. */
  scale?: number
  /** Where it slides in from: its own side of the field, or the side an arrow of its line was pressed on. */
  enterFrom?: 'side' | 'left' | 'right'
  ref?: Ref<BattlerHandle>
}

/**
 * A Pokémon on the field. It slides in from its own side, sinks and greys
 * when downed, and drops out of sight when gone. Motion here only shows what
 * the battle already decided; it never decides anything.
 */
export function Battler({ species, name, side, female = false, pose = 'standing', scale = 1, enterFrom = 'side', ref }: BattlerProps) {
  const unit = useDsUnit()
  const reduced = usePrefersReducedMotion()
  const [body, animate] = useAnimate<HTMLDivElement>()
  const toward = side === 'player' ? 1 : -1
  const entry = enterFrom === 'side' ? -toward : enterFrom === 'left' ? -1 : 1

  useImperativeHandle(
    ref,
    () => ({
      hit: async () => {
        // No blinking for anyone who asked for less motion: the HP bar and the message already tell.
        if (reduced) return
        await animate(body.current, { opacity: [1, 0, 1, 0, 1, 0, 1] }, { duration: 0.42, ease: HOLD })
      },
      attack: async () => {
        if (reduced) return
        await animate(
          body.current,
          { x: [0, 8 * unit * toward, 0], y: [0, -4 * unit * toward, 0] },
          { duration: DURATION.move, ease: EASE.out },
        )
      },
    }),
    [animate, body, reduced, toward, unit],
  )

  const poses = {
    standing: { y: 0, opacity: 1, filter: 'grayscale(0) brightness(1)' },
    downed: { y: 5 * unit, opacity: 1, filter: 'grayscale(0.85) brightness(0.6)' },
    gone: { y: 28 * unit, opacity: 0, filter: 'grayscale(0.85) brightness(0.6)' },
  }

  return (
    // Its slides and its poses follow the device's wish for less motion; set here, so that only the screens with a Pokémon on the field carry the animation library.
    <MotionConfig reducedMotion="user">
      <motion.div
        className="dn-battler"
        initial={{ x: 48 * unit * entry, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: DURATION.move, ease: EASE.out }}
      >
        <span className="dn-battler__base" />
        <motion.div
          ref={body}
          className="dn-battler__body"
          initial={false}
          animate={poses[pose]}
          transition={{ duration: pose === 'standing' ? DURATION.move : DURATION.slow, ease: pose === 'standing' ? EASE.snap : EASE.in }}
        >
          <PokemonSprite species={species} name={name} back={side === 'player'} female={female} scale={scale} frozen={pose !== 'standing'} />
        </motion.div>
      </motion.div>
    </MotionConfig>
  )
}
