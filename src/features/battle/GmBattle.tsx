import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { CharacterDocument } from '../../shared/schema/character'
import { Battle } from './Battle'
import type { FightCommand, TableView } from './fight'
import { type SeatAsk, playedByGm, toCommand } from './seat'

export interface GmBattleProps {
  pack: DataPack
  /** The whole table, as only the game master sees it. */
  table: TableView
  /** The characters in the fight: their names, levels and builds. */
  party: readonly CharacterDocument[]
  /** The characters whose player is away right now: the game master may choose for them (decision 16). */
  away: readonly string[]
  /** Carries a command out, and gives back why it changed nothing when it did not. */
  onCommand: (command: FightCommand) => string | undefined
  /** Opens the end of the encounter: its rewards, then its end (decision 136). */
  onEnd: () => void
  /** Goes to the rest of the session, and what that way is called. */
  onSession: () => void
  sessionLabel: string
  /** How long the relay took to answer the last check of the game master's line, in milliseconds. */
  latency?: number | undefined
}

/**
 * A fight at the game master's seat (decision 250): the players' two screens
 * (`Battle`), mirrored, with the enemies to play and TOOLS. What the game
 * master asks is a command, carried out at once on this very device, which is
 * the fight's one authority: a refusal is known as soon as it is asked.
 */
export function GmBattle({ pack, table, party, away, onCommand, onEnd, onSession, sessionLabel, latency }: GmBattleProps) {
  // The last command's refusal, for the round it was given in: said until the next command.
  const [last, setLast] = useState<{ round: number; refused: boolean }>({ round: table.round, refused: false })
  const carry = (command: FightCommand): boolean => {
    const refused = onCommand(command) !== undefined
    setLast({ round: table.round, refused })
    return refused
  }
  return (
    <Battle
      pack={pack}
      fight={table}
      party={party}
      seat={{ role: 'gm', table, away, onCommand: carry, onEnd, onSession, sessionLabel }}
      playable={playedByGm(table.combatants, away)}
      onAsk={(who: string, what: SeatAsk) => carry(toCommand(what, who))}
      pending={false}
      refused={last.round === table.round && last.refused}
      latency={latency}
    />
  )
}
