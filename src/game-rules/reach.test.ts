import { describe, expect, it } from 'vitest'
import { type LineSide, type Spot, canReach, isAdjacent, isDirectlyOpposite, xOf } from './reach'

const spot = (side: LineSide, position: number, lineLength: number): Spot => ({ side, position, lineLength })
const LETTERS = 'ABCDEF'

/** Letters of the players, on a line of `players`, who can reach a foe at `enemy` on a line of `enemies`. */
function playersReaching(players: number, enemies: number, enemy: number): string {
  let out = ''
  for (let position = 0; position < players; position++) {
    if (isAdjacent(spot('players', position, players), spot('enemies', enemy, enemies))) out += LETTERS.charAt(position)
  }
  return out
}

describe('line geometry', () => {
  it('centres lines of different lengths on each other', () => {
    expect(xOf(spot('players', 0, 1))).toBe(0)
    expect([0, 1, 2, 3].map((p) => xOf(spot('players', p, 4)))).toEqual([-1.5, -0.5, 0.5, 1.5])
    expect([0, 1, 2].map((p) => xOf(spot('enemies', p, 3)))).toEqual([-1, 0, 1])
  })

  // The owner's own examples (DECISIONS.md 1.1): who can reach a lone boss.
  it.each([
    [3, 'ABC'],
    [4, 'BC'],
    [6, 'CD'],
  ])('lets the right players reach a lone boss when %i players face it', (players, expected) => {
    expect(playersReaching(players, 1, 0)).toBe(expected)
  })

  it('matches Triples adjacency on two lines of three', () => {
    expect(playersReaching(3, 3, 0)).toBe('AB')
    expect(playersReaching(3, 3, 1)).toBe('ABC')
    expect(playersReaching(3, 3, 2)).toBe('BC')
  })

  it('is symmetric between the two lines', () => {
    for (let players = 1; players <= 6; players++) {
      for (let enemies = 1; enemies <= 6; enemies++) {
        for (let p = 0; p < players; p++) {
          for (let e = 0; e < enemies; e++) {
            const a = spot('players', p, players)
            const b = spot('enemies', e, enemies)
            expect(isAdjacent(a, b), `${players}v${enemies} ${p}/${e}`).toBe(isAdjacent(b, a))
          }
        }
      }
    }
  })

  it('makes allies adjacent only when they are neighbours', () => {
    expect(isAdjacent(spot('players', 1, 5), spot('players', 2, 5))).toBe(true)
    expect(isAdjacent(spot('players', 1, 5), spot('players', 3, 5))).toBe(false)
    expect(isAdjacent(spot('players', 2, 5), spot('players', 2, 5))).toBe(false)
  })

  it('finds a foe directly opposite only when the two share the same x', () => {
    // Odd against odd: the middles face each other.
    expect(isDirectlyOpposite(spot('players', 1, 3), spot('enemies', 0, 1))).toBe(true)
    // Even against odd: nobody stands at x = 0 on the even line.
    expect([0, 1, 2, 3].some((p) => isDirectlyOpposite(spot('players', p, 4), spot('enemies', 0, 1)))).toBe(false)
    expect(isDirectlyOpposite(spot('players', 0, 4), spot('enemies', 0, 4))).toBe(true)
    expect(isDirectlyOpposite(spot('players', 0, 4), spot('players', 0, 4))).toBe(false)
  })
})

describe('reach by target kind', () => {
  const user = spot('players', 0, 4) // x = -1.5
  const neighbour = spot('players', 1, 4)
  const farAlly = spot('players', 3, 4)
  const nearFoe = spot('enemies', 0, 3) // x = -1
  const farFoe = spot('enemies', 2, 3) // x = 1

  it('lets "any" moves reach everyone but the user', () => {
    for (const target of [neighbour, farAlly, nearFoe, farFoe]) expect(canReach('any', user, target)).toBe(true)
    expect(canReach('any', user, user)).toBe(false)
  })

  it('limits ordinary single-target moves to adjacent Pokémon, friend or foe', () => {
    expect(canReach('normal', user, nearFoe)).toBe(true)
    expect(canReach('normal', user, neighbour)).toBe(true)
    expect(canReach('normal', user, farFoe)).toBe(false)
    expect(canReach('normal', user, farAlly)).toBe(false)
    expect(canReach('normal', user, user)).toBe(false)
  })

  it('limits foe-only kinds to adjacent foes', () => {
    for (const kind of ['adjacentFoe', 'randomNormal', 'scripted', 'allAdjacentFoes'] as const) {
      expect(canReach(kind, user, nearFoe), kind).toBe(true)
      expect(canReach(kind, user, farFoe), kind).toBe(false)
      expect(canReach(kind, user, neighbour), kind).toBe(false)
    }
  })

  it('lets all-adjacent moves hit neighbours on both lines', () => {
    expect(canReach('allAdjacent', user, neighbour)).toBe(true)
    expect(canReach('allAdjacent', user, nearFoe)).toBe(true)
    expect(canReach('allAdjacent', user, farAlly)).toBe(false)
    expect(canReach('allAdjacent', user, farFoe)).toBe(false)
  })

  it('keeps ally kinds on the user\'s own line', () => {
    expect(canReach('adjacentAlly', user, neighbour)).toBe(true)
    expect(canReach('adjacentAlly', user, user)).toBe(false)
    expect(canReach('adjacentAlly', user, nearFoe)).toBe(false)
    expect(canReach('adjacentAllyOrSelf', user, user)).toBe(true)
    expect(canReach('adjacentAllyOrSelf', user, neighbour)).toBe(true)
    expect(canReach('adjacentAllyOrSelf', user, farAlly)).toBe(false)
  })
})
