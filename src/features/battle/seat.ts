/**
 * Who sits at a fight's two screens, and what they may ask of it. A player
 * plays their own Pokémon and sends intents; the game master plays the
 * enemies, and the Pokémon of a player who is away (decision 16), and gives
 * commands. The screens are the same for both (decision 250): what differs is
 * here.
 *
 * Nothing in this module decides anything: the game master's side of the
 * session checks every ask (features/battle/fight.ts).
 */
import type { MoveChoice } from '../../battle/contract'
import type { LineSide } from '../../game-rules/reach'
import type { Intent } from '../../shared/protocol/battle'
import type { Ask, Choice, FightCommand } from './fight'

/** What a seat asks for the Pokémon it plays. */
export type SeatAsk =
  /** `extra` holds an enemy's extra moves for the round (decision 61): the game master's alone. */
  | { do: 'lock'; choice: Choice; extra?: readonly MoveChoice[] }
  | { do: 'unlock' }
  /** Run trades places, Switch exchanges Speed for the round. */
  | { do: 'run' | 'switch'; with: string }
  | { do: 'answer'; kind: Ask['kind']; from: string; accept: boolean }
  | { do: 'withdraw'; kind: Ask['kind'] }

/** A player's ask as the intent their device sends; nothing for what is not a player's to ask. */
export function toIntent(ask: SeatAsk): Intent | undefined {
  switch (ask.do) {
    case 'lock':
      // Struggle is never chosen, and extra moves are an enemy's.
      return ask.choice.do === 'struggle' || (ask.extra?.length ?? 0) > 0 ? undefined : { do: 'lock', choice: ask.choice }
    case 'unlock':
      return { do: 'unlock' }
    case 'run':
    case 'switch':
      return { do: ask.do, with: ask.with }
    case 'answer':
      return { do: 'answer', kind: ask.kind, from: ask.from, accept: ask.accept }
    case 'withdraw':
      return { do: 'withdraw', kind: ask.kind }
  }
}

/** The game master's ask as the command it is for `who`. */
export function toCommand(ask: SeatAsk, who: string): FightCommand {
  switch (ask.do) {
    case 'lock':
      return { do: 'lock', who, choice: ask.choice, extra: ask.extra ?? [] }
    case 'unlock':
      return { do: 'unlock', who }
    case 'run':
    case 'switch':
      return { do: ask.do, who, with: ask.with }
    case 'answer':
      return { do: 'answer', who, kind: ask.kind, from: ask.from, accept: ask.accept }
    case 'withdraw':
      return { do: 'withdraw', who, kind: ask.kind }
  }
}

/** The Pokémon the game master may play: every enemy still in the fight, and the Pokémon of each player who is away (decision 16). */
export function playedByGm(combatants: readonly { id: string; side: LineSide; dead: boolean }[], away: readonly string[]): string[] {
  return combatants.filter((combatant) => !combatant.dead && (combatant.side === 'enemies' || away.includes(combatant.id))).map((combatant) => combatant.id)
}

/**
 * Whom the game master plays next when nobody is picked: the first enemy, in
 * the order of the round, that still has to choose; with none left, nobody.
 */
export function nextToPlay(order: readonly string[], playable: readonly string[], toChoose: (id: string) => boolean): string | undefined {
  const waiting = playable.filter(toChoose)
  return order.find((id) => waiting.includes(id)) ?? waiting[0]
}

/** The line a seat sees in the foreground, from behind: its own. */
export const NEAR_LINE: Readonly<Record<'player' | 'gm', LineSide>> = { player: 'players', gm: 'enemies' }

/**
 * An enemy's extra moves for the round, as the game master lines them up
 * before the move that locks them (decisions 30 and 61).
 */
export type ExtrasChange = { do: 'add'; move: MoveChoice } | { do: 'removeLast' }

export function extrasStep(extras: readonly MoveChoice[], change: ExtrasChange): MoveChoice[] {
  return change.do === 'add' ? [...extras, change.move] : extras.slice(0, -1)
}
