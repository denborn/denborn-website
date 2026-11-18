/**
 * An encounter, as the game master prepares it (spec section 8): the enemies
 * in the order they stand, and the Bag they fight with. Enemies are built
 * under the same rules as characters (kickoff prompt); what tells an enemy
 * apart is its Agony switch and its class.
 */
import { z } from 'zod'
import { NICKNAME_MAX } from '../../game-rules/nickname.ts'
import { LINE_MAX } from '../../game-rules/party.ts'
import { MOB_CLASSES } from '../../game-rules/rewards.ts'
import { dataId, documentId, itemStack, statSpread, whole } from './common.ts'

export const enemy = z.object({
  /** Tells it apart from the other enemies of the encounter, even two of one species. */
  id: documentId,
  species: dataId,
  /** The name it goes by; its species' name when it has none. */
  nickname: z.string().min(1).max(NICKNAME_MAX).optional(),
  /** The game master's pick, among those its species can be. */
  gender: z.enum(['M', 'F', 'N']),
  level: whole(1, 100),
  nature: dataId.optional(),
  ability: dataId,
  ivs: statSpread(31),
  evs: statSpread(252),
  /** It starts every fight with all its PP. */
  moves: z.array(z.object({ id: dataId, ppUps: whole(0, 3) })).min(1).max(6),
  /** One held item, or none (decision 132). */
  heldItem: dataId.optional(),
  /** True for an enemy that is downed and agonizes like a character instead of fainting. Off unless the game master turns it on. */
  agony: z.boolean(),
  /** Minion, elite or boss: the game master's own label, which sets what it pays (decisions 133 and 134). */
  class: z.enum(MOB_CLASSES),
})

export type Enemy = z.infer<typeof enemy>

/** The name of a background: the app's own, in lower-case letters, digits and hyphens. */
const sceneId = z.string().regex(/^[a-z0-9-]{1,40}$/)

/**
 * Where an encounter is fought, and when (decisions 246, 268 and 275): a
 * background and an hour of the day, picked by the game master. The names
 * are the app's own (src/data/battle-backdrops.ts); one that a version of the
 * app does not have is drawn as the meadow. The hour only changes how the
 * background is lit; a scene with none is lit as by day.
 */
export const battleScene = z.object({
  background: sceneId,
  /** From 0 to 23. */
  hour: whole(0, 23).optional(),
})

export type BattleScene = z.infer<typeof battleScene>

export const encounter = z.object({
  id: documentId,
  name: z.string().min(1).max(60),
  /** In the order they stand on their line, left to right. */
  enemies: z.array(enemy).min(1).max(LINE_MAX),
  /** The Bag the enemies use items from. */
  bag: z.array(itemStack).max(100),
  /** Where it is fought. An encounter saved before there were scenes has none, and is fought in the meadow. */
  scene: battleScene.optional(),
})

export type Encounter = z.infer<typeof encounter>
