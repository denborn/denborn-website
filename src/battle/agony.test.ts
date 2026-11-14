import { describe, expect, it } from 'vitest'
import { BattleRuleError } from './denborn-battle'
import { bag, enemy, eventsOf, move, player, round, seedNumber, start, struggle, timeline } from './test-kit'

const REVIVE = { revive: 'half' } as const
const POTION = { heal: 20 } as const

describe('Agony rules 1 to 3: going down and the Agony turn', () => {
  it('downs a player at 0 HP with 3 stacks, cures its status and skips its turn that round', () => {
    const battle = start(
      [player('victim', 'Chansey', ['tackle'], { hp: 1, status: 'par' }), player('ally', 'Machamp', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle'])],
    )
    expect(battle.combatant('victim').status).toBe('par')

    const result = round(battle, { victim: move('tackle', 'brute'), brute: move('tackle', 'victim') })

    // The hit that downs it removes no stack, and nothing is shown for its own turn.
    expect(result.events).toEqual([{ type: 'downed', id: 'victim', stacks: 3 }])
    expect(timeline(battle, result).filter((step) => step.includes('victim') && !step.startsWith('move brute'))).toEqual([
      'downed victim 3',
    ])
    expect(battle.combatant('victim')).toMatchObject({ hp: 0, downed: true, dead: false, stacks: 3, status: '' })
  })

  it('refuses any action from a downed Pokémon', () => {
    const battle = start(
      [player('victim', 'Chansey', ['tackle'], { hp: 1 }), player('ally', 'Machamp', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle'])],
    )
    round(battle, { brute: move('tackle', 'victim') })

    expect(battle.request('victim')).toEqual({ canAct: false, forced: null, moves: [] })
    expect(() => round(battle, { victim: move('splash') })).toThrow(BattleRuleError)
    expect(() => battle.run('victim', 1)).toThrow(BattleRuleError)
    expect(() => battle.run('ally', 0)).toThrow(BattleRuleError)
    expect(() => battle.exchangeSpeed('victim', 'ally')).toThrow(BattleRuleError)
  })

  it('takes one stack on each later round, then kills at 0 and leaves the slot in place', () => {
    const battle = start(
      [player('victim', 'Chansey', ['tackle'], { hp: 1 }), player('ally', 'Machamp', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle'])],
    )
    round(battle, { brute: move('tackle', 'victim') })

    expect(round(battle).events).toEqual([{ type: 'agonizing', id: 'victim', stacks: 2 }])
    expect(round(battle).events).toEqual([{ type: 'agonizing', id: 'victim', stacks: 1 }])
    expect(round(battle).events).toEqual([
      { type: 'agonizing', id: 'victim', stacks: 0 },
      { type: 'died', id: 'victim' },
    ])

    expect(battle.combatant('victim')).toMatchObject({ downed: false, dead: true, stacks: 0, position: 0 })
    expect(battle.combatant('ally').position).toBe(1)
    expect(battle.ended).toBe(false)
    // A dead Pokémon is nobody's target any more, and gets no further turn.
    expect(battle.request('brute').moves.find((option) => option.id === 'tackle')?.targets).toEqual(['ally'])
    expect(round(battle).events).toEqual([])
  })

  it('places the Agony turn by the downed Pokémon\'s own Speed, reversed under Trick Room', () => {
    // Speeds: fast > mid > foe > slow.
    const battle = start(
      [
        player('fast', 'Jolteon', ['tackle']),
        player('mid', 'Machamp', ['tackle'], { hp: 1 }),
        player('slow', 'Snorlax', ['trickroom']),
      ],
      [enemy('foe', 'Chansey', ['tackle'])],
    )
    round(battle, { foe: move('tackle', 'mid') })

    const order = (steps: string[]) => steps.filter((step) => /^(move|agonizing)/.test(step)).map((step) => step.split(' ')[1])

    // Trick Room goes last and only changes the next round.
    expect(order(timeline(battle, round(battle, { slow: move('trickroom') })))).toEqual(['fast', 'mid', 'foe', 'slow'])
    expect(order(timeline(battle, round(battle)))).toEqual(['slow', 'foe', 'mid', 'fast'])
  })

  it('keeps the Agony turn in Speed order when Speeds change during the round', () => {
    // Speeds: lead > mid > late. Tailwind doubles late's Speed, which then passes mid's.
    const battle = start(
      [
        player('lead', 'Jolteon', ['tailwind']),
        player('mid', 'Machamp', ['tackle'], { hp: 1 }),
        player('late', 'Rhydon', ['tackle']),
      ],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    round(battle, { foe: move('tackle', 'mid') })

    const steps = timeline(battle, round(battle, { lead: move('tailwind') }))
    const order = steps.filter((step) => /^(move|agonizing)/.test(step)).map((step) => step.split(' ')[1])
    expect(order).toEqual(['lead', 'late', 'mid', 'foe'])
  })
})

describe('Agony rule 4: hits on a downed Pokémon', () => {
  function downedVictim(species = 'Machamp', options: { seed?: string } = {}) {
    const battle = start(
      [player('victim', species, ['tackle'], { hp: 1 }), player('ally', 'Chansey', ['tackle'])],
      [
        enemy('quick', 'Jolteon', ['tackle', 'thunderbolt', 'toxic', 'zapcannon', 'earthquake']),
        enemy('slow', 'Snorlax', ['tackle']),
      ],
      options,
    )
    round(battle, { quick: move('tackle', 'victim') })
    return battle
  }

  it('removes one extra stack per round at most, on top of the Agony turn', () => {
    const battle = downedVictim()
    const result = round(battle, { quick: move('tackle', 'victim'), slow: move('tackle', 'victim') })

    expect(timeline(battle, result).filter((step) => step.startsWith('ago'))).toEqual([
      'agonyhit victim 2',
      'agonizing victim 1',
      'agonyhit victim 1 capped',
    ])
    expect(battle.combatant('victim').stacks).toBe(1)
  })

  it('removes nothing when the move is stopped by a type immunity', () => {
    const battle = downedVictim('Sandshrew')
    const result = round(battle, { quick: move('thunderbolt', 'victim') })

    expect(eventsOf(result, 'agonyhit')).toEqual([])
    expect(result.log.some((entry) => entry.startsWith('|-immune|'))).toBe(true)
  })

  it('removes nothing for a status move', () => {
    const battle = downedVictim()
    expect(eventsOf(round(battle, { quick: move('toxic', 'victim') }), 'agonyhit')).toEqual([])
    expect(battle.combatant('victim').status).toBe('')
  })

  it('ignores the downed Pokémon\'s Ability: Earthquake hits a downed Levitate user', () => {
    const battle = downedVictim('Koffing')
    expect(eventsOf(round(battle, { quick: move('earthquake') }), 'agonyhit')).toHaveLength(1)
  })

  it('uses the engine\'s accuracy roll: a move either misses or removes a stack', () => {
    let hits = 0
    let misses = 0
    for (let n = 1; n <= 40; n++) {
      const battle = downedVictim('Machamp', { seed: seedNumber(n) })
      const result = round(battle, { quick: move('zapcannon', 'victim') })
      const hit = eventsOf(result, 'agonyhit').length === 1
      const missed = result.log.some((entry) => entry.startsWith('|-miss|'))
      expect(hit).not.toBe(missed)
      if (hit) hits++
      else misses++
    }
    expect(hits).toBeGreaterThan(0)
    expect(misses).toBeGreaterThan(0)
  })

  it('counts an ally\'s spread move too', () => {
    const battle = start(
      [player('quake', 'Machamp', ['earthquake']), player('victim', 'Chansey', ['tackle'], { hp: 1 })],
      [enemy('brute', 'Jolteon', ['tackle'])],
    )
    round(battle, { brute: move('tackle', 'victim') })

    expect(eventsOf(round(battle, { quake: move('earthquake') }), 'agonyhit')).toEqual([
      { type: 'agonyhit', id: 'victim', stacks: 2, capped: false },
    ])
  })

  it('lets Wide Guard and Quick Guard protect a downed teammate', () => {
    const guarded = (guard: string, attack: string, aimed: boolean) => {
      const battle = start(
        [player('hero', 'Jolteon', ['tackle', 'swift', 'quickattack'])],
        [
          enemy('victim', 'Rattata', ['tackle'], { hp: 1, agony: true }),
          enemy('guard', 'Machamp', ['wideguard', 'quickguard']),
        ],
      )
      round(battle, { hero: move('tackle', 'victim') })
      const result = round(battle, { hero: aimed ? move(attack, 'victim') : move(attack), guard: move(guard) })
      return eventsOf(result, 'agonyhit').length
    }

    expect(guarded('wideguard', 'swift', false)).toBe(0)
    expect(guarded('quickguard', 'quickattack', true)).toBe(0)
    // Each guard only stops its own kind of move.
    expect(guarded('quickguard', 'swift', false)).toBe(1)
    expect(guarded('wideguard', 'quickattack', true)).toBe(1)
  })

  it('does nothing when Future Sight lands on a downed Pokémon', () => {
    const battle = start(
      [player('seer', 'Alakazam', ['futuresight']), player('hitter', 'Jolteon', ['tackle'])],
      [enemy('victim', 'Snorlax', ['tackle'], { hp: 1, agony: true }), enemy('other', 'Chansey', ['tackle'])],
    )
    round(battle, { seer: move('futuresight', 'victim') })
    round(battle, { hitter: move('tackle', 'victim') })
    // Future Sight lands at the end of this round; only the Agony turn costs a stack.
    expect(round(battle).events).toEqual([{ type: 'agonizing', id: 'victim', stacks: 2 }])
  })
})

describe('where a move goes when its target is downed', () => {
  // Players at x = -1.5 … 1.5, enemies at x = -0.5 and 0.5: A reaches only the left enemy.
  function fourAgainstTwo(options: { seed?: string } = {}) {
    return start(
      [
        player('A', 'Machamp', ['tackle', 'highjumpkick', 'hyperbeam']),
        player('B', 'Jolteon', ['tackle', 'swift']),
        player('C', 'Rattata', ['tackle']),
        player('D', 'Rattata', ['tackle']),
      ],
      [enemy('left', 'Chansey', ['tackle'], { hp: 1, agony: true }), enemy('right', 'Snorlax', ['tackle'])],
      options,
    )
  }

  it('redirects to a standing foe in reach when the target went down earlier in the round', () => {
    const battle = fourAgainstTwo()
    const result = round(battle, { B: move('tackle', 'left'), C: move('tackle', 'left') })

    expect(timeline(battle, result)).toContain('move C tackle right')
    expect(eventsOf(result, 'agonyhit')).toEqual([])
    expect(battle.combatant('right').hp).toBeLessThan(battle.combatant('right').maxHp)
  })

  it('goes at the downed target when no standing foe is in reach', () => {
    const battle = fourAgainstTwo()
    const result = round(battle, { B: move('tackle', 'left'), A: move('tackle', 'left') })

    // The round it went down has no Agony turn, but a later hit still costs a stack.
    expect(eventsOf(result, 'agonyhit')).toEqual([{ type: 'agonyhit', id: 'left', stacks: 2, capped: false }])
  })

  it('stays on a foe that was already downed when the move was locked', () => {
    const battle = fourAgainstTwo()
    round(battle, { B: move('tackle', 'left') })
    const before = battle.combatant('right').hp

    const result = round(battle, { C: move('tackle', 'left') })
    expect(eventsOf(result, 'agonyhit')).toHaveLength(1)
    expect(battle.combatant('right').hp).toBe(before)
  })

  it('sends a random-target move at a standing foe first, at a downed one only as a last resort', () => {
    for (let n = 1; n <= 20; n++) {
      const battle = fourAgainstTwo({ seed: seedNumber(n) })
      round(battle, { B: move('tackle', 'left') })

      // B reaches both enemies: always the standing one. A reaches only the downed one.
      const result = round(battle, { B: struggle, A: struggle })
      const steps = timeline(battle, result)
      expect(steps).toContain('move B struggle right')
      expect(steps).toContain('move A struggle left')
    }
  })

  it('counts a downed foe in reach as a target for the spread reduction', () => {
    const spreadLines = (agony: boolean) => {
      const battle = start(
        [player('caster', 'Jolteon', ['swift', 'tackle'])],
        [enemy('left', 'Rattata', ['tackle'], { hp: 1, agony }), enemy('right', 'Snorlax', ['tackle'])],
        { debug: true },
      )
      round(battle, { caster: move('tackle', 'left') })
      const result = round(battle, { caster: move('swift') })
      return result.log.filter((entry) => entry.includes('Spread modifier')).length
    }

    // Downed: two targets, so the standing one takes reduced damage. Fainted for good: one target, full damage.
    expect(spreadLines(true)).toBe(1)
    expect(spreadLines(false)).toBe(0)
  })

  it('costs the user nothing but PP when its only target is downed', () => {
    const battle = fourAgainstTwo()
    round(battle, { B: move('tackle', 'left') })
    const ppBefore = battle.combatant('A').moves.find((slot) => slot.id === 'highjumpkick')?.pp ?? 0

    const kick = round(battle, { A: move('highjumpkick', 'left') })
    expect(eventsOf(kick, 'agonyhit')).toHaveLength(1)
    // No crash damage, although the move did no damage.
    expect(battle.combatant('A').hp).toBe(battle.combatant('A').maxHp)
    expect(battle.combatant('A').moves.find((slot) => slot.id === 'highjumpkick')?.pp).toBe(ppBefore - 1)

    round(battle, { A: move('hyperbeam', 'left') })
    // No recharge either: the next round is a free choice.
    expect(battle.request('A').forced).toBeNull()
    expect(battle.combatant('A').volatiles).not.toContain('mustrecharge')
  })
})

describe('Agony rules 5 to 7: revival', () => {
  function withMedic() {
    const battle = start(
      [player('victim', 'Gyarados', ['tackle'], { hp: 1, ability: 'Intimidate' }), player('medic', 'Chansey', ['healpulse'])],
      [enemy('brute', 'Jolteon', ['tackle', 'thunderbolt'], { level: 100 })],
    )
    round(battle, { brute: move('tackle', 'victim') })
    return battle
  }

  it('lets nothing but a revival item heal a downed Pokémon', () => {
    const battle = withMedic()

    const potion = round(battle, { medic: bag('potion', 'victim', POTION) })
    expect(eventsOf(potion, 'bag')).toEqual([
      { type: 'bag', user: 'medic', item: 'potion', target: 'victim', outcome: 'failed' },
    ])
    round(battle, { medic: move('healpulse', 'victim') })
    expect(battle.combatant('victim')).toMatchObject({ hp: 0, downed: true, stacks: 1 })
  })

  it('ends Agony on revival, skips the rest of that round, and starts over at 3 stacks if downed again', () => {
    const battle = withMedic()

    const revival = round(battle, { medic: bag('revive', 'victim', REVIVE) })
    const victim = battle.combatant('victim')
    // The Bag comes before the Agony turn, so the revived Pokémon has no turn at all this round.
    expect(revival.events).toEqual([
      { type: 'revived', id: 'victim', hp: Math.floor(victim.maxHp / 2) },
      { type: 'bag', user: 'medic', item: 'revive', target: 'victim', outcome: 'used' },
    ])
    expect(victim).toMatchObject({ hp: Math.floor(victim.maxHp / 2), downed: false, dead: false, stacks: 0 })

    expect(battle.request('victim').canAct).toBe(true)
    const again = round(battle, { victim: move('tackle', 'brute'), brute: move('thunderbolt', 'victim') })
    expect(again.events).toEqual([{ type: 'downed', id: 'victim', stacks: 3 }])
  })

  it('does not trigger an entry Ability again on revival', () => {
    const battle = start(
      [player('victim', 'Gyarados', ['tackle'], { hp: 1, ability: 'Intimidate' }), player('medic', 'Chansey', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle'])],
    )
    // Intimidate lowered the foe's Attack once, on entry.
    expect(battle.opening.log.filter((entry) => entry.includes('Intimidate'))).toHaveLength(1)
    expect(battle.combatant('brute').boosts).toEqual({ atk: -1 })

    round(battle, { brute: move('tackle', 'victim') })
    const revival = round(battle, { medic: bag('revive', 'victim', REVIVE) })

    expect(revival.log.some((entry) => entry.includes('Intimidate'))).toBe(false)
    expect(battle.combatant('brute').boosts).toEqual({ atk: -1 })
  })

  it('makes the Ability work again after revival', () => {
    const battle = start(
      [player('victim', 'Koffing', ['tackle'], { hp: 1 }), player('medic', 'Chansey', ['tackle'])],
      [enemy('brute', 'Jolteon', ['tackle', 'earthquake'])],
    )
    round(battle, { brute: move('tackle', 'victim') })
    round(battle, { medic: bag('maxrevive', 'victim', { revive: 'full' }) })

    const quake = round(battle, { brute: move('earthquake') })
    expect(quake.log.some((entry) => entry.startsWith('|-immune|') && entry.includes('Levitate'))).toBe(true)
    expect(battle.combatant('victim').hp).toBe(battle.combatant('victim').maxHp)
  })

  it('keeps an Ability that was switched on when the Pokémon entered switched on after revival', () => {
    // Unnerve stops foes from eating Berries; a Sitrus Berry is eaten at half HP or less.
    const eaterMaxHp = start([player('x', 'Rattata', ['tackle'])], [enemy('eater', 'Snorlax', ['tackle'])]).combatant('eater').maxHp
    const berryAfter = (revive: boolean) => {
      const battle = start(
        [
          player('unnerver', 'Aerodactyl', ['tackle'], { hp: 1, ability: 'Unnerve' }),
          player('medic', 'Chansey', ['tackle']),
        ],
        // One point above half HP: any hit brings the Berry into play.
        [enemy('eater', 'Snorlax', ['tackle'], { item: 'Sitrus Berry', hp: Math.floor(eaterMaxHp / 2) + 1 })],
      )
      round(battle, { eater: move('tackle', 'unnerver') })
      if (revive) round(battle, { medic: bag('maxrevive', 'unnerver', { revive: 'full' }) })
      round(battle, { medic: move('tackle', 'eater') })
      return battle.combatant('eater').item
    }

    // With Unnerve's owner still downed the Berry is eaten; once it is revived, Unnerve holds again.
    expect(berryAfter(false)).toBe('')
    expect(berryAfter(true)).toBe('sitrusberry')
  })
})

describe('Agony rules 8 to 10: death and the end of the battle', () => {
  it('makes an enemy without Agony faint for good, and gives the players the win', () => {
    const battle = start([player('hero', 'Jolteon', ['tackle'])], [enemy('foe', 'Rattata', ['tackle'], { hp: 1 })])
    const result = round(battle, { hero: move('tackle', 'foe') })

    expect(result.events).toEqual([{ type: 'fainted', id: 'foe' }])
    expect(battle.combatant('foe')).toMatchObject({ downed: false, dead: true })
    expect(battle.outcome).toBe('players')
    expect(() => round(battle)).toThrow(BattleRuleError)
  })

  it('downs an enemy whose Agony switch is on', () => {
    const battle = start(
      [player('hero', 'Jolteon', ['tackle'])],
      [enemy('foe', 'Rattata', ['tackle'], { hp: 1, agony: true }), enemy('other', 'Snorlax', ['tackle'])],
    )
    expect(round(battle, { hero: move('tackle', 'foe') }).events).toEqual([{ type: 'downed', id: 'foe', stacks: 3 }])
    expect(battle.ended).toBe(false)
  })

  it('ends the battle as soon as every Pokémon of a side is downed, with their stacks kept', () => {
    const battle = start(
      [player('one', 'Rattata', ['tackle'], { hp: 1 }), player('two', 'Rattata', ['tackle'], { hp: 1 })],
      [enemy('foe', 'Jolteon', ['swift'])],
    )
    round(battle, { foe: move('swift') })

    expect(battle.outcome).toBe('enemies')
    expect(battle.combatants().filter((combatant) => combatant.side === 'players')).toMatchObject([
      { id: 'one', downed: true, stacks: 3 },
      { id: 'two', downed: true, stacks: 3 },
    ])
  })

  it('calls a tie when both sides are out at the same moment', () => {
    const battle = start([player('bomb', 'Electrode', ['explosion'])], [enemy('foe', 'Rattata', ['tackle'], { hp: 1 })])
    round(battle, { bomb: move('explosion') })

    expect(battle.outcome).toBe('tie')
    expect(battle.combatant('bomb')).toMatchObject({ downed: true, stacks: 3 })
  })

  it('refuses to place a Pokémon at 0 HP on a line', () => {
    expect(() => start([player('out', 'Rattata', ['tackle'], { hp: 0 })], [enemy('foe', 'Rattata', ['tackle'])])).toThrow(
      BattleRuleError,
    )
  })
})
