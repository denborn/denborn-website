import { describe, expect, it } from 'vitest'
import type { Fighter } from './fighters'
import { type OrderEntry, type OrderSeat, orderBars } from './order-bar'

function on(id: string, side: Fighter['side'], position: number, state: Fighter['state'] = 'standing'): Fighter {
  const shown: Partial<Fighter> = { id, side, position, state, name: id.toUpperCase(), letter: 'ABCDEF'.charAt(position), species: undefined }
  return shown as Fighter
}

const FIELD = [on('ann', 'players', 0), on('bob', 'players', 1), on('cat', 'players', 2), on('rat', 'enemies', 0), on('bat', 'enemies', 1)]
const seat = (changes: Partial<OrderSeat> = {}): OrderSeat => ({ near: 'players', playable: new Set(), locked: new Set(), ...changes })
const said = (bar: readonly OrderEntry[]): string[] => bar.map((entry) => `${entry.rank ?? '-'} ${entry.id}`)

describe('the order of a round, one bar a line', () => {
  it('ranks a party in the order it is given, for a player who is told their party only', () => {
    const bars = orderBars(['cat', 'ann', 'bob'], FIELD, seat())
    expect(said(bars.near)).toEqual(['1 cat', '2 ann', '3 bob'])
    // Nothing of the enemies' order reaches a player (decision 18).
    expect(said(bars.far)).toEqual(['- rat', '- bat'])
  })

  it('ranks everyone across the two bars, for the game master', () => {
    const bars = orderBars(['bat', 'cat', 'rat', 'ann', 'bob'], FIELD, seat({ near: 'enemies' }))
    expect(said(bars.near)).toEqual(['1 bat', '3 rat'])
    expect(said(bars.far)).toEqual(['2 cat', '4 ann', '5 bob'])
  })

  it('lists after the others, by their place, those who do not act this round', () => {
    const field = [on('ann', 'players', 0, 'downed'), on('bob', 'players', 1), on('cat', 'players', 2, 'downed')]
    expect(said(orderBars(['bob'], field, seat()).near)).toEqual(['1 bob', '- ann', '- cat'])
  })

  it('leaves out those who are out of the fight', () => {
    const field = [on('ann', 'players', 0, 'gone'), on('bob', 'players', 1)]
    expect(said(orderBars(['bob'], field, seat()).near)).toEqual(['1 bob'])
  })

  it('marks who has locked, who is played, who can be, and whose player is away', () => {
    const bars = orderBars(['ann', 'bob', 'cat'], FIELD, seat({ actor: 'bob', playable: new Set(['bob', 'cat']), locked: new Set(['ann']), away: new Set(['cat']) }))
    expect(bars.near.map((entry) => [entry.locked, entry.current, entry.playable, entry.away])).toEqual([
      [true, false, false, false],
      [false, true, true, false],
      [false, false, true, true],
    ])
  })
})
