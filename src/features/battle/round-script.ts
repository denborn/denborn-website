/**
 * A round as it is told: the engine's log turned into steps, each with what
 * is said, who comes onto the scene, and how the Pokémon stand after it
 * (decision 91). Playing the steps one after the other, from how everyone
 * stood before the round, ends exactly where the fight now stands.
 *
 * The steps only show what the engine decided. A line this module has no
 * sentence for still plays its effect (HP, status); a kind of line it does
 * not know at all is listed in `unknown`, so that a test can say so.
 */
import type { PlayerFight } from '../../shared/protocol/battle'

type Combatant = PlayerFight['combatants'][number]
type Played = PlayerFight['last']

/** What is said at a step: a message by its name, and what fills its gaps (combatant ids, a move's id). */
export interface Said {
  key: string
  /** The Pokémon the sentence names, in the order of its gaps. */
  pokemon?: string[]
  move?: string
  item?: string
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

/** Lines that change nothing a player is shown, or whose sentence is not written yet: they are passed over. */
const SILENT = new Set([
  '', 'turn', 'upkeep', 'start', 'split', 'debug', 'player', 'teamsize', 'gametype', 'gen', 'tier', 'rule', 'switch', 'drag', 'swap', 'win', 'tie', 'faint', 't:', 'done', 'request', 'error',
  '-hint', '-message', '-anim', '-hitcount', '-prepare', '-mustrecharge', '-ability', '-endability', '-item', '-enditem', '-fieldstart', '-fieldend', '-fieldactivate', '-sidestart', '-sideend',
  '-swapsideconditions', '-singlemove', '-transform', '-formechange', 'detailschange', 'replace', '-clearallboost', '-clearboost', '-clearpositiveboost', '-clearnegativeboost', '-copyboost',
  '-invertboost', '-swapboost', '-setboost', '-block', '-nothing', '-waiting', '-zpower', '-zbroken', '-mega', '-primal', '-burst', '-terastallize', '-center', '-combine', '-ohko', '-candynamax',
])

/** Engine names of what hurts a Pokémon at the end of a turn or after its move, and our name for the sentence. */
const HURT_BY: Record<string, string> = { brn: 'brn', psn: 'psn', tox: 'tox', recoil: 'recoil', confusion: 'confusion', sandstorm: 'sandstorm', leechseed: 'leechseed' }
const CANT: Record<string, string> = { slp: 'slp', par: 'par', frz: 'frz', flinch: 'flinch', recharge: 'recharge', truant: 'truant', attract: 'attract' }
const WEATHERS = new Set(['raindance', 'sunnyday', 'sandstorm', 'snowscape'])
const STATUSES = new Set(['brn', 'par', 'slp', 'psn', 'tox', 'frz'])
const STATS = new Set(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'])

/** An engine name as an id: "move: Leech Seed" and "Leech Seed" both give "leechseed". */
const idOf = (name: string): string => name.replace(/^[a-z]+: /i, '').toLowerCase().replace(/[^a-z0-9]/g, '')
/** A tag of a line, such as "[from] psn" or "[of] <id>": its value, or nothing. */
const tag = (fields: readonly string[], name: string): string | undefined => fields.find((field) => field.startsWith(`[${name}]`))?.slice(name.length + 2).trim()
/** The HP a line gives: "35/100", "35/100 brn" or "0 fnt". */
const hpOf = (field: string | undefined): number | undefined => {
  const match = /^(\d+)/.exec(field ?? '')
  return match ? Number(match[1]) : undefined
}

export function roundScript(played: Pick<Played, 'log' | 'events'>): RoundScript {
  const steps: Step[] = []
  const unknown: string[] = []
  /** How many Pokémon the last move was aimed at: with several, a result says on whom. */
  let targets = 1
  let weather: string | undefined

  for (const line of played.log) {
    const [, kind = '', ...fields] = line.split('|')
    const [who = '', second = '', third = ''] = fields
    const say = (key: string, pokemon: string[] = [who], more: Partial<Said> = {}): void => {
      steps.push({ said: { key, pokemon, ...more }, show: pokemon })
    }

    switch (kind) {
      case 'move': {
        targets = (tag(fields, 'spread')?.split(',').length ?? 1) || 1
        const target = third && !third.startsWith('[') ? third : undefined
        steps.push({ said: { key: 'moveUsed', pokemon: [who], move: idOf(second) }, show: target && target !== who ? [who, target] : [who], motion: { attack: who } })
        break
      }
      case 'cant': {
        const reason = CANT[idOf(second)]
        if (reason) say(`cant.${reason}`)
        else steps.push({ show: [who] })
        break
      }
      case '-damage':
      case '-heal':
      case '-sethp': {
        const hp = hpOf(second)
        if (hp === undefined) break
        const from = idOf(tag(fields, 'from') ?? '')
        const change = { id: who, hp }
        if (kind === '-damage') {
          const key = HURT_BY[from]
          // A hit is shown by the sprite; damage from something else is said.
          steps.push({ show: [who], change, ...(key ? { said: { key: `hurt.${key}`, pokemon: [who] } } : from ? {} : { motion: { hit: who } }) })
        } else if (kind === '-heal') {
          const drained = from === 'drain' ? tag(fields, 'of') : undefined
          steps.push({ show: [who], change, said: drained ? { key: 'drain', pokemon: [drained] } : { key: 'heal', pokemon: [who] } })
        } else {
          steps.push({ show: [who], change })
        }
        break
      }
      case '-status':
        if (STATUSES.has(second)) steps.push({ said: { key: `status.${second}`, pokemon: [who] }, show: [who], change: { id: who, status: second } })
        break
      case '-curestatus':
        if (STATUSES.has(second)) steps.push({ show: [who], change: { id: who, status: '' }, ...(fields.includes('[silent]') ? {} : { said: { key: `cure.${second}`, pokemon: [who] } }) })
        break
      case '-boost':
      case '-unboost': {
        if (!STATS.has(second)) break
        const stages = Math.min(3, Number(third) || 0)
        const up = kind === '-boost'
        say(`boost.${second}.${stages === 0 ? (up ? 'max' : 'min') : up ? stages : -stages}`)
        break
      }
      case '-supereffective':
        say(targets > 1 ? 'superEffectiveOn' : 'superEffective')
        break
      case '-resisted':
        say(targets > 1 ? 'resistedOn' : 'resisted')
        break
      case '-immune':
        say('immune')
        break
      case '-crit':
        say('crit')
        break
      case '-miss':
        // The one who was aimed at avoided it; a move that simply missed names nobody else.
        say('miss', [second || who])
        break
      case '-fail':
      case '-notarget':
        steps.push({ said: { key: 'fail' }, show: who ? [who] : [] })
        break
      case '-weather': {
        const now = idOf(who)
        if (fields.includes('[upkeep]')) weather = now
        else if (now === 'none') {
          if (weather && WEATHERS.has(weather)) steps.push({ said: { key: `weather.${weather}.end` }, show: [] })
          weather = undefined
        } else {
          weather = now
          if (WEATHERS.has(now)) steps.push({ said: { key: `weather.${now}.start` }, show: [] })
        }
        break
      }
      case '-start':
      case '-end':
      case '-activate':
      case '-singleturn': {
        const effect = idOf(second)
        if (effect === 'confusion') say(kind === '-start' ? 'confusion.start' : kind === '-end' ? 'confusion.end' : 'confusion.is')
        else if (effect === 'leechseed' && kind === '-start') say('leechseed.start')
        else if (effect === 'protect' && kind === '-activate') say('protect')
        break
      }
      case 'denborn':
        steps.push(...ownSteps(fields))
        break
      default:
        if (!SILENT.has(kind)) unknown.push(kind)
    }
  }
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
    default:
      // A Pokémon that waits, PP given back: nothing is said.
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
}

/** French "de" before a name: elided before a vowel or an h. */
const elides = (name: string): boolean => /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(name)

/** What a step says, in words; nothing when no sentence is known for it. */
export function sentence(said: Said, telling: Telling): string | undefined {
  const names = (said.pokemon ?? []).map(telling.nameOf)
  if (said.key.startsWith('own.')) {
    const own = telling.own[said.key.slice(4)]
    return own ? own(...names, ...(said.item ? [telling.itemName(said.item)] : [])) : undefined
  }
  const template = telling.official(said.key)
  if (template === undefined) return undefined
  return template
    .replace(/\{de\}\{pokemon(\d+)\}/g, (_, index: string) => {
      const name = names[Number(index)] ?? ''
      return elides(name) ? `d’${name}` : `de ${name}`
    })
    .replace(/\{pokemon(\d+)\}/g, (_, index: string) => names[Number(index)] ?? '')
    .replace(/\{move\d*\}/g, said.move ? telling.moveName(said.move) : '')
    .replace(/\{item\d*\}/g, said.item ? telling.itemName(said.item) : '')
}
