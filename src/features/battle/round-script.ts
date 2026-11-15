/**
 * A round as it is told: the engine's log turned into steps, each with what
 * is said, who comes onto the scene, and how the Pokémon stand after it
 * (decision 91). Playing the steps one after the other, from how everyone
 * stood before the round, ends exactly where the fight now stands.
 *
 * The steps only show what the engine decided. Which message a line gets
 * follows the way Pokémon Showdown reads its own log (battle-text-parser.ts
 * of its client, MIT licence): the engine writes the line, that reading names
 * the message (`start.disable`, `damage.brn`, `block.protect`), and the games'
 * own text says it (decision 154). A message the games have no sentence for
 * is not said, and its effect (HP, status) is still played; a kind of line
 * this module does not know at all is listed in `unknown`, so that a test can
 * say so.
 */
import type { PlayerFight } from '../../shared/protocol/battle'

type Combatant = PlayerFight['combatants'][number]
type Played = PlayerFight['last']

/** What is said at a step: a message by its name, and what fills its gaps (combatant ids, the ids of a move, an item, an Ability, a type). */
export interface Said {
  key: string
  /** The Pokémon the sentence names, in the order of its gaps: the first is the one the engine's line is about. */
  pokemon?: string[]
  /** The Pokémon the line came from, and the one it is aimed at, when the sentence names them. */
  source?: string | undefined
  target?: string | undefined
  move?: string | undefined
  item?: string | undefined
  ability?: string | undefined
  type?: string | undefined
  number?: number | undefined
}

export interface Step {
  said?: Said
  /** The Pokémon this step is about, the one acting first: they come onto the scene. */
  show: string[]
  /** What changes for a Pokémon at this step. */
  change?: { id: string; hp?: number; status?: string; downed?: boolean; dead?: boolean; stacks?: number }
  /** What the sprites do: the one acting lunges, the one hit recoils. */
  motion?: { attack?: string; hit?: string }
}

export interface RoundScript {
  steps: Step[]
  /** Kinds of line the engine wrote that this module has never heard of. */
  unknown: string[]
}

/** Kinds of line that say nothing and change nothing a player is shown: they are passed over. */
const SILENT = new Set([
  '', 'turn', 'upkeep', 'start', 'split', 'debug', 'player', 'teamsize', 'gametype', 'gen', 'tier', 'rule', 'switch', 'drag', 'swap', 'win', 'tie', 'faint', 't:', 'done', 'request', 'error',
  '-hint', '-message', '-anim', '-mustrecharge', '-swapsideconditions', '-formechange', 'detailschange', 'replace',
  '-zpower', '-zbroken', '-mega', '-primal', '-burst', '-terastallize', '-center', '-combine', '-candynamax',
])

const STATUSES = new Set(['brn', 'par', 'slp', 'psn', 'tox', 'frz'])
const STATS = new Set(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'])
/** The stats as the engine spells them where a drop was stopped. */
const STAT_IDS: Record<string, string> = { Attack: 'atk', Defense: 'def', 'Special Attack': 'spa', 'Special Defense': 'spd', Speed: 'spe' }
/** What the engine writes as "activated" when it stopped something: read as a block. */
const BLOCKS = new Set([
  'ingrain', 'quickguard', 'wideguard', 'craftyshield', 'matblock', 'protect', 'mist', 'safeguard', 'electricterrain', 'mistyterrain', 'psychicterrain',
  'telepathy', 'stickyhold', 'suctioncups', 'aromaveil', 'flowerveil', 'sweetveil', 'disguise', 'safetygoggles', 'protectivepads',
])
/** What the engine writes as "activated" when it took hold of a Pokémon: read as a start. */
const HOLDS = new Set(['bind', 'wrap', 'clamp', 'whirlpool', 'firespin', 'magmastorm', 'sandtomb', 'infestation', 'snaptrap', 'thundercage', 'trapped'])
const ABILITIES_THAT_STOP_A_MOVE = new Set(['ability: Damp', 'ability: Dazzling', 'ability: Queenly Majesty', 'ability: Armor Tail'])
const ABILITIES_THAT_ABSORB = new Set(['dryskin', 'eartheater', 'voltabsorb', 'waterabsorb'])
const TAKES_AN_ITEM = new Set(['thief', 'covet', 'bestow', 'magician', 'pickpocket'])
/** What a Pokémon cannot be given twice: the failure says it already has it. */
const ALREADY = new Set(['brn', 'frz', 'par', 'psn', 'slp', 'substitute', 'shedtail'])
const WEATHER_MOVES = new Set(['sunnyday', 'raindance', 'sandstorm', 'hail', 'snowscape', 'chillyreception'])

/** An engine name as an id: "move: Leech Seed" and "Leech Seed" both give "leechseed". */
const idOf = (name: string | undefined): string => (name ?? '').replace(/^[a-z]+:\s*/i, '').toLowerCase().replace(/[^a-z0-9]/g, '')
/** The item an effect is, when it is one: "item: Leftovers" gives "leftovers". */
const itemOf = (effect: string | undefined): string | undefined => (effect?.startsWith('item:') ? idOf(effect) : undefined)
/** A type a sentence can name: one, not the two of "Water/Ground". */
const oneType = (types: string): string | undefined => (types.includes('/') ? undefined : idOf(types))
/** The HP a line gives: "35/100", "35/100 brn" or "0 fnt". */
const hpOf = (field: string | undefined): number | undefined => {
  const match = /^(\d+)/.exec(field ?? '')
  return match ? Number(match[1]) : undefined
}

/** A line of the log: its kind, its arguments, and its tags ("[from] item: Leftovers", "[of] <id>", "[silent]"). */
interface Line {
  kind: string
  args: string[]
  tags: Record<string, string>
}

function lineOf(text: string): Line {
  const [, kind = '', ...args] = text.split('|')
  const tags: Record<string, string> = {}
  for (let last = args.at(-1); last?.startsWith('[') && last.indexOf(']') > 0; last = args.at(-1)) {
    const close = last.indexOf(']')
    // A tag without a value is still there.
    tags[last.slice(1, close)] = last.slice(close + 1).trim() || '.'
    args.pop()
  }
  return { kind, args, tags }
}

/** The engine still writes some lines in an older shape: each is read as the line it stands for. */
function modern(line: Line): Line {
  const { kind, args, tags } = line
  const [pokemon = '', effect = '', third = '', fourth = ''] = args
  const id = idOf(effect)
  switch (kind) {
    case '-activate': {
      if (tags.item || tags.move || tags.number || tags.ability) return line
      const target = tags.of
      if (tags.block) return { kind: '-fail', args: [pokemon], tags }
      if (id === 'wonderguard') return { kind: '-immune', args: [pokemon], tags: { from: 'ability: Wonder Guard' } }
      if (BLOCKS.has(id)) return target ? { kind: '-block', args: [target, effect, third], tags: { ...tags, of: pokemon } } : { kind: '-block', args: [pokemon, effect, third], tags }
      if (id === 'charge') return { kind: '-singlemove', args: [pokemon, effect], tags: target ? { of: target } : {} }
      if (HOLDS.has(id)) return { kind: '-start', args: [pokemon, effect], tags: target ? { of: target } : {} }
      if (id === 'fairylock') return { kind: '-fieldactivate', args: [effect], tags: {} }
      const more: Record<string, string> = {}
      if (id === 'symbiosis' || id === 'poltergeist') more.item = third
      else if (id === 'magnitude') more.number = third
      else if (['skillswap', 'mummy', 'lingeringaroma', 'wanderingspirit'].includes(id)) Object.assign(more, { ability: third, ability2: fourth })
      else if (['eeriespell', 'spite', 'grudge', 'forewarn', 'sketch', 'leppaberry'].includes(id)) Object.assign(more, { move: third, number: fourth })
      return { kind, args: [pokemon, effect, target ?? ''], tags: { ...tags, ...more } }
    }
    case '-fail':
      if (tags.from === 'ability: Flower Veil') return { kind: '-block', args: [tags.of ?? '', 'ability: Flower Veil'], tags: { of: pokemon } }
      if (effect === 'unboost' && third) return { kind, args: [pokemon, effect, STAT_IDS[third] ?? idOf(third)], tags }
      return line
    case '-start':
      return tags.from === 'Protean' || tags.from === 'Color Change' ? { ...line, tags: { ...tags, from: `ability: ${tags.from}` } } : line
    case 'move':
      return tags.from === 'Magic Bounce' ? { ...line, tags: { ...tags, from: 'ability: Magic Bounce' } } : line
    case 'cant':
      return ABILITIES_THAT_STOP_A_MOVE.has(effect) ? { kind: '-block', args: [pokemon, effect, third, tags.of ?? ''], tags: {} } : line
    case '-heal': {
      if (!ABILITIES_THAT_ABSORB.has(idOf(tags.from))) return line
      const rest = { ...tags }
      delete rest.of
      return { ...line, tags: rest }
    }
    case '-restoreboost':
      return { ...line, kind: '-clearnegativeboost' }
    case '-nothing':
      return { kind: '-activate', args: ['', 'move: Splash', ''], tags }
    default:
      return line
  }
}

/** An Ability that shows itself, and whose it is. */
interface Shown {
  ability: string
  holder: string
}

/** What a line says: the Abilities it shows first, then the first of these messages that the games have a sentence for. */
interface Told {
  abilities: Shown[]
  tries: Said[]
}

type Gaps = Omit<Said, 'key'>
type Team = 'party' | 'foes'

/** What the line-by-line reading needs to know of the round around a line. */
interface Around {
  /** How many Pokémon the last move was aimed at: with several, a result says on whom. */
  targets: number
  /** Whose team a Pokémon is in, for a player: "your team" or "the opposing team". */
  teamOf: (id: string) => Team | undefined
  /** The Berry a Pokémon ate on the line just before, if it did. */
  eatenBy: (id: string) => string | undefined
}

/** The Ability an effect is, shown as its holder's: nothing for an effect that is not an Ability. */
const shown = (effect: string | undefined, holder: string | undefined): Shown[] => (effect?.startsWith('ability:') && holder ? [{ ability: idOf(effect), holder }] : [])

/** The messages to try for one kind of message: each effect's own, in order, then the one that is said of any effect. */
function tries(template: string, effects: readonly (string | undefined)[], gaps: Gaps, orOfAny = true): Said[] {
  const own = effects.flatMap((effect) => (effect ? [{ key: `${template}.${idOf(effect)}`, ...gaps }] : []))
  return orOfAny ? [...own, { key: template, ...gaps }] : own
}

/** A message said of a whole team: the games word it once for the player's own and once for the other. */
const ofTeam = (template: string, effect: string, team: Team | undefined): Said[] => (team ? [{ key: `${template}.${effect}.${team}` }] : [])

/** What one line of the log says. Nothing for a kind of line that is not told here. */
function messagesOf({ kind, args, tags }: Line, around: Around): Told | undefined {
  const [pokemon = '', second = '', third = '', fourth = ''] = args
  const { from, of } = tags
  const fromAbility = shown(from, of || pokemon)
  const about: Gaps = { pokemon: [pokemon] }

  switch (kind) {
    case 'move':
      return { abilities: fromAbility, tries: tries('move', [from], { ...about, move: idOf(second) }) }

    case 'cant': {
      const gaps = { ...about, move: third ? idOf(third) : undefined }
      return { abilities: shown(second, of || pokemon), tries: [...tries('cant', [second], gaps, false), { key: third ? 'cant' : 'cantNoMove', ...gaps }] }
    }

    case '-start': {
      const id = idOf(second)
      const own = shown(second, pokemon)
      const abilities = own.length > 0 ? own : fromAbility
      if (id === 'typechange') return { abilities, tries: tries('typeChange', [from], { ...about, type: oneType(third), source: of }) }
      if (id === 'typeadd') return { abilities, tries: tries('typeAdd', [from], { ...about, type: oneType(third) }) }
      if (id.startsWith('stockpile')) return { abilities, tries: tries('start', ['stockpile'], { ...about, number: Number(id.slice(9)) }, false) }
      if (id.startsWith('perish')) return { abilities, tries: tries('activate', ['perishsong'], { ...about, number: Number(id.slice(6)) }, false) }
      // The last of these that applies is the one said.
      let template = 'start'
      if (tags.already) template = 'alreadyStarted'
      if (tags.fatigue) template = 'startFromFatigue'
      if (tags.damage) template = 'activate'
      if (tags.block) template = 'block'
      if (tags.upkeep) template = 'upkeep'
      if (template === 'start' && itemOf(from)) template = 'startFromItem'
      return { abilities, tries: tries(template, [from, second], { ...about, source: of, move: third ? idOf(third) : undefined, item: itemOf(from) }) }
    }

    case '-end': {
      const id = idOf(second)
      const own = shown(second, pokemon)
      const abilities = own.length > 0 ? own : fromAbility
      // An attack foreseen earlier lands: the one it lands on is named.
      if (id === 'doomdesire' || id === 'futuresight') return { abilities, tries: tries('activate', [second], { target: pokemon, move: id }, false) }
      const item = itemOf(from) ?? around.eatenBy(pokemon)
      const gaps = { ...about, source: of, item, move: id }
      // "X was freed from <move>" is the games' sentence for a move that held a Pokémon: it is not said of everything that ends.
      return { abilities, tries: [...(item ? tries('endFromItem', [second], gaps, false) : []), ...tries('end', [second], gaps, tags.partiallytrapped !== undefined)] }
    }

    case '-ability': {
      const id = idOf(second)
      // The Ability a Pokémon had before a change is not shown: the sentence that follows says what it has now.
      const abilities = [{ ability: id, holder: pokemon }]
      if (tags.fail) return { abilities, tries: tries('block', [from], {}, false) }
      if (from) return { abilities: [...shown(from, pokemon), ...abilities], tries: tries('changeAbility', [from], { ...about, ability: id, source: of }) }
      // Unnerve is said of the team that faces it.
      if (id === 'unnerve') return { abilities, tries: ofTeam('start', id, { party: 'foes' as const, foes: 'party' as const }[around.teamOf(pokemon) ?? 'foes']) }
      return { abilities, tries: tries(id === 'anticipation' || id === 'sturdy' ? 'activate' : 'start', [second], about, false) }
    }

    case '-endability':
      return second ? { abilities: [{ ability: idOf(second), holder: pokemon }], tries: [] } : { abilities: fromAbility, tries: tries('start', ['gastroacid'], about, false) }

    case '-item': {
      const id = idOf(from)
      const gaps = { ...about, item: idOf(second), source: of }
      // Magician and Pickpocket write who the item was taken from where the other lines write who caused them.
      const abilities = shown(from, id === 'magician' || id === 'pickpocket' ? pokemon : of || pokemon)
      if (TAKES_AN_ITEM.has(id)) return { abilities, tries: tries('takeItem', [from], gaps) }
      if (id === 'frisk') return { abilities, tries: tries(of && of !== pokemon ? 'activate' : 'activateNoTarget', ['frisk'], { pokemon: [of ?? ''], item: gaps.item, target: pokemon }, false) }
      return { abilities, tries: from ? tries('addItem', [from], gaps) : tries('start', [second], gaps, false) }
    }

    case '-enditem': {
      const id = idOf(from)
      const gaps = { ...about, item: idOf(second), source: of, target: of, move: tags.move ? idOf(tags.move) : undefined }
      if (tags.eat) return { abilities: fromAbility, tries: tries('eatItem', [from], gaps) }
      if (id === 'gem') return { abilities: fromAbility, tries: tries('useGem', [second], gaps) }
      if (id === 'stealeat') return { abilities: fromAbility, tries: tries('removeItem', ['bugbite'], gaps, false) }
      if (from) return { abilities: fromAbility, tries: tries('removeItem', [from], gaps) }
      if (tags.weaken) return { abilities: fromAbility, tries: [{ key: 'activateWeaken', ...gaps }] }
      return { abilities: fromAbility, tries: [...tries('end', [second], gaps, false), { key: 'activateItem', ...gaps }] }
    }

    case '-status': {
      const item = itemOf(from)
      const gaps = { ...about, item }
      return {
        abilities: fromAbility,
        tries: [...(item ? tries('startFromItem', [second], gaps, false) : []), ...(idOf(from) === 'rest' ? tries('startFromRest', [second], gaps, false) : []), ...tries('start', [second], gaps, false)],
      }
    }

    case '-curestatus': {
      if (idOf(from) === 'naturalcure') return { abilities: [], tries: tries('activate', [from], about, false) }
      const item = itemOf(from) ?? around.eatenBy(pokemon)
      const gaps = { ...about, item, move: tags.thaw ? idOf(from) : undefined }
      return { abilities: fromAbility, tries: [...(item ? tries('endFromItem', [second], gaps, false) : []), ...(tags.thaw ? tries('endFromMove', [second], gaps, false) : []), ...tries('end', [second], gaps, false)] }
    }

    case '-cureteam':
      return { abilities: [], tries: tries('activate', [from], {}, false) }

    case '-singleturn':
    case '-singlemove': {
      const id = idOf(second)
      const own = shown(second, of || pokemon)
      const abilities = own.length > 0 ? own : fromAbility
      if (id === 'instruct') return { abilities, tries: tries('activate', [second], { pokemon: [of ?? ''], target: pokemon }, false) }
      return { abilities, tries: [...tries('start', [second], { ...about, source: of }, false), ...ofTeam('start', id, around.teamOf(pokemon))] }
    }

    case '-sidestart':
    case '-sideend':
      // The side is named "p1: players" or "p2: enemies": a player reads theirs as "your team".
      return { abilities: [], tries: ofTeam(kind === '-sidestart' ? 'start' : 'end', idOf(second), pokemon.startsWith('p1') ? 'party' : 'foes') }

    case '-fieldstart':
    case '-fieldactivate': {
      // Here the line's first argument is what holds over the field.
      const template = kind === '-fieldstart' || idOf(pokemon) === 'perishsong' ? 'start' : 'activate'
      return { abilities: shown(from, of), tries: tries(template, [pokemon], { pokemon: [of ?? ''] }, false) }
    }

    case '-fieldend':
      return { abilities: [], tries: tries('end', [pokemon], {}, false) }

    case '-sethp':
      return { abilities: [], tries: tries('activate', [from], {}, false) }

    case '-activate': {
      const id = idOf(second)
      // Aimed at the one the line names, at the one it came from, or at nobody but the Pokémon itself.
      const target = third || of || pokemon
      const abilities = shown(second, pokemon)
      if (id === 'lockon' || id === 'mindreader') return { abilities, tries: tries('start', [second], { pokemon: [of ?? ''], source: pokemon }, false) }
      const number = tags.number === undefined ? undefined : Number(tags.number)
      const gaps = { ...about, target, source: of, move: tags.move ? idOf(tags.move) : undefined, number, item: tags.item ? idOf(tags.item) : itemOf(second) }
      // Two Pokémon that traded Abilities each show the one they now have.
      const traded = [...shown(tags.ability && `ability: ${tags.ability}`, pokemon), ...shown(tags.ability2 && `ability: ${tags.ability2}`, target)]
      const magnitude = id === 'magnitude' && number !== undefined ? [{ key: `activate.magnitude.${number}` }] : []
      return { abilities: [...abilities, ...traded], tries: [...magnitude, ...tries(id === 'forewarn' && pokemon === target ? 'activateNoTarget' : 'activate', [second], gaps, false)] }
    }

    case '-prepare':
      return { abilities: [], tries: tries('prepare', [second], { ...about, target: third }, false) }

    case '-damage': {
      const id = idOf(from)
      const item = itemOf(from)
      const gaps = { ...about, item, source: of, move: id }
      return {
        abilities: fromAbility,
        tries: [
          ...tries('damage', [from], gaps, false),
          ...(item ? [{ key: of ? 'damageFromPokemon' : 'damageFromItem', ...gaps }] : []),
          ...(tags.partiallytrapped || id === 'bind' || id === 'wrap' ? [{ key: 'damageFromPartialTrapping', ...gaps }] : []),
        ],
      }
    }

    case '-heal': {
      const item = itemOf(from)
      const gaps = { ...about, source: of, item }
      return { abilities: fromAbility, tries: [...tries('heal', [from], gaps, false), ...(item ? [{ key: 'healFromItem', ...gaps }] : []), { key: 'heal', ...gaps }] }
    }

    case '-boost':
    case '-unboost': {
      if (!STATS.has(second)) return { abilities: fromAbility, tries: [] }
      const up = kind === '-boost'
      const stages = Math.min(3, Number(third) || 0)
      const gaps = { ...about, item: itemOf(from) }
      const amount = stages === 0 ? (up ? 'max' : 'min') : up ? stages : -stages
      return { abilities: fromAbility, tries: [...(up && stages > 0 && gaps.item ? [{ key: `boostFromItem.${second}.${stages}`, ...gaps }] : []), { key: `boost.${second}.${amount}`, ...gaps }] }
    }

    case '-setboost':
      return { abilities: shown(from, of || pokemon), tries: tries('boost', [from], about, false) }

    case '-swapboost': {
      const id = idOf(from)
      return { abilities: fromAbility, tries: tries(id === 'guardswap' ? 'swapDefensiveBoost' : id === 'powerswap' ? 'swapOffensiveBoost' : 'swapBoost', [from], { ...about, target: second }) }
    }

    case '-copyboost':
      return { abilities: fromAbility, tries: tries('copyBoost', [from], { ...about, target: second }) }

    case '-clearboost':
    case '-clearpositiveboost':
    case '-clearnegativeboost':
      return { abilities: fromAbility, tries: tries('clearBoost', [from], { ...about, source: second }) }

    case '-invertboost':
      return { abilities: fromAbility, tries: tries('invertBoost', [from], about) }

    case '-clearallboost':
      return { abilities: [], tries: tries('clearAllBoost', [from], {}) }

    case '-crit':
      return { abilities: [], tries: [{ key: around.targets > 1 ? 'critSpread' : 'crit', ...about }] }
    case '-supereffective':
      return { abilities: [], tries: [{ key: around.targets > 1 ? 'superEffectiveSpread' : 'superEffective', ...about }] }
    case '-resisted':
      return { abilities: [], tries: [{ key: around.targets > 1 ? 'resistedSpread' : 'resisted', ...about }] }

    case '-block':
      return { abilities: shown(second, of || pokemon), tries: tries('block', [second], { ...about, source: fourth || of, move: third ? idOf(third) : undefined, item: itemOf(second) }, false) }

    case '-fail': {
      const id = idOf(second)
      const blocker = idOf(from)
      let block = 'block'
      if ((blocker === 'desolateland' || blocker === 'primordialsea') && !WEATHER_MOVES.has(id)) block = 'blockMove'
      else if (blocker === 'uproar' && tags.msg) block = 'blockSelf'
      const blocked = tries(block, [from], about, false)
      if (id === 'unboost') return { abilities: fromAbility, tries: [...blocked, ...(third ? [{ key: `fail.unboost.${third}`, ...about }] : []), { key: 'fail.unboost', ...about }] }
      let template = 'fail'
      if (ALREADY.has(id)) template = 'alreadyStarted'
      if (tags.heavy) template = 'failTooHeavy'
      if (tags.weak) template = 'fail'
      if (tags.forme) template = 'failWrongForme'
      return { abilities: fromAbility, tries: [...blocked, ...tries(template, [id], about, false), { key: 'fail' }] }
    }

    case '-immune':
      return { abilities: fromAbility, tries: [...tries('block', [from], about, false), ...tries(!pokemon ? 'immuneNoPokemon' : tags.ohko ? 'immuneOHKO' : 'immune', [from], about)] }

    case '-miss':
      // The one who was aimed at avoided it; a move that simply missed has no sentence in the games.
      return { abilities: shown(from, of || second), tries: second ? [{ key: 'miss', pokemon: [second] }] : [] }

    case '-ohko':
      return { abilities: [], tries: [{ key: 'ohko' }] }

    case '-notarget':
      return { abilities: [], tries: [{ key: 'noTarget' }, { key: 'fail' }] }

    case '-hitcount':
      return { abilities: [], tries: [{ key: 'hitCount', number: Number(second) }] }

    case '-waiting':
      return { abilities: [], tries: tries('activate', ['waterpledge'], { ...about, target: second }, false) }

    case '-transform':
      return { abilities: shown(from, pokemon), tries: tries('transform', ['transform'], { ...about, target: second }, false) }

    default:
      return undefined
  }
}

/** What a sentence names: `{pokemon0}`, `{source}`, `{move}`, and the same with the forms a text takes, `{number:time|times}`. */
const NAMED = /\{(pokemon\d+|source|target|move|item|ability|type|number)[:}]/g

/** What fills a gap of a sentence: an id, or a number. Nothing when the step does not have it. */
function given(said: Said, gap: string): string | number | undefined {
  if (gap.startsWith('pokemon')) return said.pokemon?.[Number(gap.slice('pokemon'.length))] || undefined
  if (gap === 'number') return said.number !== undefined && Number.isFinite(said.number) ? said.number : undefined
  if (gap === 'source' || gap === 'target' || gap === 'move' || gap === 'item' || gap === 'ability' || gap === 'type') return said[gap] || undefined
  return undefined
}

/** Whether a message has everything its sentence names. */
const fills = (said: Said, template: string): boolean => [...template.matchAll(NAMED)].every(([, gap = '']) => given(said, gap) !== undefined)

/** How a Pokémon's HP or status stands after a line that changes them. */
function changeOf({ kind, args: [pokemon = '', second = ''] }: Line): Step['change'] {
  if (kind === '-damage' || kind === '-heal' || kind === '-sethp') {
    const hp = hpOf(second)
    return hp === undefined ? undefined : { id: pokemon, hp }
  }
  if (kind === '-status' && STATUSES.has(second)) return { id: pokemon, status: second }
  if (kind === '-curestatus' && STATUSES.has(second)) return { id: pokemon, status: '' }
  return undefined
}

/**
 * The steps of a round. `official` gives the games' sentence for a message, by
 * its name, when they have one: of the messages a line could say, the first
 * that has a sentence, and everything that sentence names, is the one said.
 * Without `official`, every message is taken to have its sentence.
 */
export function roundScript(played: Pick<Played, 'log' | 'events'> & Partial<Pick<Played, 'before' | 'weather'>>, official?: (key: string) => string | undefined): RoundScript {
  const steps: Step[] = []
  const unknown: string[] = []
  const teams = new Map((played.before ?? []).map((combatant): [string, Team] => [combatant.id, combatant.side === 'players' ? 'party' : 'foes']))
  const sayable = (said: Said): boolean => {
    const template = official ? official(said.key) : ''
    return template !== undefined && fills(said, template)
  }
  let targets = 1
  /** The weather as the lines so far leave it: its end names it. */
  let weather = played.weather
  let eaten: { pokemon: string; item: string } | undefined
  /** The Ability shown last and the line that showed it: an Ability that does several things in a row shows itself once. */
  let lastShown: (Shown & { at: number }) | undefined

  played.log.forEach((text, at) => {
    const line = modern(lineOf(text))
    const { kind, args, tags } = line
    const [first = '', second = '', third = ''] = args
    // A line about the field, a side or the weather names it where the others name a Pokémon.
    const who = kind.startsWith('-field') || kind.startsWith('-side') || kind === '-weather' ? '' : first
    const ate = eaten
    eaten = kind === '-enditem' && tags.eat ? { pokemon: who, item: idOf(second) } : undefined
    if (kind === 'denborn') {
      steps.push(...ownSteps(args))
      return
    }
    if (kind === 'move') targets = tags.spread?.split(',').length ?? 1

    let told: Told | undefined
    if (kind === '-weather') {
      // The line's first argument is the weather: "none" when it ends, and a line each turn it lasts.
      const now = idOf(first)
      if (tags.upkeep) {
        weather = now
        return
      }
      told = { abilities: shown(tags.from, tags.of), tries: now !== 'none' ? [{ key: `start.${now}` }] : weather ? [{ key: `end.${weather}` }] : [] }
      weather = now === 'none' ? undefined : now
    } else {
      told = messagesOf(line, { targets, teamOf: (id) => teams.get(id), eatenBy: (id) => (ate?.pokemon === id ? ate.item : undefined) })
    }
    if (!told) {
      if (!SILENT.has(kind)) unknown.push(kind)
      return
    }

    // A line the engine marked silent changes what it changes and says nothing.
    const quiet = tags.silent !== undefined
    if (!quiet) {
      for (const { ability, holder } of told.abilities) {
        const again = lastShown?.ability === ability && lastShown.holder === holder && lastShown.at === at - 1
        const banner: Said = { key: 'ability', pokemon: [holder], ability }
        if (!again && sayable(banner)) steps.push({ said: banner, show: [holder] })
        lastShown = { ability, holder, at }
      }
    }
    const said = quiet ? undefined : told.tries.find(sayable)
    const change = changeOf(line)
    // The one acting lunges; a hit is shown by the sprite, damage from something else is said.
    const motion = kind === 'move' ? { attack: who } : kind === '-damage' && !tags.from ? { hit: who } : undefined
    if (!said && !change && !motion) return
    const target = kind === 'move' && third && third !== who ? [third] : []
    const subject = said?.pokemon?.[0] || said?.target || said?.source || who
    steps.push({ ...(said ? { said } : {}), show: kind === 'move' ? [who, ...target] : subject ? [subject] : [], ...(change ? { change } : {}), ...(motion ? { motion } : {}) })
  })
  return { steps, unknown: [...new Set(unknown)] }
}

/** Denborn's own events (Agony, the Bag, WAIT), with the wording the owner approved (decision 86) under `own.…`. */
function ownSteps([event = '', a = '', b = '', c = '', d = '']: readonly string[]): Step[] {
  switch (event) {
    case 'downed':
      return [{ said: { key: 'own.downed', pokemon: [a] }, show: [a], change: { id: a, hp: 0, downed: true, stacks: Number(b), status: '' } }]
    case 'fainted':
      // An enemy that faints as in the games: the games' own sentence.
      return [{ said: { key: 'faint', pokemon: [a] }, show: [a], change: { id: a, hp: 0, dead: true, status: '' } }]
    case 'agonizing':
      return [{ said: { key: 'own.agonizing', pokemon: [a] }, show: [a], change: { id: a, stacks: Number(b) } }]
    case 'agonyhit':
      return [{ said: { key: 'own.hitWhileDown', pokemon: [a] }, show: [a], change: { id: a, stacks: Number(b) } }]
    case 'died':
      return [{ said: { key: 'own.died', pokemon: [a] }, show: [a], change: { id: a, downed: false, dead: true, stacks: 0, status: '' } }]
    case 'revived':
      return [{ said: { key: 'own.revived', pokemon: [a] }, show: [a], change: { id: a, hp: Number(b), downed: false, stacks: 0 } }]
    case 'bag':
      if (d === 'used') return [{ said: { key: 'own.bagUsed', pokemon: [a, c], item: b }, show: [a, c] }]
      if (d === 'blocked') return [{ said: { key: 'own.bagBlocked', pokemon: [a], item: b }, show: [a] }]
      return [
        { said: { key: 'own.bagUsed', pokemon: [a, c], item: b }, show: [a, c] },
        { said: { key: 'own.bagNoEffect', pokemon: [c] }, show: [c] },
      ]
    case 'wait':
      return [{ said: { key: 'own.waited', pokemon: [a] }, show: [a] }]
    default:
      // PP given back: nothing is said.
      return []
  }
}

/** Everyone as they stand once the first `count` steps have been played, from how they stood before the round. */
export function standingAfter(before: readonly Combatant[], steps: readonly Step[], count: number): Combatant[] {
  const now = new Map(before.map((combatant) => [combatant.id, combatant]))
  for (const step of steps.slice(0, count)) {
    const { change } = step
    const combatant = change ? now.get(change.id) : undefined
    if (!change || !combatant) continue
    const changes: Partial<NonNullable<Step['change']>> = { ...change }
    delete changes.id
    now.set(change.id, { ...combatant, ...changes })
  }
  return before.map((combatant) => now.get(combatant.id) ?? combatant)
}

export interface Telling {
  /** The games' own messages, by our name for each, in the app's language. */
  official: (key: string) => string | undefined
  /** Denborn's own messages, by name: each takes the names it speaks of, then an item's name. */
  own: Record<string, ((...names: string[]) => string) | undefined>
  nameOf: (id: string) => string
  moveName: (id: string) => string
  itemName: (id: string) => string
  abilityName: (id: string) => string
  typeName: (id: string) => string
  /** The gender and number of an item's French name: m, f, mp or fp. */
  itemGrammar: (id: string) => string | undefined
}

/** French "de" and "le" before a name: elided before a vowel or an h. */
const elides = (name: string): boolean => /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(name)

/** The French articles the games put before an item's name, by what the name is: masculine, feminine, begun by a vowel, plural. */
const ARTICLES: Record<string, { m: string; f: string; vowel?: string; plural: string }> = {
  le: { m: 'le ', f: 'la ', vowel: 'l’', plural: 'les ' },
  Le: { m: 'Le ', f: 'La ', vowel: 'L’', plural: 'Les ' },
  un: { m: 'un ', f: 'une ', plural: 'des ' },
  au: { m: 'au ', f: 'à la ', vowel: 'à l’', plural: 'aux ' },
  du: { m: 'du ', f: 'de la ', vowel: 'de l’', plural: 'des ' },
}
/** The place of each gender and number among the forms a text takes: `{item:m|f|mp|fp}`. */
const GRAMMARS = ['m', 'f', 'mp', 'fp']

/** A gap of a sentence, with what stands before it (`{de}`, `{le}`) and the forms it chooses among (`{number:time|times}`). */
const GAP = /(?:\{(de|le|Le|un|au|du)\})?\{(pokemon\d+|source|target|move|item|ability|type|number)(?::([^}]*))?\}/g

/** A name with the French article that stands before it; nothing when the article needs a grammar that is not known. */
function withArticle(article: string, name: string, grammar: string | undefined): string | undefined {
  if (article === 'de') return elides(name) ? `d’${name}` : `de ${name}`
  const forms = ARTICLES[article]
  if (!forms || !grammar || !GRAMMARS.includes(grammar)) return undefined
  if (grammar.endsWith('p')) return forms.plural + name
  return ((elides(name) ? forms.vowel : undefined) ?? (grammar === 'f' ? forms.f : forms.m)) + name
}

/** What a step says, in words; nothing when no sentence is known for it, or when the sentence names something the step does not have. */
export function sentence(said: Said, telling: Telling): string | undefined {
  if (said.key.startsWith('own.')) {
    const names = (said.pokemon ?? []).map(telling.nameOf)
    const own = telling.own[said.key.slice(4)]
    return own ? own(...names, ...(said.item ? [telling.itemName(said.item)] : [])) : undefined
  }
  const template = telling.official(said.key)
  if (template === undefined) return undefined
  const nameOf = (gap: string, value: string): string => {
    if (gap === 'move') return telling.moveName(value)
    if (gap === 'item') return telling.itemName(value)
    if (gap === 'ability') return telling.abilityName(value)
    if (gap === 'type') return telling.typeName(value)
    return telling.nameOf(value)
  }
  /** The gaps the step has nothing for: with one, the sentence is not said. */
  const empty: string[] = []
  const text = template.replace(GAP, (_, article: string | undefined, gap: string, forms: string | undefined) => {
    const value = given(said, gap)
    const grammar = gap === 'item' && typeof value === 'string' ? telling.itemGrammar(value) : undefined
    let filled: string | undefined
    // One of several forms: by the number being one or more, or by the item's gender and number.
    if (forms !== undefined) filled = forms.split('|')[typeof value === 'number' ? (value === 1 ? 0 : 1) : GRAMMARS.indexOf(grammar ?? '')]
    else if (typeof value === 'number') filled = String(value)
    else if (value !== undefined) filled = article ? withArticle(article, nameOf(gap, value), grammar) : nameOf(gap, value)
    if (filled === undefined) empty.push(gap)
    return filled ?? ''
  })
  return empty.length > 0 ? undefined : text
}
