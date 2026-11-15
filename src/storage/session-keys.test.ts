import { describe, expect, it } from 'vitest'
import { isValidRoomCode } from '../shared/protocol/room-code'
import { type KeyValue, memoryStorage } from './library'
import { openSessionKeys } from './session-keys'

/** Bytes that are never the same twice, without being random: every byte asked for, in this visit or another, counts on from the last. */
let nextByte = 0
const counting = (bytes: Uint8Array): Uint8Array => bytes.map(() => nextByte++ % 256)

const keys = (storage: KeyValue = memoryStorage()) => openSessionKeys(storage, counting)

describe('a game master’s hold on a room', () => {
  it('is a valid room code and a secret the relay accepts, the same on every return to the campaign', () => {
    const storage = memoryStorage()
    const first = keys(storage).hostingOf('campaign-0001')
    expect(isValidRoomCode(first.code)).toBe(true)
    expect(first.secret).toMatch(/^[A-Za-z0-9_-]{22,64}$/)
    // Another visit, the same device.
    expect(keys(storage).hostingOf('campaign-0001')).toEqual(first)
  })

  it('differs from one campaign to the next', () => {
    const device = keys()
    expect(device.hostingOf('campaign-0001')).not.toEqual(device.hostingOf('campaign-0002'))
  })

  it('is a new room once the session was ended', () => {
    const device = keys()
    const first = device.hostingOf('campaign-0001')
    device.forgetHosting('campaign-0001')
    expect(device.hostingOf('campaign-0001')).not.toEqual(first)
  })

  it('is made anew when what was kept is no longer a hold on a room', () => {
    const storage = memoryStorage()
    storage.setItem('denborn/hosting/campaign-0001', JSON.stringify({ code: 'ZZZZZZ', secret: 'short' }))
    expect(isValidRoomCode(keys(storage).hostingOf('campaign-0001').code)).toBe(true)
    storage.setItem('denborn/hosting/campaign-0001', 'not json')
    expect(isValidRoomCode(keys(storage).hostingOf('campaign-0001').code)).toBe(true)
  })
})

describe('a player’s place in a room', () => {
  it('is the same on return with the same character, so the game master sees the same player', () => {
    const storage = memoryStorage()
    const first = keys(storage).takeSeat('ABCDEF', 'character-0001')
    expect(keys(storage).seatAt('ABCDEF')).toEqual(first)
    expect(keys(storage).takeSeat('ABCDEF', 'character-0001')).toEqual(first)
  })

  it('is another place with another character, and in another room', () => {
    const device = keys()
    const first = device.takeSeat('ABCDEF', 'character-0001')
    expect(device.takeSeat('ABCDEF', 'character-0002').token).not.toBe(first.token)
    expect(device.seatAt('ABCDEF')).toMatchObject({ character: 'character-0002' })
    expect(device.seatAt('GHJKMN')).toBeUndefined()
  })

  it('is forgotten once the player is out for good', () => {
    const device = keys()
    device.takeSeat('ABCDEF', 'character-0001')
    device.forgetSeat('ABCDEF')
    expect(device.seatAt('ABCDEF')).toBeUndefined()
  })
})

describe('a storage that refuses to keep anything', () => {
  it('still gives a hold and a place that serve for the visit', () => {
    const refusing: KeyValue = { ...memoryStorage(), setItem: () => { throw new Error('refused') } }
    const device = keys(refusing)
    expect(isValidRoomCode(device.hostingOf('campaign-0001').code)).toBe(true)
    expect(device.takeSeat('ABCDEF', 'character-0001').token).toMatch(/^[A-Za-z0-9_-]{22,64}$/)
  })
})
