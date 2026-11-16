/**
 * What a link to the app carries after its "#": a character's own code, a
 * session's join link, or a campaign's creation link. The one place that
 * tells them apart, for the screen each opens and for the title screen, which
 * a link skips.
 */
export type IncomingKind = 'character' | 'join' | 'creation'

const KINDS: readonly (readonly [RegExp, IncomingKind])[] = [
  [/^dnc\d/i, 'character'],
  [/^dnj\d/i, 'join'],
  [/^dnr\d/i, 'creation'],
]

/** The kind of code this is, by how it starts; nothing when it is not one of the app's. */
export function incomingKind(code: string): IncomingKind | undefined {
  return KINDS.find(([start]) => start.test(code))?.[1]
}
