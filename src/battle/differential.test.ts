/**
 * Differential tests: where Denborn's format should change nothing, it must
 * produce the very same battle as the unmodified engine.
 *
 * Two against two is the engine's Doubles. Three against three has the reach
 * of the engine's Triples, whose second side is numbered in mirror image; the
 * tests line the two up by name.
 */
import { Battle, Dex, type Pokemon, type PokemonSet, extractChannelMessages, toID } from '@pkmn/sim'
import { describe, expect, it } from 'vitest'
import { type CombatantSetup, DenbornBattle, type RoundAction } from './denborn-battle'
import { seedNumber } from './test-kit'

Dex.formats.extend([
  { name: '[Gen 9] Denborn Reference Doubles', mod: 'gen9', gameType: 'doubles', ruleset: [] },
  { name: '[Gen 9] Denborn Reference Triples', mod: 'gen9', gameType: 'triples', ruleset: [] },
] as never)

interface Member {
  name: string
  species: string
  ability: string
  item?: string
  moves: string[]
}

const IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

function stockSet(member: Member): PokemonSet {
  return {
    name: member.name,
    species: member.species,
    item: member.item ?? '',
    ability: member.ability,
    moves: member.moves,
    nature: 'Hardy',
    gender: 'N',
    evs: EVS,
    ivs: IVS,
    level: 50,
  }
}

function denbornSetup(member: Member): CombatantSetup {
  const setup: CombatantSetup = {
    id: member.name,
    species: member.species,
    level: 50,
    gender: 'N',
    ability: member.ability,
    nature: 'Hardy',
    ivs: IVS,
    evs: EVS,
    // The unmodified engine gives every move its maximum PP.
    moves: member.moves.map((id) => ({ id, ppUps: 3 })),
    // No Agony: 0 HP is a faint, as in the unmodified engine.
    agony: false,
  }
  if (member.item) setup.item = member.item
  return setup
}

function chooser(seed: number) {
  let state = seed >>> 0
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return Math.floor((state / 4294967296) * n)
  }
}

/** A log both engines can be compared on: nothing hidden, no clock, no slot letters, no Denborn lines. */
function comparable(lines: string[]): string[] {
  const everything = extractChannelMessages(lines.join('\n'), [-1])[-1]
  return everything
    .filter((line) => line !== '|' && !line.startsWith('|t:|') && !line.startsWith('|tier|'))
    .filter((line) => !line.startsWith('|denborn|'))
    .map((line) => line.replace(/\b(p[12])[a-f]: /g, '$1: '))
}

function fromFirstTurn(lines: string[]): string[] {
  const start = lines.indexOf('|turn|1')
  return start < 0 ? lines : lines.slice(start)
}

function untilFirstFaint(lines: string[]): string[] {
  const faint = lines.findIndex((line) => line.startsWith('|faint|'))
  return faint < 0 ? lines : lines.slice(0, faint)
}

function byName(battle: Battle, name: string): Pokemon {
  const found = battle.getAllPokemon().find((pokemon) => pokemon.name === name)
  if (!found) throw new Error(`No ${name} in the reference battle`)
  return found
}

interface Plan {
  move: string
  target?: string
}

/** Picks one legal move per standing Pokémon from Denborn's own requests. Locked Pokémon get none. */
function plan(denborn: DenbornBattle, pick: (n: number) => number, allow: (kind: string) => boolean): Map<string, Plan> {
  const plans = new Map<string, Plan>()
  for (const combatant of denborn.combatants()) {
    const request = denborn.request(combatant.id)
    if (!request.canAct || request.forced) continue
    const standingTargets = (targets: string[]) => targets.filter((id) => denborn.combatant(id).hp > 0)
    // Both engines must be able to take the choice: a move that needs a target gets a standing one.
    const usable = request.moves.filter(
      (option) =>
        !option.disabled && allow(option.target) && (!option.needsTarget || standingTargets(option.targets).length > 0),
    )
    const option = usable[pick(usable.length)]
    if (!option) throw new Error(`${combatant.id} has no usable move`)
    const standing = standingTargets(option.targets)
    const target = standing[pick(Math.max(standing.length, 1))]
    plans.set(combatant.id, target === undefined ? { move: option.id } : { move: option.id, target })
  }
  return plans
}

/** Submits the same plan to the unmodified engine, in its own slot order, and plays the turn. */
function playReference(reference: Battle, plans: Map<string, Plan>): void {
  for (const side of reference.sides) {
    for (const pokemon of side.active) {
      if (pokemon.fainted) continue
      const locked = pokemon.getLockedMove()
      if (locked) {
        // The engine wants some slot for a locked move and then uses the stored one.
        if (!side.chooseMove(locked, 1) && !side.chooseMove(locked)) throw new Error(side.choice.error)
        continue
      }
      const chosen = plans.get(pokemon.name)
      if (!chosen) throw new Error(`No plan for ${pokemon.name}`)
      const loc = chosen.target === undefined ? 0 : pokemon.getLocOf(byName(reference, chosen.target))
      if (!side.chooseMove(chosen.move, loc)) throw new Error(`${pokemon.name}: ${side.choice.error}`)
    }
  }
  reference.commitChoices()
}

function playDenborn(denborn: DenbornBattle, plans: Map<string, Plan>): string[] {
  const actions: Record<string, RoundAction> = {}
  for (const [id, chosen] of plans) actions[id] = { type: 'move', ...chosen }
  return denborn.resolveRound({ actions }).log
}

function startBoth(formatId: string, players: Member[], enemies: Member[], referenceEnemies: Member[], seed: string) {
  const reference = new Battle({ formatid: toID(formatId), seed: seed as never })
  reference.setPlayer('p1', { name: 'players', team: players.map(stockSet) })
  reference.setPlayer('p2', { name: 'enemies', team: referenceEnemies.map(stockSet) })
  const denborn = DenbornBattle.start({ seed, players: players.map(denbornSetup), enemies: enemies.map(denbornSetup) })
  return { reference, denborn, denbornLog: [...denborn.opening.log] }
}

const withSplash = (moves: string[]) => [...moves, 'splash']

describe('two against two is the engine\'s Doubles', () => {
  const TEAMS: [Member[], Member[]][] = [
    [
      [
        { name: 'P1', species: 'Venusaur', ability: 'Overgrow', item: 'Leftovers', moves: ['sludgebomb', 'leechseed', 'sleeppowder', 'earthquake', 'gigadrain', 'protect'] },
        { name: 'P2', species: 'Arcanine', ability: 'Intimidate', moves: ['flamethrower', 'extremespeed', 'willowisp', 'crunch', 'heatwave', 'roar'] },
      ],
      [
        { name: 'E1', species: 'Starmie', ability: 'Natural Cure', moves: ['surf', 'icebeam', 'thunderwave', 'psychic', 'rapidspin', 'recover'] },
        { name: 'E2', species: 'Machamp', ability: 'Guts', item: 'Sitrus Berry', moves: ['crosschop', 'rockslide', 'bulkup', 'knockoff', 'machpunch', 'lowkick'] },
      ],
    ],
    [
      [
        { name: 'P1', species: 'Dragonite', ability: 'Inner Focus', moves: ['outrage', 'thunderwave', 'raindance', 'thunder', 'roost', 'dragondance'] },
        { name: 'P2', species: 'Alakazam', ability: 'Synchronize', moves: ['psychic', 'futuresight', 'encore', 'disable', 'reflect', 'trickroom'] },
      ],
      [
        { name: 'E1', species: 'Snorlax', ability: 'Thick Fat', item: 'Chesto Berry', moves: ['bodyslam', 'rest', 'yawn', 'curse', 'substitute', 'earthquake'] },
        { name: 'E2', species: 'Gengar', ability: 'Cursed Body', moves: ['shadowball', 'hypnosis', 'hex', 'sludgebomb', 'confuseray', 'suckerpunch'] },
      ],
    ],
    [
      [
        { name: 'P1', species: 'Gyarados', ability: 'Moxie', moves: ['waterfall', 'taunt', 'icefang', 'bounce', 'thrash', 'hurricane'] },
        { name: 'P2', species: 'Jolteon', ability: 'Volt Absorb', moves: ['thunderbolt', 'yawn', 'pinmissile', 'doublekick', 'agility', 'voltswitch'] },
      ],
      [
        { name: 'E1', species: 'Exeggutor', ability: 'Chlorophyll', moves: ['sleeppowder', 'gigadrain', 'stunspore', 'psyshock', 'synthesis', 'leafstorm'] },
        { name: 'E2', species: 'Tauros', ability: 'Anger Point', moves: ['bodyslam', 'earthquake', 'rockslide', 'pursuit', 'swagger', 'hyperbeam'] },
      ],
    ],
  ]

  it('plays the same battle, line for line, to the end', () => {
    let turns = 0
    let finished = 0
    for (const [players, enemies] of TEAMS) {
      for (let n = 1; n <= 12; n++) {
        const seed = seedNumber(n)
        const { reference, denborn, denbornLog } = startBoth('gen9denbornreferencedoubles', players, enemies, enemies, seed)
        const pick = chooser(n)

        for (let round = 0; round < 40 && !denborn.ended; round++) {
          const plans = plan(denborn, pick, () => true)
          playReference(reference, plans)
          denbornLog.push(...playDenborn(denborn, plans))
        }

        expect(comparable(denbornLog), `seed ${seed}`).toEqual(comparable(reference.log))
        expect(denborn.ended).toBe(reference.ended)
        turns += reference.turn
        if (reference.ended) finished++
      }
    }
    // Real fights, most of them fought to the end.
    expect(turns).toBeGreaterThan(36 * 4)
    expect(finished).toBeGreaterThan(18)
  })
})

describe('three against three has the reach of the engine\'s Triples', () => {
  // Six different Speeds, so that nothing is settled by a coin flip.
  const PLAYERS: Member[] = [
    { name: 'P1', species: 'Jolteon', ability: 'Volt Absorb', moves: withSplash(['thunderbolt', 'swift', 'earthquake', 'thunderwave', 'aerialace']) },
    { name: 'P2', species: 'Machamp', ability: 'No Guard', moves: withSplash(['crosschop', 'swift', 'earthquake', 'bulkup', 'aerialace']) },
    { name: 'P3', species: 'Snorlax', ability: 'Thick Fat', moves: withSplash(['bodyslam', 'swift', 'earthquake', 'amnesia', 'aerialace']) },
  ]
  // In table order, left to right.
  const ENEMIES: Member[] = [
    { name: 'E1', species: 'Starmie', ability: 'Natural Cure', moves: withSplash(['psychic', 'swift', 'earthquake', 'recover', 'aerialace']) },
    { name: 'E2', species: 'Chansey', ability: 'Natural Cure', moves: withSplash(['seismictoss', 'swift', 'earthquake', 'softboiled', 'aerialace']) },
    { name: 'E3', species: 'Rhydon', ability: 'Rock Head', moves: withSplash(['rockblast', 'swift', 'earthquake', 'swordsdance', 'aerialace']) },
  ]
  // The engine numbers the second side from its own left: the mirror image of the table.
  const MIRRORED = [...ENEMIES].reverse()
  const NAMES = [...PLAYERS, ...ENEMIES].map((member) => member.name)

  const start = (seed: string) => startBoth('gen9denbornreferencetriples', PLAYERS, ENEMIES, MIRRORED, seed)

  it('offers the same targets from every slot', () => {
    const { reference, denborn } = start('1,2,3,4')
    for (const user of NAMES) {
      for (const moveId of ['thunderbolt', 'crosschop', 'bodyslam', 'psychic', 'seismictoss', 'rockblast', 'aerialace']) {
        const option = denborn.request(user).moves.find((candidate) => candidate.id === moveId)
        if (!option) continue
        const expected = NAMES.filter((other) =>
          reference.validTarget(byName(reference, other), byName(reference, user), option.target),
        )
        expect([...option.targets].sort(), `${user} ${moveId}`).toEqual(expected.sort())
      }
    }
  })

  it('makes spread moves hit the same Pokémon from every slot', () => {
    const hurt = (battle: { name: string; hp: number; maxHp: number }[]) =>
      battle.filter((entry) => entry.hp < entry.maxHp).map((entry) => entry.name).sort()

    for (const user of NAMES) {
      for (const moveId of ['swift', 'earthquake']) {
        const { reference, denborn } = start('1,2,3,4')
        const plans = new Map<string, Plan>(NAMES.map((name) => [name, { move: name === user ? moveId : 'splash' }]))
        playReference(reference, plans)
        playDenborn(denborn, plans)

        const expected = hurt(reference.getAllPokemon().map((pokemon) => ({ name: pokemon.name, hp: pokemon.hp, maxHp: pokemon.maxhp })))
        const actual = hurt(denborn.combatants().map((combatant) => ({ name: combatant.id, hp: combatant.hp, maxHp: combatant.maxHp })))
        expect(actual, `${user} ${moveId}`).toEqual(expected)
        expect(actual.length).toBeGreaterThan(0)
      }
    }
  })

  it('plays the same battle with single-target moves, up to the first faint', () => {
    // Spread moves are left out here: the two engines list a spread move's targets in opposite
    // orders on the second side, so each target draws a different damage roll.
    const singleTarget = (kind: string) => !kind.startsWith('all') || kind === 'allySide' || kind === 'allyTeam'
    let compared = 0
    for (let n = 1; n <= 16; n++) {
      const seed = seedNumber(n)
      const { reference, denborn, denbornLog } = start(seed)
      const pick = chooser(n)

      for (let round = 0; round < 10 && !reference.log.some((line) => line.startsWith('|faint|')); round++) {
        const plans = plan(denborn, pick, singleTarget)
        playReference(reference, plans)
        denbornLog.push(...playDenborn(denborn, plans))
      }

      const expected = untilFirstFaint(fromFirstTurn(comparable(reference.log)))
      const actual = untilFirstFaint(fromFirstTurn(comparable(denbornLog)))
      expect(actual, `seed ${seed}`).toEqual(expected)
      compared += expected.length
    }
    // Every battle was compared over a real stretch of play.
    expect(compared).toBeGreaterThan(16 * 15)
  })
})
