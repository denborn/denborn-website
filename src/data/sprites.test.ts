import { describe, expect, it } from 'vitest'
import { battleSpriteUrl, itemIconCell, pokemonIconCell } from './sprites'

// Made-up species: the point is the choice of file, not any real Pokémon.
const gen5 = { id: 'testmon', sprite: 'gen5ani', femaleSprite: true } as const
const fallback = { id: 'latemon', sprite: 'ani', femaleSprite: false } as const
const none = { id: 'ghostmon', sprite: null, femaleSprite: false } as const

describe('battle sprites', () => {
  it('uses the Gen 5 animated set, front or back', () => {
    expect(battleSpriteUrl(gen5)).toBe('/sprites/gen5ani/testmon.gif')
    expect(battleSpriteUrl(gen5, { back: true })).toBe('/sprites/gen5ani-back/testmon.gif')
  })

  it('uses the female sprite only for a female of a species that has one', () => {
    expect(battleSpriteUrl(gen5, { female: true, back: true })).toBe('/sprites/gen5ani-back/testmon-f.gif')
    expect(battleSpriteUrl(fallback, { female: true })).toBe('/sprites/ani/latemon.gif')
  })

  it('falls back to the "ani" set when the species has no Gen 5 sprite', () => {
    expect(battleSpriteUrl(fallback, { back: true })).toBe('/sprites/ani-back/latemon.gif')
  })

  it('gives nothing for a species without any sprite, so its name is shown instead', () => {
    expect(battleSpriteUrl(none)).toBeUndefined()
  })
})

describe('icon sheets', () => {
  it('finds a Pokémon icon by its number: twelve cells of 40×30 per row', () => {
    expect(pokemonIconCell(0)).toMatchObject({ x: 0, y: 0, width: 40, height: 30 })
    expect(pokemonIconCell(11)).toMatchObject({ x: 440, y: 0 })
    expect(pokemonIconCell(12)).toMatchObject({ x: 0, y: 30 })
    expect(pokemonIconCell(25)).toMatchObject({ x: 40, y: 60 })
  })

  it('finds an item icon in the sheet, or uses the item\'s own image', () => {
    expect(itemIconCell({ from: 'showdown', index: 17 })).toMatchObject({ x: 24, y: 24, width: 24, height: 24 })
    expect(itemIconCell({ from: 'pokeapi', file: 'some-item' })).toMatchObject({
      url: '/sprites/pokeapi/sprites/items/some-item.png',
      x: 0,
      y: 0,
    })
  })
})
