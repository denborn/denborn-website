import { describe, expect, it } from 'vitest'
import { checkNickname, tidyNickname } from './nickname'

describe('nicknames', () => {
  it.each(['Mr. Mime', "Farfetch'd", 'Éclair-2', 'Zoé', 'Ångström', 'a', 'X'.repeat(24)])('accepts %s', (name) => {
    expect(checkNickname(tidyNickname(name))).toBeUndefined()
  })

  it('refuses an empty name, or one made of spaces', () => {
    expect(checkNickname(tidyNickname(''))).toBe('empty')
    expect(checkNickname(tidyNickname('   '))).toBe('empty')
  })

  it('refuses more than 24 characters, counting an accented letter once', () => {
    expect(checkNickname('X'.repeat(25))).toBe('too-long')
    expect(checkNickname(tidyNickname('é'.repeat(24)))).toBeUndefined()
    // The same 24 letters typed as "e" plus a combining accent: 48 code units before tidying.
    expect(checkNickname(tidyNickname('é'.repeat(24)))).toBeUndefined()
  })

  it.each(['Pika😀', 'ピカチュウ', 'Пикачу', 'Pika_chu', 'Pika!', 'Pika@chu'])('refuses %s', (name) => {
    expect(checkNickname(tidyNickname(name))).toBe('characters')
  })

  it('tidies what was typed: outer spaces, runs of spaces, a curly apostrophe', () => {
    expect(tidyNickname('  Mr.   Mime ')).toBe('Mr. Mime')
    expect(tidyNickname('Farfetch’d')).toBe("Farfetch'd")
  })
})
