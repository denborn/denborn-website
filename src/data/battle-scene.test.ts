import { describe, expect, it } from 'vitest'
import { BATTLE_BACKDROPS, backdropFiles } from './battle-backdrops'
import { DEFAULT_SCENE, sceneArt } from './battle-scene'

describe('the pictures of a fight’s backgrounds', () => {
  it('lists one file for each background, and no file twice', () => {
    const files = backdropFiles()
    expect(files).toHaveLength(BATTLE_BACKDROPS.length)
    expect(new Set(files).size).toBe(files.length)
  })

  it('names no background twice', () => {
    expect(new Set(BATTLE_BACKDROPS.map((backdrop) => backdrop.id)).size).toBe(BATTLE_BACKDROPS.length)
  })
})

describe('what a scene is drawn with', () => {
  it('draws the default scene for an encounter that names none', () => {
    expect(sceneArt(undefined)).toEqual(sceneArt(DEFAULT_SCENE))
  })

  it('draws the background a scene names', () => {
    const other = BATTLE_BACKDROPS.find((backdrop) => backdrop.id !== DEFAULT_SCENE.background)
    if (!other) throw new Error('The tests need two backgrounds')
    expect(sceneArt({ background: other.id }).backdrop).toBe(other)
  })

  it('draws the default background for a name this app does not have', () => {
    expect(sceneArt({ background: 'the-moon' }).backdrop.id).toBe(DEFAULT_SCENE.background)
  })

  it('lights a scene at the hour it names, and one that names none as a new scene is lit', () => {
    expect(sceneArt({ background: DEFAULT_SCENE.background, hour: 21 }).hour).toBe(21)
    expect(sceneArt({ background: DEFAULT_SCENE.background, hour: 0 }).hour).toBe(0)
    expect(sceneArt({ background: DEFAULT_SCENE.background }).hour).toBe(sceneArt(DEFAULT_SCENE).hour)
  })
})
