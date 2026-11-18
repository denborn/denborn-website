/**
 * Who stands on a fight's scene (decisions 271, 272, 277 and 283): one Pokémon of each
 * line. On the viewer's own line, the one they play; on the other, whoever
 * faces it. Either can be changed for another of its line, only to look at
 * it: the scene is a window on the two lines, which the battlefield shows
 * whole.
 */
import { type LineSide, xOf } from '../../game-rules/reach'
import { type Fighter, reaches } from './fighters'

export interface SceneFocus {
  /** The one shown of the line in the foreground, seen from behind; nobody on an empty line. */
  near: Fighter | undefined
  /** The one shown of the line facing it. */
  far: Fighter | undefined
  /** True when the one shown of the far line is out of the reach of the one shown of the near line. */
  outOfReach: boolean
}

/** Whom the scene is asked to show. */
export interface SceneAsk {
  /** On the near line: the Pokémon being played, or one looked at. Left out, the middle of the line. */
  near?: string | undefined
  /** On the far line. Left out, whoever faces the one shown of the near line. */
  far?: string | undefined
  /** Pokémon that stay on the scene although they are out of the fight: the step being told is the one that takes them away. */
  leaving?: readonly string[]
}

const lineOf = (fighters: readonly Fighter[], side: LineSide): Fighter[] => fighters.filter((fighter) => fighter.side === side).sort((a, b) => a.position - b.position)

/** The one of `line` that stands closest to facing `from`, the leftmost of two as close; nobody on an empty line. */
function facing(from: Fighter, line: readonly Fighter[], fighters: readonly Fighter[]): Fighter | undefined {
  const x = (fighter: Fighter): number => xOf({ side: fighter.side, position: fighter.position, lineLength: fighters.filter((other) => other.side === fighter.side).length })
  return [...line].sort((a, b) => Math.abs(x(a) - x(from)) - Math.abs(x(b) - x(from)) || a.position - b.position)[0]
}

/** The middle of a line, the left one of the two middles of an even one. */
const middleOf = (line: readonly Fighter[]): Fighter | undefined => line[Math.floor((line.length - 1) / 2)]

export function sceneFocus(fighters: readonly Fighter[], near: LineSide, ask: SceneAsk = {}): SceneFocus {
  const leaving = new Set(ask.leaving)
  const onField = (fighter: Fighter): boolean => fighter.state !== 'gone' || leaving.has(fighter.id)
  const nearLine = lineOf(fighters, near).filter(onField)
  const farLine = lineOf(fighters, near === 'players' ? 'enemies' : 'players').filter(onField)
  const shownNear = nearLine.find((fighter) => fighter.id === ask.near) ?? middleOf(nearLine)
  const shownFar = farLine.find((fighter) => fighter.id === ask.far) ?? (shownNear ? facing(shownNear, farLine, fighters) : middleOf(farLine))
  return { near: shownNear, far: shownFar, outOfReach: shownNear !== undefined && shownFar !== undefined && !reaches(shownNear, shownFar, fighters) }
}

/**
 * The scene while a round is told (decision 91): it starts as `resting` has
 * it and follows the action. `shown` lists, step after step, the Pokémon each
 * step told so far is about: each takes its line's place on the scene as its
 * step comes, so the last one told of each line is the one shown.
 */
export function sceneFollowing(fighters: readonly Fighter[], near: LineSide, resting: SceneAsk, shown: readonly (readonly string[])[]): SceneFocus {
  const leaving = new Set(resting.leaving)
  let ask = resting
  for (const id of shown.flat()) {
    const fighter = fighters.find((candidate) => candidate.id === id)
    // Nothing brings back one that is out of the fight, unless this step is the one that takes it away.
    if (!fighter || (fighter.state === 'gone' && !leaving.has(id))) continue
    ask = fighter.side === near ? { ...ask, near: id } : { ...ask, far: id }
  }
  return sceneFocus(fighters, near, ask)
}
