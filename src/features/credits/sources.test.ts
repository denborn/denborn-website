import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CREDIT_LINKS, SHEET_RIPPERS } from './sources'

/** The fuller record, at the root of the repository. */
const record = readFileSync(new URL('../../../CREDITS.md', import.meta.url), 'utf8')

describe('the credits the app shows', () => {
  it('link only to pages CREDITS.md names', () => {
    const recorded = new Set([...record.matchAll(/https?:\/\/[^\s)\]]+/g)].map((match) => match[0]))
    const shown = Object.values(CREDIT_LINKS).flatMap((links) => links.map((link) => link.url))
    expect(shown.filter((url) => !recorded.has(url))).toEqual([])
  })

  it('name everyone CREDITS.md names for a sprite sheet', () => {
    const table = record.slice(record.indexOf('| Sheet | Game | Ripped by |'), record.indexOf('The art direction'))
    const rippers = table
      .split('\n')
      .slice(2)
      .map((row) => row.split('|')[3]?.trim() ?? '')
      // One sheet credits two projects in a sentence: the app says so in words.
      .filter((name) => name !== '' && !name.startsWith('credited on the sheet'))
    expect([...new Set(rippers)].sort()).toEqual([...SHEET_RIPPERS].sort())
  })
})
