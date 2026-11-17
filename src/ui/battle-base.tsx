import type { CSSProperties } from 'react'
import { BATTLE_BASES } from '../data/sprites'
import { usePixelScale } from './Screen'

export interface BattleBaseProps {
  /** Its row in the grounds' picture. */
  row: number
  /** DS pixels per pixel of the picture. */
  scale?: number
}

/** The round ground a line of Pokémon stands on (decision 242), on whole pixels of the device. */
export function BattleBase({ row, scale = 1 }: BattleBaseProps) {
  const pixel = usePixelScale(scale)
  const style: CSSProperties = {
    width: BATTLE_BASES.width * pixel,
    height: BATTLE_BASES.height * pixel,
    backgroundImage: `url(${BATTLE_BASES.url})`,
    backgroundSize: `${BATTLE_BASES.width * pixel}px auto`,
    backgroundPosition: `0 ${-row * BATTLE_BASES.height * pixel}px`,
    // Its middle, where feet stand, is at the place it is given: so far over its own bottom edge.
    marginBottom: -BATTLE_BASES.ground * pixel,
  }
  return <span className="dn-base" style={style} aria-hidden="true" />
}
