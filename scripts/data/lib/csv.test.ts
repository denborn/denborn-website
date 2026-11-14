import { describe, expect, it } from 'vitest'
import { parseCsv, parseCsvRecords } from './csv.ts'

describe('CSV reader', () => {
  it('reads quoted fields that hold commas, quotes and line breaks', () => {
    const text = 'id,text\n1,"a, b"\n2,"say ""hi"""\n3,"two\nlines"\n'
    expect(parseCsv(text)).toEqual([
      ['id', 'text'],
      ['1', 'a, b'],
      ['2', 'say "hi"'],
      ['3', 'two\nlines'],
    ])
  })

  it('accepts Windows line endings, empty fields and a missing final line break', () => {
    expect(parseCsv('a,b,c\r\n1,,3\r\n4,5,')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
      ['4', '5', ''],
    ])
  })

  it('keys each row by the header and skips blank lines', () => {
    expect(parseCsvRecords('id,name\n1,potion\n\n2,revive\n')).toEqual([
      { id: '1', name: 'potion' },
      { id: '2', name: 'revive' },
    ])
  })
})
