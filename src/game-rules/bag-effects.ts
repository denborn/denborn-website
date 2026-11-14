/**
 * What a Bag item does when it is used, as data.
 *
 * Showdown has no Bag, so these effects are Denborn's. The table that gives each
 * real item its effect is part of the data pack (milestone 2) and is shown to
 * the owner before it ships; this file only defines the vocabulary.
 *
 * An item can combine several parts: a Full Restore heals fully and cures
 * everything, for example. A use counts when at least one part applies.
 */

export type MajorStatus = 'psn' | 'tox' | 'brn' | 'par' | 'slp' | 'frz'

export type BagStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy'

export interface BagEffect {
  /** Restores HP to a standing Pokémon: a fixed amount, or all of it. */
  heal?: number | 'full'
  /** Cures the listed status conditions, or any of them. */
  cure?: readonly MajorStatus[] | 'all'
  cureConfusion?: boolean
  /** Brings a downed Pokémon back with half or all of its HP. Works on nothing else. */
  revive?: 'half' | 'full'
  /** Fully revives every downed Pokémon of the user's own party (Sacred Ash). */
  reviveAll?: boolean
  /** Restores PP to one chosen move or to every move. */
  restorePp?: { amount: number | 'full'; scope: 'one' | 'all' }
  /** Raises one stat for the rest of the battle (X items). */
  boost?: { stat: BagStat; stages: number }
  /** Raises the critical-hit rate the way Focus Energy does (Dire Hit). */
  crit?: boolean
  /** Protects the target's side from stat drops for five turns (Guard Spec.). */
  guard?: boolean
}

/** A Bag action as a player or the GM locks it. */
export interface BagUse {
  /** Item id, for the log and the inventory. */
  item: string
  effect: BagEffect
  /** Combatant id of the Pokémon the item is used on. Ignored by `reviveAll`. */
  target: string
  /** The move to restore, when the effect restores PP to one move. */
  move?: string
}
