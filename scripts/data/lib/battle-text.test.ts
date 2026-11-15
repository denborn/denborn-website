import { describe, expect, it } from 'vitest'
import { itemGrammarOf, namedIn, sentenceOf, sharedSentence, unbroken } from './battle-text.ts'

// Made-up lines in the form of the games' text files: the tests are about how a line is read, not about what the games say.
describe('a line of the games\' text, as a sentence with named gaps', () => {
  it('names each variable by what it stands for, and a Pokémon by its place among the line\'s arguments', () => {
    expect(sentenceOf('[VAR 0102(0000)] hugs [VAR 0102(0001)] with [VAR 0107(0002)]!').text).toBe('{pokemon0} hugs {pokemon1} with {move}!')
    expect(sentenceOf('[VAR 0101(000A)] holds [VAR 0109(0001)] and has [VAR 0106(0002)], [VAR 0103(0003)] type, [VAR 0201(0004)] times.').text).toBe('{pokemon10} holds {item} and has {ability}, {type} type, {number} times.')
  })

  it('names the Pokémon by what they are to the engine\'s line when told who is who, in the order of their numbers', () => {
    const line = '[VAR 0102(0001)] grabbed [VAR 0102(0000)]’s [VAR 0109(0002)]!'
    expect(sentenceOf(line, ['pokemon', 'source']).text).toBe('{source} grabbed {pokemon0}’s {item}!')
    expect(sentenceOf(line, ['target', 'pokemon']).text).toBe('{pokemon0} grabbed {target}’s {item}!')
    expect(sentenceOf(line, ['pokemon']).unknown).toEqual(['1 Pokémon named for 2 in the line'])
  })

  it('keeps the forms a text takes with a number: the lengths are written last form first', () => {
    expect(sentenceOf('Hit [VAR 0201(0000)] time[VAR 1101(0000,0100)]s!').text).toBe('Hit {number} time{number:|s}!')
    expect(sentenceOf('[VAR 0200(0001)] [VAR 1101(0001,0502)]ismouse are here.').text).toBe('{number} {number:is|mouse} are here.')
  })

  it('keeps the forms a text takes with an item, by gender and number, and the articles that agree with it', () => {
    // By number only, by gender only, and by both: always written masculine, feminine, then the two plurals.
    expect(sentenceOf('[VAR 1401(0001,0000)][VAR 010A(0001)] soigne[VAR 1101(0001,0200)]nt [VAR 0102(0000)].').text).toBe('{Le}{item} soigne{item:||nt|nt} {pokemon0}.')
    expect(sentenceOf('s[VAR 1100(0001,0102)]ona [VAR 010A(0001)]').text).toBe('s{item:on|a|on|a} {item}')
    expect(sentenceOf('[VAR 010A(0000)] [VAR 1102(0000,0504,0605)]cuitcuitecuitscuites').text).toBe('{item} {item:cuit|cuite|cuits|cuites}')
    expect(sentenceOf('grâce [VAR 1404(0001,0000)][VAR 010A(0001)], [VAR 1400(0001,0000)][VAR 010A(0001)]').text).toBe('grâce {au}{item}, {le}{item}')
  })

  it('counts a line break inside the forms as the one character it is in the games', () => {
    expect(sentenceOf('[VAR 0201(0000)] [VAR 1101(0000,0403)]a\nbc\nde!').text).toBe('{number} {number:a b|c de}!')
  })

  it('reports what it cannot settle: an article before a Pokémon, forms that depend on one, an article away from its item, two moves', () => {
    expect(sentenceOf('[VAR 1401(0000,0001)][VAR 0102(0000)] sauvage').unknown).toEqual(['[VAR 1401(0000,0001)]'])
    expect(sentenceOf('[VAR 0102(0000)] [VAR 1101(0000,0302)]isare').unknown).toEqual(['[VAR 1101(0000,0302)]'])
    expect(sentenceOf('[VAR 1400(0001,0000)] le [VAR 010A(0001)]').unknown).toEqual(['an article away from its item'])
    expect(sentenceOf('[VAR 0107(0000)] and [VAR 0107(0001)]').unknown).toEqual(['two gaps for one move'])
    // A number is one or several: it has no gender to choose a form by.
    expect(sentenceOf('[VAR 0201(0000)] [VAR 1100(0000,0102)]ona').unknown).toEqual(['[VAR 1100(0000,0102)]'])
    expect(sentenceOf('[VAR 0201(0000)] [VAR 1101(0000,1000)][VAR 0102(0001)]!').unknown).toEqual(['[VAR 0102(0001)] inside the forms of another variable'])
  })

  it('drops what only styles the text or lays it out', () => {
    expect(sentenceOf('[VAR BD06(0000)][VAR FF00(0005)]A big\\nhit![VAR FF00(0000)]\\c').text).toBe('A big hit!')
    expect(sentenceOf('Wait...\\r\\nfor  it.').text).toBe('Wait... for it.')
  })

  it('leaves the French "de" before a name as a gap of its own', () => {
    expect(sentenceOf('La force [VAR 1408(0000,0001)][VAR 0102(0000)] monte !').text).toBe('La force {de}{pokemon0} monte !')
  })

  it('reports a variable it does not know, and leaves it in sight', () => {
    expect(sentenceOf('[VAR 0102(0000)] gains [VAR 0206(0001,002C)] points.')).toEqual({ text: '{pokemon0} gains [VAR 0206(0001,002C)] points.', unknown: ['[VAR 0206(0001,002C)]'] })
  })
})

describe('what a sentence names', () => {
  it('is each gap that takes a name or a number, whatever its form, and not the articles', () => {
    expect([...namedIn('{Le}{item} {de}{source} blesse{item:||nt|nt} {pokemon0} {number:a|b} fois')].sort()).toEqual(['item', 'number', 'pokemon0', 'source'])
  })
})

describe('the grammar of the held items\' French names', () => {
  it('is kept for every held item, and says which item has none or is not one', () => {
    const { itemGrammar, problems } = itemGrammarOf({ berry: 'f', scraps: 'mp', ghost: 'm', odd: 'x' }, ['berry', 'scraps', 'odd', 'new'])
    expect(itemGrammar).toEqual({ berry: 'f', scraps: 'mp' })
    expect(problems).toHaveLength(3)
    expect(problems.join('\n')).toMatch(/"odd"[^]*"new"[^]*"ghost"/)
  })
})

describe('the sentence that several lines share', () => {
  it('is their common beginning and ending around what differs', () => {
    expect(sharedSentence(['{pokemon0} threw Mud!', '{pokemon0} threw Sand!', '{pokemon0} threw A Big Rock!'], 'move')).toBe('{pokemon0} threw {move}!')
  })

  it('is not fooled by two names that end alike, given a third that does not', () => {
    expect(sharedSentence(['Zap lance Boue !', 'Zap lance Roue !'], 'move')).toBe('Zap lance {move}oue !')
    expect(sharedSentence(['Zap lance Boue !', 'Zap lance Roue !', 'Zap lance Gravier !'], 'move')).toBe('Zap lance {move} !')
  })

  it('is nothing when there is one line, or when the lines are the same', () => {
    expect(sharedSentence(['Only one.'], 'move')).toBeUndefined()
    expect(sharedSentence(['Same.', 'Same.'], 'move')).toBeUndefined()
  })
})

describe('French punctuation', () => {
  it('stays on the line of the word before it', () => {
    expect(unbroken('Zap lance {move} ! Et après ?')).toBe('Zap lance {move}\u00a0! Et après\u00a0?')
    expect(unbroken('Rien à changer.')).toBe('Rien à changer.')
  })
})
