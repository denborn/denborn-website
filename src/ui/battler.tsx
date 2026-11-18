import { MotionConfig, motion, useAnimate } from 'motion/react'
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { battleSpriteUrl } from '../data/sprites'
import type { SpeciesData } from '../data/types'
import { useDsUnit, usePixelScale } from './Screen'
import { centreShift } from './footprint'
import { DURATION, EASE, HOLD } from './motion'
import { usePrefersReducedMotion } from './reduced-motion'
import { useSpriteFeet } from './sprite-shadow'
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

/** What a step of a round has a Pokémon do. */
export interface BattlerCue {
  /** `attack`: it uses a move, the short lunge. `hit`: it takes one, the blink. */
  move: 'attack' | 'hit'
  /** Which step of which round this is: the same move at another beat plays again. */
  beat: string
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
  /** What the step being told has it do. It plays it itself, as soon as it is there: a screen need not hold on to it for that. */
  cue?: BattlerCue | undefined
  ref?: Ref<BattlerHandle>
}

/**
 * A Pokémon on the field. It stands on the middle of its feet, not of its
 * picture (decision 257): where it is put is where the middle of its feet
 * is, so a tail or a wing to one side does not push it off its ground. It
 * slides in from its own side, sinks and greys when downed, and drops out of
 * sight when gone. Motion here only shows what the battle already decided;
 * it never decides anything.
 */
export function Battler({ species, name, side, female = false, pose = 'standing', scale = 1, enterFrom = 'side', cue, ref }: BattlerProps) {
  const unit = useDsUnit()
  const reduced = usePrefersReducedMotion()
  const [body, animate] = useAnimate<HTMLDivElement>()
  const toward = side === 'player' ? 1 : -1
  const entry = enterFrom === 'side' ? -toward : enterFrom === 'left' ? -1 : 1
  // Where its feet are on its picture, read from the picture itself as the list of characters reads it: until it is read, it stands on the picture's middle.
  const back = side === 'player'
  const pixel = usePixelScale(scale)
  const feet = useSpriteFeet(species, { back, female })
  // MissingNo., which stands in for a sprite that is not there, is drawn the other way round when seen from behind.
  const mirrored = back && battleSpriteUrl(species, { back, female }) === undefined
  const aside = feet ? centreShift(feet.feet, feet.width, mirrored) * pixel : 0

  const moves = useMemo<BattlerHandle>(
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
  useImperativeHandle(ref, () => moves, [moves])

  // A beat's cue is played once, when it comes: not again because the screen was drawn anew.
  const played = useRef<string>(undefined)
  const move = cue?.move
  const beat = cue?.beat
  useEffect(() => {
    if (!move || played.current === beat) return
    played.current = beat
    void (move === 'attack' ? moves.attack() : moves.hit())
  }, [move, beat, moves])

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
          style={{ left: aside }}
          initial={false}
          animate={poses[pose]}
          transition={{ duration: pose === 'standing' ? DURATION.move : DURATION.slow, ease: pose === 'standing' ? EASE.snap : EASE.in }}
        >
          <PokemonSprite species={species} name={name} back={back} female={female} scale={scale} frozen={pose !== 'standing'} />
        </motion.div>
      </motion.div>
    </MotionConfig>
  )
}
