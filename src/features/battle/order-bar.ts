/**
 * The order of a round as the command screen shows it (decision 248): one bar
 * for each line, the Pokémon of that line in the order they would act, then
 * those of it that do not act this round. A rank is a Pokémon's place in the
 * order it is given: the party's own for a player (decision 18), everyone's
 * for the game master, so that the two bars read as one order.
 */
import type { LineSide } from '../../game-rules/reach'
import type { FieldState } from '../../ui'
import type { Fighter } from './fighters'

export interface OrderEntry {
  id: string
  /** Its place in the round's order, from 1; nothing for one that does not act this round. */
  rank: number | undefined
  name: string
  /** Its place on its line. */
  letter: string
  /** National Pokédex number, for its icon. */
  num: number
  state: FieldState
  /** It has locked its action. */
  locked: boolean
  /** It is the one being played from this screen. */
  current: boolean
  /** This screen may play it. */
  playable: boolean
  /** Its player is away. */
  away: boolean
}

export interface OrderBars {
  /** The line in the foreground: the party's for a player, the enemies' for the game master. */
  near: OrderEntry[]
  /** The line facing it. */
  far: OrderEntry[]
}

export interface OrderSeat {
  near: LineSide
  /** The Pokémon being played. */
  actor?: string | undefined
  /** Those this screen may play. */
  playable: ReadonlySet<string>
  /** Those who have locked, as far as this screen is told. */
  locked: ReadonlySet<string>
  /** The Pokémon whose player is away. */
  away?: ReadonlySet<string>
}

export function orderBars(order: readonly string[], fighters: readonly Fighter[], seat: OrderSeat): OrderBars {
  const entry = (fighter: Fighter): OrderEntry => {
    const place = order.indexOf(fighter.id)
    return {
      id: fighter.id,
      rank: place < 0 ? undefined : place + 1,
      name: fighter.name,
      letter: fighter.letter,
      num: fighter.species?.num ?? 0,
      state: fighter.state,
      locked: seat.locked.has(fighter.id),
      current: fighter.id === seat.actor,
      playable: seat.playable.has(fighter.id),
      away: seat.away?.has(fighter.id) ?? false,
    }
  }
  const bar = (side: LineSide): OrderEntry[] => {
    const line = fighters.filter((fighter) => fighter.side === side && fighter.state !== 'gone')
    const acting = order.flatMap((id) => line.find((fighter) => fighter.id === id) ?? [])
    const resting = line.filter((fighter) => !order.includes(fighter.id)).sort((a, b) => a.position - b.position)
    return [...acting, ...resting].map(entry)
  }
  return { near: bar(seat.near), far: bar(seat.near === 'players' ? 'enemies' : 'players') }
}
