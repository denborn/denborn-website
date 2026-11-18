import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Intent, PlayerFight } from '../../shared/protocol/battle'
import type { CharacterDocument } from '../../shared/schema/character'
import { Battle } from './Battle'
import { type SeatAsk, toIntent } from './seat'

export interface BattleScreenProps {
  pack: DataPack
  /** The fight as the game master's side last told it. */
  fight: PlayerFight
  /** The party's characters: their names, levels and builds. */
  party: readonly CharacterDocument[]
  /** The viewer's own character. */
  me: string
  /** What became of the last intent that was answered. */
  answer?: { id: string; refused?: string } | undefined
  /** Said in the place of everything else while nothing can be asked: the connection dropped, the game master is away. */
  notice?: string | undefined
  /** How long the relay took to answer the last check of this device's line, in milliseconds. */
  latency?: number | undefined
  onIntent: (intent: Intent) => void
}

/**
 * A fight on a player's phone: the fight's two screens (`Battle`), from the
 * seat of the player of one character. What the player asks goes out as an
 * intent; nothing is taken for done before the game master's side answers,
 * and nothing more is asked meanwhile.
 */
export function BattleScreen({ pack, fight, party, me, answer, notice, latency, onIntent }: BattleScreenProps) {
  // The last answer the player has been told about: a refusal is said until the next thing they ask.
  const [heard, setHeard] = useState<BattleScreenProps['answer']>()
  // What was asked and not yet answered: nothing more is asked meanwhile.
  const [waiting, setWaiting] = useState<{ fight: PlayerFight; answer: BattleScreenProps['answer'] }>()
  const pending = notice !== undefined || (waiting !== undefined && waiting.fight === fight && waiting.answer === answer)

  const ask = (_who: string, what: SeatAsk): boolean => {
    const intent = toIntent(what)
    // Not a player's to ask: nothing goes out, and it is known at once.
    if (!intent) return true
    setHeard(answer)
    setWaiting({ fight, answer })
    onIntent(intent)
    return false
  }

  return (
    <Battle
      pack={pack}
      fight={fight}
      party={party}
      seat={{ role: 'player' }}
      // A character that is not in this fight plays nobody: its player watches.
      playable={fight.combatants.some((combatant) => combatant.id === me) ? [me] : []}
      onAsk={ask}
      pending={pending}
      refused={answer?.refused !== undefined && heard !== answer}
      notice={notice}
      latency={latency}
    />
  )
}
