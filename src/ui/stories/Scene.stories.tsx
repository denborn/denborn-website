import type { Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, useRef, useState } from 'react'
import {
  Battler,
  type BattlerHandle,
  CommandMenu,
  CornerButton,
  type FieldEffect,
  FieldEffects,
  FieldPlan,
  type FieldState,
  type FieldTile,
  HudBox,
  ItemIconImage,
  LineBrowser,
  type LineSlot,
  MessageBox,
  MoveButton,
  OptionButton,
  Screen,
  StatusBadge,
  type StatusId,
  TypeLabel,
} from '..'
import type { DataPack, Gender, StatId } from '../../data/types'
import { type Spot, isAdjacent } from '../../game-rules/reach'
import { Note, Phone, useBattleText, useLocale, usePack } from './board'

interface Fighter {
  id: string
  level: number
  gender: Gender
  maxHp: number
  hp: number
  /** Attack, Defense, Special Attack, Special Defense, Speed. */
  stats: [number, number, number, number, number]
  ability: string
  item?: string
  status?: StatusId
  moves: string[]
  /** Stat stages it carries, and the moves whose effect sits on it. */
  boosts?: Partial<Record<StatId, number>>
  conditions?: string[]
}

// Made-up numbers: this board shows the look and the motion, the battle engine is not involved.
const FOES: Fighter[] = [
  { id: 'gengar', level: 42, gender: 'M', maxHp: 120, hp: 120, stats: [70, 66, 121, 78, 108], ability: 'cursedbody', moves: ['shadowball', 'sludgebomb', 'thunderbolt', 'hypnosis', 'dreameater', 'confuseray'], conditions: ['leechseed'] },
  { id: 'arcanine', level: 40, gender: 'F', maxHp: 150, hp: 96, stats: [104, 76, 94, 76, 92], ability: 'intimidate', item: 'sitrusberry', moves: ['flamethrower', 'extremespeed', 'crunch', 'wildcharge', 'morningsun', 'willowisp'] },
  { id: 'dragonite', level: 45, gender: 'M', maxHp: 166, hp: 166, stats: [133, 97, 102, 102, 84], ability: 'innerfocus', item: 'leftovers', moves: ['dragonclaw', 'hurricane', 'thunderpunch', 'roost', 'dragondance', 'extremespeed'], boosts: { atk: 1, spe: 1 } },
]
const PARTY: Fighter[] = [
  { id: 'pikachu', level: 38, gender: 'F', maxHp: 98, hp: 41, stats: [57, 42, 53, 49, 85], ability: 'static', moves: ['thunderbolt', 'quickattack', 'irontail', 'thunderwave', 'surf', 'voltswitch'] },
  { id: 'charizard', level: 41, gender: 'M', maxHp: 133, hp: 133, stats: [84, 78, 109, 85, 100], ability: 'blaze', item: 'lifeorb', moves: ['flamethrower', 'airslash', 'dragonclaw', 'earthquake', 'roost', 'swordsdance'], boosts: { atk: 2 } },
  { id: 'snorlax', level: 40, gender: 'M', maxHp: 210, hp: 18, stats: [103, 67, 67, 103, 39], ability: 'immunity', status: 'psn', moves: ['bodyslam', 'earthquake', 'crunch', 'rest', 'sleeptalk', 'curse'] },
  { id: 'vaporeon', level: 39, gender: 'F', maxHp: 190, hp: 152, stats: [66, 62, 101, 89, 65], ability: 'waterabsorb', moves: ['surf', 'icebeam', 'scald', 'wish', 'protect', 'aquaring'], conditions: ['aquaring'] },
]
/** The viewer's own Pokémon: B on the party's line. */
const MINE = 1
const LETTERS = 'ABCDEF'
/**
 * What is in effect in this mock. Each takes its name and its description from
 * the move that sets it (the weather has a name of its own); the two with a
 * colour are the ground and the sky, named on the plan itself.
 */
const EFFECTS: { id: string; scope: FieldEffect['scope']; move: string; turns?: number; weather?: 'rain'; color?: string }[] = [
  { id: 'terrain', scope: 'field', move: 'electricterrain', turns: 3, color: 'Electric' },
  { id: 'weather', scope: 'field', move: 'raindance', turns: 2, weather: 'rain', color: 'Water' },
  { id: 'reflect', scope: 'foes', move: 'reflect', turns: 4 },
  { id: 'tailwind', scope: 'party', move: 'tailwind', turns: 1 },
  { id: 'stealthrock', scope: 'party', move: 'stealthrock' },
]
const STATS: StatId[] = ['atk', 'def', 'spa', 'spd', 'spe']
const signed = (stage: number): string => (stage > 0 ? `+${stage}` : `${stage}`)
const isChanged = (fighter: Fighter): boolean => Boolean(fighter.boosts) || Boolean(fighter.conditions?.length)
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
// The games' own line for a move, for this mock only: the engine's ordinary messages come with the battle screens.
const USED = { en: (user: string, move: string) => `${user} used ${move}!`, fr: (user: string, move: string) => `${user} utilise ${move}\u00a0!` }

const spot = (side: Spot['side'], position: number): Spot => ({ side, position, lineLength: side === 'enemies' ? FOES.length : PARTY.length })
/** Whether the viewer's Pokémon reaches a foe with a one-target move: the rules' own geometry. */
const inReach = (foe: number): boolean => isAdjacent(spot('players', MINE), spot('enemies', foe))

interface FoeState {
  hp: number
  stacks: number
  state: FieldState
}

function Card({ pack, fighter, hp, onBack }: { pack: DataPack; fighter: Fighter; hp: number; onBack: () => void }) {
  const locale = useLocale()
  const text = useBattleText()
  const words = text.field
  const species = pack.species[fighter.id]
  const item = fighter.item ? pack.items[fighter.item] : undefined
  if (!species) return null
  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <HudBox side="player" name={species.name[locale]} level={fighter.level} gender={fighter.gender} hp={hp} maxHp={fighter.maxHp} text={text} showNumbers />
        <span className="sb-card__types">
          {species.types.map((type) => (
            <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[locale] ?? type} />
          ))}
        </span>
      </div>
      <dl className="sb-card__stats">
        {STATS.map((stat, index) => (
          <div key={stat}>
            <dt>{pack.statNames[stat][locale]}</dt>
            <dd>
              {fighter.stats[index]}
              {fighter.boosts?.[stat] !== undefined && <span className="sb-card__stage"> {signed(fighter.boosts[stat])}</span>}
            </dd>
          </div>
        ))}
        <div className="sb-card__wide">
          <dt>{words.ability}</dt>
          <dd>{pack.abilities[fighter.ability]?.name[locale]}</dd>
        </div>
        <div className="sb-card__wide">
          <dt>{words.item}</dt>
          <dd>
            {item ? (
              <>
                <ItemIconImage icon={item.icon} scale={0.5} /> {item.name[locale]}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>
      {fighter.conditions && (
        <p className="sb-card__conditions">
          <span>{words.effects}</span> {fighter.conditions.map((id) => pack.moves[id]?.name[locale]).join(', ')}
        </p>
      )}
      <ul className="sb-card__moves">
        {fighter.moves.map((id) => {
          const move = pack.moves[id]
          if (!move) return null
          const type = move.type.toLowerCase()
          const style = { '--dn-type-fill': `var(--dn-type-${type})`, '--dn-type-shade': `var(--dn-type-${type}-shade)` } as CSSProperties
          return (
            <li key={id} style={style}>
              <span>{move.name[locale]}</span>
              <span>
                {move.pp}/{move.pp}
              </span>
            </li>
          )
        })}
      </ul>
      <span className="sb-card__back">
        <OptionButton onClick={onBack}>{text.back}</OptionButton>
      </span>
    </div>
  )
}

function BattleOnAPhone() {
  const pack = usePack()
  const locale = useLocale()
  const text = useBattleText()
  const words = text.field
  const attacker = useRef<BattlerHandle>(null)
  const target = useRef<BattlerHandle>(null)
  const [view, setView] = useState<'commands' | 'moves' | 'field' | 'card' | 'effects'>('commands')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Which Pokémon of each line is on screen, and the side the last arrow pressed points to.
  const [foe, setFoe] = useState({ index: 0, from: 'side' as 'side' | 'left' | 'right' })
  const [ally, setAlly] = useState({ index: MINE, from: 'side' as 'side' | 'left' | 'right' })
  const [card, setCard] = useState<{ side: 'foe' | 'ally'; index: number }>({ side: 'foe', index: 0 })
  const [foes, setFoes] = useState<FoeState[]>(FOES.map((fighter) => ({ hp: fighter.hp, stacks: 3, state: 'standing' })))

  const nameOf = (id: string): string => pack.species[id]?.name[locale] ?? id
  const shown = message ?? text.messages.prompt(nameOf(PARTY[MINE]?.id ?? ''))
  const showFoe = (index: number): void => setFoe((now) => ({ index, from: index > now.index ? 'right' : 'left' }))
  const showAlly = (index: number): void => setAlly((now) => ({ index, from: index > now.index ? 'right' : 'left' }))

  const foeFighter = FOES[foe.index]
  const foeNow = foes[foe.index]
  const allyFighter = PARTY[ally.index]
  const foeSpecies = foeFighter && pack.species[foeFighter.id]
  const allySpecies = allyFighter && pack.species[allyFighter.id]
  if (!foeFighter || !foeNow || !allyFighter || !foeSpecies || !allySpecies) return null

  const foeSlots: LineSlot[] = foes.map((state, index) => ({ letter: LETTERS[index] ?? '', state: state.state }))
  const allySlots: LineSlot[] = PARTY.map((_, index) => ({ letter: LETTERS[index] ?? '', state: 'standing', mine: index === MINE }))

  const playMove = async (moveId: string): Promise<void> => {
    // The mock aims at the foe on screen when it is in reach, at the nearest one in reach otherwise.
    const aim = inReach(foe.index) && foeNow.state !== 'gone' ? foe.index : foes.findIndex((state, index) => inReach(index) && state.state !== 'gone')
    setView('commands')
    if (aim < 0) return
    setBusy(true)
    if (ally.index !== MINE) showAlly(MINE)
    if (aim !== foe.index) showFoe(aim)
    const aimed = foes[aim]
    const aimedName = nameOf(FOES[aim]?.id ?? '')
    setMessage(USED[locale](nameOf(PARTY[MINE]?.id ?? ''), pack.moves[moveId]?.name[locale] ?? moveId))
    await wait(800)
    await attacker.current?.attack()
    const change = (next: Partial<FoeState>): void => setFoes((all) => all.map((state, index) => (index === aim ? { ...state, ...next } : state)))
    if (aimed?.state === 'standing') {
      await target.current?.hit()
      const left = Math.max(0, aimed.hp - 60)
      change({ hp: left })
      await wait(900)
      if (left === 0) {
        change({ state: 'downed' })
        setMessage(text.messages.downed(aimedName))
        await wait(1400)
        setMessage(text.messages.agonizing(aimedName))
        await wait(1400)
      }
    } else if (aimed?.state === 'downed') {
      setMessage(text.messages.hitWhileDown(aimedName))
      const left = aimed.stacks - 1
      change({ stacks: left })
      await wait(1400)
      if (left === 0) {
        change({ state: 'gone' })
        setMessage(text.messages.died(aimedName))
        await wait(1400)
      }
    }
    setMessage(null)
    setBusy(false)
  }

  const tile = (fighter: Fighter, index: number, side: 'foe' | 'ally'): FieldTile => {
    const state = side === 'foe' ? (foes[index] ?? { hp: 0, stacks: 0, state: 'gone' as const }) : { hp: fighter.hp, stacks: 3, state: 'standing' as const }
    const mine = side === 'ally' && index === MINE
    const far = side === 'foe' && !inReach(index)
    const letter = LETTERS[index] ?? ''
    const said = [words.slot(letter, nameOf(fighter.id)), text.hpLabel(state.hp, fighter.maxHp)]
    if (mine) said.push(words.yours)
    if (far) said.push(words.outOfReach)
    if (isChanged(fighter)) said.push(words.changed)
    return {
      id: `${side}-${index}`,
      letter,
      num: pack.species[fighter.id]?.num ?? 0,
      hp: state.hp,
      maxHp: fighter.maxHp,
      state: state.state,
      stacks: state.stacks,
      mine,
      outOfReach: far,
      changed: isChanged(fighter),
      label: said.join(', '),
    }
  }

  const open = (id: string): void => {
    const [side, at] = id.split('-')
    const index = Number(at)
    if (side === 'foe') showFoe(index)
    else showAlly(index)
    setCard({ side: side === 'foe' ? 'foe' : 'ally', index })
    setView('card')
  }

  // What sits on one Pokémon: its stat changes as one entry, then each effect on it.
  const carried = (fighter: Fighter, index: number, scope: 'foes' | 'party'): FieldEffect[] => {
    const letter = LETTERS[index] ?? ''
    const who = { scope, letter, scopeText: `${words.scope[scope]}, ${words.slot(letter, nameOf(fighter.id))}` }
    const stages = Object.entries(fighter.boosts ?? {}).map(([stat, stage]) => `${pack.statNames[stat as StatId][locale]} ${signed(stage)}`)
    return [
      ...(stages.length > 0 ? [{ id: `${scope}-${index}-stats`, name: stages.join(' · '), ...who }] : []),
      ...(fighter.conditions ?? []).map((move) => ({
        id: `${scope}-${index}-${move}`,
        name: pack.moves[move]?.name[locale] ?? '',
        description: pack.moves[move]?.description[locale] ?? '',
        ...who,
      })),
    ]
  }
  const effects: FieldEffect[] = [
    ...EFFECTS.map((effect) => ({
      id: effect.id,
      name: effect.weather ? words.weather[effect.weather] : (pack.moves[effect.move]?.name[locale] ?? ''),
      scope: effect.scope,
      scopeText: words.scope[effect.scope],
      ...(effect.turns === undefined ? {} : { lasting: words.turnsLeft(effect.turns) }),
      description: pack.moves[effect.move]?.description[locale] ?? '',
    })),
    ...FOES.flatMap((fighter, index) => carried(fighter, index, 'foes')),
    ...PARTY.flatMap((fighter, index) => carried(fighter, index, 'party')),
  ]
  const cardFighter = card.side === 'foe' ? FOES[card.index] : PARTY[card.index]
  const hudWidth = { '--dn-hud-width': 'calc(104 * var(--dn-u))' } as CSSProperties

  return (
    <Phone>
      <Screen label="Battle scene">
        <div className="sb-spot" style={{ left: 'calc(208 * var(--dn-u))', bottom: 'calc(104 * var(--dn-u))' }}>
          {foeNow.state !== 'gone' && (
            <Battler
              key={foeFighter.id}
              ref={target}
              species={foeSpecies}
              name={foeSpecies.name[locale]}
              side="foe"
              female={foeFighter.gender === 'F'}
              pose={foeNow.state}
              scale={0.9}
              enterFrom={foe.from}
            />
          )}
        </div>
        <div className="sb-spot" style={{ left: 'calc(52 * var(--dn-u))', bottom: 'calc(40 * var(--dn-u))' }}>
          <Battler
            key={allyFighter.id}
            ref={ally.index === MINE ? attacker : undefined}
            species={allySpecies}
            name={allySpecies.name[locale]}
            side="player"
            female={allyFighter.gender === 'F'}
            scale={1.1}
            enterFrom={ally.from}
          />
        </div>
        <div className="sb-browser" style={{ left: 0, top: 'calc(2 * var(--dn-u))', ...hudWidth }}>
          <LineBrowser slots={foeSlots} current={foe.index} onChange={showFoe} labels={words} currentLabel={words.slot(LETTERS[foe.index] ?? '', foeSpecies.name[locale])}>
            <HudBox
              side="foe"
              name={foeSpecies.name[locale]}
              level={foeFighter.level}
              gender={foeFighter.gender}
              hp={foeNow.hp}
              maxHp={foeFighter.maxHp}
              text={text}
              {...(isChanged(foeFighter) ? { changed: words.changed } : {})}
              {...(foeNow.state === 'downed' ? { agony: { stacks: foeNow.stacks, text: text.agony, label: text.agonyLabel(foeNow.stacks, 3) } } : {})}
            />
          </LineBrowser>
        </div>
        <div className="sb-browser" style={{ right: 0, bottom: 'calc(48 * var(--dn-u))', ...hudWidth }}>
          <LineBrowser slots={allySlots} current={ally.index} onChange={showAlly} labels={words} currentLabel={words.slot(LETTERS[ally.index] ?? '', allySpecies.name[locale])}>
            <HudBox
              side="player"
              name={allySpecies.name[locale]}
              level={allyFighter.level}
              gender={allyFighter.gender}
              hp={allyFighter.hp}
              maxHp={allyFighter.maxHp}
              text={text}
              {...(isChanged(allyFighter) ? { changed: words.changed } : {})}
            >
              {allyFighter.status && <StatusBadge status={allyFighter.status} text={text.status[allyFighter.status].badge} label={text.status[allyFighter.status].name} />}
            </HudBox>
          </LineBrowser>
        </div>
        <div className="sb-message">
          <MessageBox text={shown} />
        </div>
      </Screen>
      <Screen kind={view === 'commands' || view === 'moves' ? 'touch' : 'menu'} label="Commands">
        {view === 'commands' && (
          <CommandMenu labels={text.commands} disabled={busy ? ['fight', 'bag', 'run', 'switch'] : []} onCommand={(command) => command === 'fight' && setView('moves')}>
            <CornerButton onClick={() => setView('field')}>{words.battlefield}</CornerButton>
          </CommandMenu>
        )}
        {view === 'moves' && (
          <div className="dn-moves">
            {(PARTY[MINE]?.moves ?? []).map((id) => {
              const data = pack.moves[id]
              if (!data) return null
              return (
                <MoveButton
                  key={id}
                  name={data.name[locale]}
                  type={data.type}
                  typeLabel={pack.types[data.type.toLowerCase()]?.name[locale] ?? data.type}
                  category={data.category}
                  categoryLabel={text.category[data.category]}
                  pp={data.pp}
                  maxPp={data.pp}
                  ppText={text.pp}
                  onSelect={() => void playMove(id)}
                />
              )
            })}
            <span className="dn-moves__back">
              <OptionButton onClick={() => setView('commands')}>{text.back}</OptionButton>
            </span>
          </div>
        )}
        {view === 'field' && (
          <FieldPlan
            foes={FOES.map((fighter, index) => tile(fighter, index, 'foe'))}
            allies={PARTY.map((fighter, index) => tile(fighter, index, 'ally'))}
            shown={[`foe-${foe.index}`, `ally-${ally.index}`]}
            onSelect={open}
            labels={{ foes: words.foes, allies: words.party }}
            ground={EFFECTS.map((effect, index) => effect.color && <TypeLabel key={effect.id} type={effect.color} text={effects[index]?.name ?? ''} />)}
          >
            <OptionButton primary onClick={() => setView('effects')}>
              {words.more} · {effects.length}
            </OptionButton>
            <OptionButton onClick={() => setView('commands')}>{text.back}</OptionButton>
          </FieldPlan>
        )}
        {view === 'effects' && (
          <FieldEffects effects={effects} label={words.effects} empty={words.noEffects}>
            <OptionButton onClick={() => setView('field')}>{text.back}</OptionButton>
          </FieldEffects>
        )}
        {view === 'card' && cardFighter && (
          <Card pack={pack} fighter={cardFighter} hp={card.side === 'foe' ? (foes[card.index]?.hp ?? 0) : cardFighter.hp} onBack={() => setView('field')} />
        )}
      </Screen>
      <Note>
        A mock for the look and the motion only: the numbers are made up and the battle engine is not involved. Four players face three
        foes. The <strong>arrows</strong> walk along each line; <strong>{words.battlefield}</strong> shows both lines from above, and a tap on a
        Pokémon shows its sheet. On the plan, a darker foe is out of your Pokémon’s reach (yours is B, underlined in gold); the terrain
        and the weather are named between the lines, and <strong>{words.more}</strong> lists everything in effect: whom it touches (the
        arrow points to that side of the plan, with a Pokémon’s letter when it sits on one), the turns it has left, and what it does (the
        move’s own description, for now). A Pokémon that carries stat changes or effects of its own has a small gold double arrow on
        its box and its tile, and they are on its sheet. Press{' '}
        <strong>{text.commands.fight}</strong> and pick a move, three times, to see a hit, a downed foe and its Agony.
      </Note>
    </Phone>
  )
}

const meta = { title: 'Scenes/Battle on a phone', component: BattleOnAPhone } satisfies Meta<typeof BattleOnAPhone>
export default meta

export const OneAtATime: StoryObj<typeof meta> = {}
