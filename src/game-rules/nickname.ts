/**
 * A character's nickname (kickoff prompt: 1 to 24 characters; decision 97:
 * Latin letters, accents included, digits, the space, the apostrophe, the
 * hyphen and the period).
 */

export const NICKNAME_MAX = 24

const ALLOWED = /^[\p{Script=Latin}0-9 '.-]+$/u

/**
 * A typed name made ready to check and store: accents joined to their
 * letters, a phone's curly apostrophe made straight, spaces trimmed and runs
 * of them made one.
 */
export function tidyNickname(typed: string): string {
  return typed.normalize('NFC').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
}

export type NicknameProblem = 'empty' | 'too-long' | 'characters'

/** Characters as a person counts them, not UTF-16 units. */
function characterCount(text: string): number {
  let count = 0
  for (const character of text) if (character) count++
  return count
}

/** What is wrong with a tidied nickname, if anything. */
export function checkNickname(nickname: string): NicknameProblem | undefined {
  if (nickname.length === 0) return 'empty'
  if (characterCount(nickname) > NICKNAME_MAX) return 'too-long'
  if (!ALLOWED.test(nickname)) return 'characters'
  return undefined
}
