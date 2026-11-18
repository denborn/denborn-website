import { describe, expect, it } from 'vitest'
import type { Fighter } from './fighters'
import { sceneFocus, sceneFollowing } from './scene-focus'

/** A Pokémon on a line, with only what the scene reads of it. */
function on(id: string, side: Fighter['side'], position: number, state: Fighter['state'] = 'standing'): Fighter {
  const shown: Partial<Fighter> = { id, side, position, state }
  return shown as Fighter
}

/** A party of `players` and a line of `enemies`, named p0, p1… and e0, e1… from the left. */
function field(players: number, enemies: number, gone: readonly string[] = []): Fighter[] {
  const line = (side: Fighter['side'], letter: string, length: number) =>
    Array.from({ length }, (_, position) => on(`${letter}${position}`, side, position, gone.includes(`${letter}${position}`) ? 'gone' : 'standing'))
  return [...line('players', 'p', players), ...line('enemies', 'e', enemies)]
}

describe('the two Pokémon on the scene', () => {
  it('shows the one asked for on the near line, and whoever faces it on the far one', () => {
    const scene = sceneFocus(field(5, 5), 'players', { near: 'p1' })
    expect(scene.near?.id).toBe('p1')
    expect(scene.far?.id).toBe('e1')
    // Four against three: the lines are centred, and the second of four stands between the first two foes; the left one is taken.
    expect(sceneFocus(field(4, 3), 'players', { near: 'p1' }).far?.id).toBe('e0')
  })

  it('shows the middle of a line when nobody is asked for', () => {
    const scene = sceneFocus(field(4, 5), 'players')
    expect(scene.near?.id).toBe('p1')
    expect(scene.far?.id).toBe('e1')
  })

  it('shows on the far line the one asked for there, whoever is played', () => {
    expect(sceneFocus(field(3, 6), 'players', { near: 'p0', far: 'e5' }).far?.id).toBe('e5')
  })

  it('sees the fight from the enemies’ side for the game master', () => {
    const scene = sceneFocus(field(3, 4), 'enemies', { near: 'e3' })
    expect(scene.near?.id).toBe('e3')
    expect(scene.far?.side).toBe('players')
  })

  it('says when the one shown on the far line is out of the reach of the one shown on the near line', () => {
    expect(sceneFocus(field(5, 5), 'players', { near: 'p0' }).outOfReach).toBe(false)
    expect(sceneFocus(field(5, 5), 'players', { near: 'p0', far: 'e4' }).outOfReach).toBe(true)
  })

  it('never shows one that is out of the fight, but for one the step being told takes away', () => {
    const fighters = field(3, 3, ['p1', 'e0'])
    expect(sceneFocus(fighters, 'players', { near: 'p1' }).near?.id).not.toBe('p1')
    expect(sceneFocus(fighters, 'players', { near: 'p1', leaving: ['p1'] }).near?.id).toBe('p1')
    expect(sceneFocus(fighters, 'players', { near: 'p0', far: 'e0' }).far?.id).not.toBe('e0')
  })

  it('shows nobody on an empty line', () => {
    const scene = sceneFocus(field(2, 1, ['e0']), 'players', { near: 'p0' })
    expect(scene.far).toBeUndefined()
    expect(scene.outOfReach).toBe(false)
  })
})

describe('the scene while a round is told', () => {
  it('starts as it rests, and shows each one told of in its line’s place', () => {
    const fighters = field(4, 4)
    const resting = { near: 'p0' }
    expect(sceneFollowing(fighters, 'players', resting, []).near?.id).toBe('p0')
    const scene = sceneFollowing(fighters, 'players', resting, [['p3', 'e2'], ['e0']])
    expect(scene.near?.id).toBe('p3')
    expect(scene.far?.id).toBe('e0')
  })

  it('does not bring back one that is out of the fight, unless its step is the one that takes it away', () => {
    const fighters = field(3, 3, ['e2'])
    expect(sceneFollowing(fighters, 'players', { near: 'p0', far: 'e0' }, [['e2']]).far?.id).toBe('e0')
    expect(sceneFollowing(fighters, 'players', { near: 'p0', far: 'e0', leaving: ['e2'] }, [['e2']]).far?.id).toBe('e2')
  })
})
