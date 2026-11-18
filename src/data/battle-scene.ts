/**
 * Where a fight is drawn (decisions 246, 268 and 275): the background its
 * encounter names, as the pictures the app has, and the hour it is lit at. A
 * scene is only ever a picture: nothing of the fight depends on it.
 */
import type { BattleScene } from '../shared/schema/encounter.ts'
import { type BattleBackdrop, BATTLE_BACKDROPS, DEFAULT_BACKDROP, backdropOf } from './battle-backdrops.ts'
import { battleBackdropUrl } from './sprites.ts'

/** The hour a new encounter is fought at: the middle of the day. */
export const DEFAULT_HOUR = 12

/** The scene of an encounter that names none: the meadow, at noon. */
export const DEFAULT_SCENE: BattleScene = { background: DEFAULT_BACKDROP, hour: DEFAULT_HOUR }

export interface SceneArt {
  backdrop: BattleBackdrop
  /** The background's picture. */
  url: string
  /** The hour it is lit at, from 0 to 23. */
  hour: number
}

const firstBackdrop = (): BattleBackdrop => {
  const [first] = BATTLE_BACKDROPS
  if (!first) throw new Error('The app has no background for a fight')
  return first
}

/**
 * What a scene is drawn with. A background this app does not have (an
 * encounter prepared with another version) is drawn as the default one; a
 * scene that names no hour is lit as at noon; no scene at all is the default
 * scene.
 */
export function sceneArt(scene: BattleScene | undefined): SceneArt {
  const asked = scene ?? DEFAULT_SCENE
  const backdrop = backdropOf(asked.background) ?? backdropOf(DEFAULT_BACKDROP) ?? firstBackdrop()
  return { backdrop, url: battleBackdropUrl(backdrop), hour: asked.hour ?? DEFAULT_HOUR }
}
