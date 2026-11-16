import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import type { CharacterDocument } from '../shared/schema/character'
import type { ItemStack } from '../shared/schema/common'
import { maxHpOf } from './character-check'
import { type ItemUse, isForOneMove, withHeldItem, withItemUsed, withItemsTaken, worksOutsideFight } from './items'
import { progressPack } from './progress-pack'
import { newcomer } from './test-pack'

const LEVEL = 30
const member = (id: string, changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ id: `character-${id}`, level: LEVEL, exp: expForLevel(LEVEL), bag: [], ...changes })
const MAX = maxHpOf(member('max'), progressPack) ?? 0
const bagOf = (...items: string[]): ItemStack[] => items.map((item) => ({ item, quantity: 1 }))
const downed = { hp: 0, condition: { state: 'downed', stacks: 2 } } as const
const dead = { hp: 0, condition: { state: 'dead' } } as const

/** Ann uses an item of her own Bag on herself, unless the test says otherwise. */
function use(party: CharacterDocument[], item: string, more: Partial<ItemUse> = {}) {
  return withItemUsed(party, { user: 'character-ann', item, target: 'character-ann', ...more }, progressPack)
}
const after = (result: ReturnType<typeof use>, id: string): CharacterDocument | undefined => (result.ok ? result.party.find((character) => character.id === `character-${id}`) : undefined)

describe('an item used outside a fight', () => {
  it('heals by what it says, never above the maximum, and leaves the Bag', () => {
    const ann = member('ann', { hp: 5, bag: [{ item: 'tonic', quantity: 2 }, { item: 'draught', quantity: 1 }] })
    const tonic = use([ann], 'tonic')
    expect(after(tonic, 'ann')).toMatchObject({ hp: 25, bag: [{ item: 'tonic', quantity: 1 }, { item: 'draught', quantity: 1 }], revision: ann.revision + 1 })
    expect(after(use([ann], 'draught'), 'ann')).toMatchObject({ hp: 5 + Math.floor(MAX / 2), bag: [{ item: 'tonic', quantity: 2 }] })
    expect(after(use([member('ann', { hp: MAX - 3, bag: bagOf('tonic') })], 'tonic'), 'ann')).toMatchObject({ hp: MAX, bag: [] })
  })

  it('is not used up when it does nothing: full HP, another condition, nothing to restore, an effect that only means something in a fight', () => {
    const ann = member('ann', { status: 'par', bag: bagOf('tonic', 'salve', 'ether', 'elixir', 'xpower', 'charm') })
    for (const item of ['tonic', 'salve', 'elixir', 'xpower', 'charm']) expect(use([ann], item)).toEqual({ ok: false, problem: 'no-effect' })
    expect(use([ann], 'ether', { move: 'tackle' })).toEqual({ ok: false, problem: 'no-effect' })
  })

  it('cures the conditions it lists, and counts as used when any part of it applies', () => {
    const ann = member('ann', { status: 'tox', bag: bagOf('salve', 'cureall') })
    const salve = after(use([ann], 'salve'), 'ann')
    expect(salve && 'status' in salve).toBe(false)
    // Full HP already, but poisoned: the cure applies, so the item is used.
    const cureall = after(use([ann], 'cureall'), 'ann')
    expect(cureall).toMatchObject({ bag: [{ item: 'salve', quantity: 1 }] })
    expect(cureall && 'status' in cureall).toBe(false)
  })

  it('restores PP to the move named, or to every move, never above what the move holds', () => {
    const moves = [{ id: 'tackle', ppUps: 0, pp: 30 }, { id: 'spark', ppUps: 0, pp: 0 }, { id: 'megabolt', ppUps: 3, pp: 0 }]
    const ann = member('ann', { moves, bag: bagOf('ether', 'elixir') })
    expect(after(use([ann], 'ether', { move: 'tackle' }), 'ann')?.moves).toEqual([{ id: 'tackle', ppUps: 0, pp: 35 }, moves[1], moves[2]])
    expect(after(use([ann], 'ether', { move: 'spark' }), 'ann')?.moves).toEqual([moves[0], { id: 'spark', ppUps: 0, pp: 10 }, moves[2]])
    // Megabolt holds 5 PP, 8 with three PP Ups.
    expect(after(use([ann], 'elixir'), 'ann')?.moves).toEqual([{ id: 'tackle', ppUps: 0, pp: 35 }, { id: 'spark', ppUps: 0, pp: 20 }, { id: 'megabolt', ppUps: 3, pp: 8 }])
    // A PP item for one move does nothing without its move, or for a move the Pokémon does not know.
    expect(use([ann], 'ether')).toEqual({ ok: false, problem: 'no-effect' })
    expect(use([ann], 'ether', { move: 'eggkick' })).toEqual({ ok: false, problem: 'no-effect' })
  })

  it('stays in the Bag when using it does not use it up', () => {
    const ann = member('ann', { status: 'slp', bag: bagOf('flute') })
    const awake = after(use([ann], 'flute'), 'ann')
    expect(awake).toMatchObject({ bag: [{ item: 'flute', quantity: 1 }] })
    expect(awake && 'status' in awake).toBe(false)
  })

  it('can be used on anyone in the party (decision 12), by a character on its feet', () => {
    const ann = member('ann', { bag: bagOf('tonic') })
    const bob = member('bob', { hp: 1 })
    const result = use([ann, bob], 'tonic', { target: 'character-bob' })
    expect(after(result, 'bob')).toMatchObject({ hp: 21, revision: bob.revision + 1 })
    expect(after(result, 'ann')).toMatchObject({ bag: [], revision: ann.revision + 1 })
    expect(use([member('ann', { ...downed, bag: bagOf('tonic') }), bob], 'tonic', { target: 'character-bob' })).toEqual({ ok: false, problem: 'user-down' })
    expect(use([ann], 'tonic', { target: 'character-zed' })).toEqual({ ok: false, problem: 'unknown-character' })
    expect(use([ann, bob], 'salve', { target: 'character-bob' })).toEqual({ ok: false, problem: 'no-item' })
  })
})

describe('reviving outside a fight', () => {
  it('brings back the downed and the dead alike, with the item\'s own HP (decisions 171 and 172)', () => {
    const ann = member('ann', { bag: bagOf('phoenix', 'sun') })
    for (const fallen of [downed, dead]) {
      const bob = member('bob', fallen)
      expect(after(use([ann, bob], 'phoenix', { target: 'character-bob' }), 'bob')).toMatchObject({ hp: Math.floor(MAX / 2), condition: { state: 'standing' } })
      expect(after(use([ann, bob], 'sun', { target: 'character-bob' }), 'bob')).toMatchObject({ hp: MAX, condition: { state: 'standing' } })
    }
  })

  it('works on nobody on their feet, and nothing else works on a Pokémon that is down', () => {
    const ann = member('ann', { hp: 1, bag: bagOf('phoenix', 'tonic', 'ppup') })
    expect(use([ann], 'phoenix')).toEqual({ ok: false, problem: 'no-effect' })
    const bob = member('bob', downed)
    expect(use([ann, bob], 'tonic', { target: 'character-bob' })).toEqual({ ok: false, problem: 'no-effect' })
    expect(use([ann, bob], 'ppup', { target: 'character-bob', move: 'tackle' })).toEqual({ ok: false, problem: 'no-effect' })
  })

  it('raises everyone who is down at once with the item that does, and is not used when nobody is', () => {
    const ann = member('ann', { bag: bagOf('ash') })
    const result = use([ann, member('bob', downed), member('cat', dead), member('dan', { hp: 1 })], 'ash')
    expect(after(result, 'bob')).toMatchObject({ hp: MAX, condition: { state: 'standing' } })
    expect(after(result, 'cat')).toMatchObject({ hp: MAX, condition: { state: 'standing' } })
    expect(after(result, 'dan')).toMatchObject({ hp: 1, revision: 0 })
    expect(after(result, 'ann')?.bag).toEqual([])
    expect(use([ann, member('dan', { hp: 1 })], 'ash')).toEqual({ ok: false, problem: 'no-effect' })
  })
})

describe('a PP Up', () => {
  const ann = (moves: CharacterDocument['moves'], ...items: string[]) => member('ann', { moves, bag: bagOf(...items) })

  it('raises what a move holds by a fifth of its base PP, and its PP by as much', () => {
    const result = use([ann([{ id: 'tackle', ppUps: 1, pp: 10 }], 'ppup')], 'ppup', { move: 'tackle' })
    // Tackle: 35, 42 with one PP Up, 49 with two.
    expect(after(result, 'ann')).toMatchObject({ moves: [{ id: 'tackle', ppUps: 2, pp: 17 }], bag: [] })
  })

  it('goes straight to three with the item that gives three, and no move takes a fourth', () => {
    expect(after(use([ann([{ id: 'tackle', ppUps: 1, pp: 42 }], 'ppmax')], 'ppmax', { move: 'tackle' }), 'ann')?.moves).toEqual([{ id: 'tackle', ppUps: 3, pp: 56 }])
    expect(use([ann([{ id: 'tackle', ppUps: 3, pp: 56 }], 'ppup')], 'ppup', { move: 'tackle' })).toEqual({ ok: false, problem: 'no-effect' })
  })

  it('does nothing for a move whose PP cannot be raised, or without a move', () => {
    const one = ann([{ id: 'onechance', ppUps: 0, pp: 1 }], 'ppup')
    expect(use([one], 'ppup', { move: 'onechance' })).toEqual({ ok: false, problem: 'no-effect' })
    expect(use([one], 'ppup')).toEqual({ ok: false, problem: 'no-effect' })
  })
})

describe('the Bag of a teammate who is downed or dead (decision 175)', () => {
  const ann = member('ann', { bag: bagOf('tonic') })

  it('is open to the others: an item used from it leaves that Bag, and can bring its owner back', () => {
    for (const fallen of [downed, dead]) {
      const bob = member('bob', { ...fallen, bag: [{ item: 'phoenix', quantity: 2 }] })
      const result = use([ann, bob], 'phoenix', { from: 'character-bob', target: 'character-bob' })
      expect(after(result, 'bob')).toMatchObject({ condition: { state: 'standing' }, bag: [{ item: 'phoenix', quantity: 1 }], revision: bob.revision + 1 })
      // Ann's own Bag is untouched: her sheet did not change.
      expect(after(result, 'ann')).toBe(ann)
    }
  })

  it('stays closed while its owner is on its feet, and is not one\'s own Bag under another name', () => {
    const bob = member('bob', { bag: bagOf('tonic') })
    expect(use([member('ann', { hp: 1 }), bob], 'tonic', { from: 'character-bob' })).toEqual({ ok: false, problem: 'bag-closed' })
    expect(use([member('ann', { hp: 1, bag: bagOf('tonic') })], 'tonic', { from: 'character-ann' })).toEqual({ ok: false, problem: 'bag-closed' })
    expect(use([ann], 'tonic', { from: 'character-zed' })).toEqual({ ok: false, problem: 'unknown-character' })
  })

  it('holds what it holds: an item it lacks is not there, whoever else has one', () => {
    expect(use([member('ann', { hp: 1, bag: bagOf('tonic') }), member('bob', downed)], 'tonic', { from: 'character-bob' })).toEqual({ ok: false, problem: 'no-item' })
  })

  it('can be emptied into one\'s own Bag, a stack or a part of it', () => {
    const bob = member('bob', { ...dead, bag: [{ item: 'tonic', quantity: 3 }, { item: 'phoenix', quantity: 1 }] })
    const taken = withItemsTaken([ann, bob], { taker: 'character-ann', from: 'character-bob', item: 'tonic', quantity: 2 })
    expect(taken.ok && taken.party).toMatchObject([
      { bag: [{ item: 'tonic', quantity: 3 }], revision: ann.revision + 1 },
      { bag: [{ item: 'tonic', quantity: 1 }, { item: 'phoenix', quantity: 1 }], revision: bob.revision + 1 },
    ])
    const all = withItemsTaken([ann, bob], { taker: 'character-ann', from: 'character-bob', item: 'phoenix', quantity: 1 })
    expect(all.ok && all.party).toMatchObject([{ bag: [{ item: 'tonic', quantity: 1 }, { item: 'phoenix', quantity: 1 }] }, { bag: [{ item: 'tonic', quantity: 3 }] }])
  })

  it('gives nothing to a taker who is down, from an owner on its feet, beyond what it holds, or beyond what a Bag takes', () => {
    const bob = member('bob', { ...downed, bag: [{ item: 'tonic', quantity: 3 }] })
    const take = (party: CharacterDocument[], quantity = 1, item = 'tonic') => withItemsTaken(party, { taker: 'character-ann', from: 'character-bob', item, quantity })
    expect(take([member('ann', downed), bob])).toEqual({ ok: false, problem: 'taker-down' })
    expect(take([ann, member('bob', { bag: bagOf('tonic') })])).toEqual({ ok: false, problem: 'bag-closed' })
    expect(take([ann, bob], 4)).toEqual({ ok: false, problem: 'no-item' })
    expect(take([ann, bob], 0)).toEqual({ ok: false, problem: 'no-item' })
    expect(take([ann, bob], 1, 'phoenix')).toEqual({ ok: false, problem: 'no-item' })
    expect(take([member('ann', { bag: [{ item: 'tonic', quantity: 998 }] }), bob], 2)).toEqual({ ok: false, problem: 'bag-full' })
    expect(take([ann], 1)).toEqual({ ok: false, problem: 'unknown-character' })
  })
})

describe('the item a character holds (decision 6)', () => {
  it('is swapped with one of its Bag, the one it held going back in', () => {
    const ann = member('ann', { heldItem: 'berry', bag: [{ item: 'charm', quantity: 1 }, { item: 'berry', quantity: 2 }] })
    expect(withHeldItem(ann, 'charm', progressPack)).toMatchObject({ ok: true, character: { heldItem: 'charm', bag: [{ item: 'berry', quantity: 3 }], revision: ann.revision + 1 } })
    const empty = member('ann', { bag: bagOf('charm') })
    delete empty.heldItem
    expect(withHeldItem(empty, 'charm', progressPack)).toMatchObject({ ok: true, character: { heldItem: 'charm', bag: [] } })
  })

  it('can be put away, leaving the character holding nothing', () => {
    const result = withHeldItem(member('ann', { heldItem: 'berry' }), undefined, progressPack)
    expect(result).toMatchObject({ ok: true, character: { bag: [{ item: 'berry', quantity: 1 }] } })
    expect(result.ok && 'heldItem' in result.character).toBe(false)
  })

  it('must be in the Bag and be something a Pokémon can hold, and changes for a character on its feet only', () => {
    const ann = member('ann', { heldItem: 'berry', bag: bagOf('tonic') })
    expect(withHeldItem(ann, 'charm', progressPack)).toEqual({ ok: false, problem: 'no-item' })
    expect(withHeldItem(ann, 'tonic', progressPack)).toEqual({ ok: false, problem: 'not-holdable' })
    expect(withHeldItem(ann, 'berry', progressPack)).toEqual({ ok: false, problem: 'nothing' })
    expect(withHeldItem(member('ann', { ...downed, heldItem: 'berry', bag: bagOf('charm') }), 'charm', progressPack)).toEqual({ ok: false, problem: 'down' })
    expect(withHeldItem(member('ann', { heldItem: 'berry', bag: [{ item: 'berry', quantity: 999 }] }), undefined, progressPack)).toEqual({ ok: false, problem: 'bag-full' })
  })
})

describe('what a Bag offers to use outside a fight', () => {
  const ids = (keep: (item: (typeof progressPack.items)[string]) => boolean): string[] => Object.values(progressPack.items).filter((item) => item.id in bagged && keep(item)).map((item) => item.id)
  // The items of this file's pack that each do one thing.
  const bagged = { tonic: 1, draught: 1, cureall: 1, salve: 1, ether: 1, elixir: 1, phoenix: 1, sun: 1, ash: 1, flute: 1, xpower: 1, ppup: 1, ppmax: 1, stone: 1, cord: 1, charm: 1 }

  it('is what heals, cures, revives, restores PP or raises them: not what only means something in a fight, is held, or evolves', () => {
    expect(ids((item) => !worksOutsideFight(item))).toEqual(['xpower', 'stone', 'cord', 'charm'])
    // Whatever it does not offer does nothing here, whoever it is used on.
    const ann = member('ann', { hp: 1, status: 'psn', moves: [{ id: 'tackle', ppUps: 0, pp: 0 }], bag: bagOf('xpower', 'stone', 'cord', 'charm') })
    const bob = member('bob', downed)
    for (const item of ids((other) => !worksOutsideFight(other))) {
      expect(use([ann, bob], item, { move: 'tackle' })).toEqual({ ok: false, problem: 'no-effect' })
      expect(use([ann, bob], item, { target: 'character-bob' })).toEqual({ ok: false, problem: 'no-effect' })
    }
  })

  it('asks for a move when the item is for one move only', () => {
    expect(ids(isForOneMove)).toEqual(['ether', 'ppup', 'ppmax'])
  })
})
