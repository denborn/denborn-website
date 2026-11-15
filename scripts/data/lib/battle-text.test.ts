import { describe, expect, it } from 'vitest'
import { sentenceOf, sharedSentence, unbroken } from './battle-text.ts'

// Made-up lines in the form of the games' text files: the tests are about how a line is read, not about what the games say.
describe('a line of the games\' text, as a sentence with named gaps', () => {
  it('names each variable by what it stands for and its place among the line\'s arguments', () => {
    expect(sentenceOf('[VAR 0102(0000)] hugs [VAR 0102(0001)] with [VAR 0107(0002)]!').text).toBe('{pokemon0} hugs {pokemon1} with {move2}!')
    expect(sentenceOf('[VAR 0101(000A)] holds [VAR 0109(0001)] and has [VAR 0106(0002)].').text).toBe('{pokemon10} holds {item1} and has {ability2}.')
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
