import { describe, expect, it } from 'vitest'
import { type StoredFight, openFightStore } from './fight-store'
import { memoryStorage } from './library'

const fight = (round: number): StoredFight => ({
  fight: { encounter: { id: 'encounter-0001', name: 'Test' }, round, locked: { hero: { by: 'self' } } },
  battle: { engine: '1.0.0', adapter: 2, format: 'test', cursor: 12, state: { turn: round } },
})

describe('the fight a device keeps', () => {
  it('is given back as it was kept, each campaign its own, the newest in the place of the one before', () => {
    const store = openFightStore(memoryStorage())
    expect(store.fightOf('campaign-a')).toBeUndefined()
    expect(store.keep('campaign-a', fight(1))).toBe(true)
    store.keep('campaign-a', fight(2))
    store.keep('campaign-b', fight(7))
    expect(store.fightOf('campaign-a')).toEqual(fight(2))
    expect(store.fightOf('campaign-b')).toEqual(fight(7))
  })

  it('is forgotten once the encounter is over', () => {
    const store = openFightStore(memoryStorage())
    store.keep('campaign-a', fight(1))
    store.forget('campaign-a')
    expect(store.fightOf('campaign-a')).toBeUndefined()
  })

  it('reads nothing from what is not a kept fight: other data, another form, text that is no JSON', () => {
    const storage = memoryStorage()
    const store = openFightStore(storage)
    storage.setItem('denborn/fight/campaign-a', '{ not json')
    expect(store.fightOf('campaign-a')).toBeUndefined()
    storage.setItem('denborn/fight/campaign-a', JSON.stringify({ form: 99, ...fight(1) }))
    expect(store.fightOf('campaign-a')).toBeUndefined()
    storage.setItem('denborn/fight/campaign-a', JSON.stringify({ form: 1, fight: { round: 1 }, battle: {} }))
    expect(store.fightOf('campaign-a')).toBeUndefined()
  })

  it('says so when the device refuses to keep it', () => {
    const full = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError') } }
    expect(openFightStore(full).keep('campaign-a', fight(1))).toBe(false)
  })
})
