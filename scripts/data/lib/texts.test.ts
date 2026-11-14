import { describe, expect, it } from 'vitest'
import { tidy, toId } from './texts.ts'

describe('ids and texts', () => {
  it('builds the same id from a name however it is punctuated or accented', () => {
    expect(toId('X Sp. Atk')).toBe('xspatk')
    expect(toId("Farfetch’d")).toBe('farfetchd')
    expect(toId('Flabébé')).toBe('flabebe')
    expect(toId('Paralyze Heal')).toBe(toId('paralyze-heal'))
  })

  it('joins the lines of an in-game text, undoing hyphenation at line ends', () => {
    expect(tidy('Restaure 20 PV à un\nPokémon.')).toBe('Restaure 20 PV à un Pokémon.')
    expect(tidy('Un médi­\ncament en spray.')).toBe('Un médicament en spray.')
    expect(tidy('A spray-\ntype medicine.\fIt heals.')).toBe('A spray-type medicine. It heals.')
  })
})
