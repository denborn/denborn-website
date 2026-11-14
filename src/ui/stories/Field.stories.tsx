import type { Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, useState } from 'react'
import {
  type FieldEffect,
  FieldEffects,
  FieldPlan,
  type FieldState,
  type FieldTile,
  HudBox,
  LineBrowser,
  type LineSlot,
  OptionButton,
  Screen,
  TypeLabel,
} from '..'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

const LETTERS = 'ABCDEF'
// The longest lines there can be, in every state a slot can take.
const FOES: { id: string; state: FieldState; hp: number; far?: boolean }[] = [
  { id: 'gengar', state: 'standing', hp: 120, far: true },
  { id: 'arcanine', state: 'downed', hp: 0 },
  { id: 'dragonite', state: 'standing', hp: 40 },
  { id: 'alakazam', state: 'gone', hp: 0 },
  { id: 'gyarados', state: 'standing', hp: 9, far: true },
  { id: 'machamp', state: 'standing', hp: 88, far: true },
]
const PARTY: { id: string; state: FieldState; hp: number }[] = [
  { id: 'pikachu', state: 'standing', hp: 41 },
  { id: 'charizard', state: 'standing', hp: 120 },
  { id: 'snorlax', state: 'downed', hp: 0 },
  { id: 'vaporeon', state: 'standing', hp: 70 },
  { id: 'clefairy', state: 'standing', hp: 120 },
]

function FieldPieces() {
  const pack = usePack()
  const locale = useLocale()
  const text = useBattleText()
  const words = text.field
  const [shown, setOnScene] = useState(['foe-2', 'ally-1'])
  const [index, setIndex] = useState(2)
  const tile = (entry: (typeof FOES)[number], index: number, side: 'foe' | 'ally'): FieldTile => {
    const species = pack.species[entry.id]
    const letter = LETTERS[index] ?? ''
    return {
      id: `${side}-${index}`,
      letter,
      num: species?.num ?? 0,
      hp: entry.hp,
      maxHp: 120,
      state: entry.state,
      stacks: 2,
      mine: side === 'ally' && index === 1,
      outOfReach: entry.far === true,
      changed: (side === 'ally' && index === 1) || (side === 'foe' && index === 2),
      label: `${words.slot(letter, species?.name[locale] ?? '')}, ${text.hpLabel(entry.hp, 120)}`,
    }
  }
  const effect = (id: string, scope: FieldEffect['scope'], move: string, turns?: number, name?: string): FieldEffect => ({
    id,
    name: name ?? pack.moves[move]?.name[locale] ?? '',
    scope,
    scopeText: words.scope[scope],
    ...(turns === undefined ? {} : { lasting: words.turnsLeft(turns) }),
    description: pack.moves[move]?.description[locale] ?? '',
  })
  const effects: FieldEffect[] = [
    effect('terrain', 'field', 'grassyterrain', 5),
    effect('weather', 'field', 'sunnyday', 1, words.weather.sun),
    effect('room', 'field', 'trickroom', 2),
    effect('screen', 'foes', 'lightscreen', 3),
    effect('veil', 'party', 'auroraveil', 4),
    effect('spikes', 'foes', 'toxicspikes'),
    { id: 'boost', name: `${pack.statNames.atk[locale]} +2 · ${pack.statNames.spe[locale]} -1`, scope: 'party', letter: 'B', scopeText: `${words.scope.party}, ${words.slot('B', pack.species.charizard?.name[locale] ?? '')}` },
    { ...effect('seed', 'foes', 'leechseed'), letter: 'C', scopeText: `${words.scope.foes}, ${words.slot('C', pack.species.dragonite?.name[locale] ?? '')}` },
  ]
  const slots: LineSlot[] = FOES.map((entry, index) => ({ letter: LETTERS[index] ?? '', state: entry.state }))
  const current = FOES[index]
  const species = current && pack.species[current.id]
  return (
    <Phone>
      <Section title="Battlefield plan">
        <Note>
          Both lines from above, at their longest: six foes, five in the party. Each line is centred on the other, as the rules place
          them, so who faces whom can be read off. The two on the scene are lit. A downed Pokémon is red and shows its Agony stacks; a dead one leaves its slot empty;
          a foe out of your Pokémon’s reach is darker; yours is underlined in gold. The terrain and the weather are named between the
          lines; {words.more} opens the list of everything in effect.
        </Note>
        <Screen kind="menu" label="Battlefield plan">
          <FieldPlan
            foes={FOES.map((entry, index) => tile(entry, index, 'foe'))}
            allies={PARTY.map((entry, index) => tile(entry, index, 'ally'))}
            shown={shown}
            onSelect={(id) => setOnScene(id.startsWith('foe') ? [id, shown[1] ?? ''] : [shown[0] ?? '', id])}
            labels={{ foes: words.foes, allies: words.party }}
            ground={
              <>
                <TypeLabel type="Grass" text={pack.moves.grassyterrain?.name[locale] ?? ''} />
                <TypeLabel type="Fire" text={words.weather.sun} />
              </>
            }
          >
            <OptionButton primary>
              {words.more} · {effects.length}
            </OptionButton>
            <OptionButton>{text.back}</OptionButton>
          </FieldPlan>
        </Screen>
      </Section>
      <Section title="Everything in effect">
        <Note>
          The list behind {words.more}. The mark says whom an effect touches: a diamond for the whole field, an arrow up for the foes’
          side, an arrow down for yours, as they lie on the plan, followed by a Pokémon’s letter when the effect sits on that one
          Pokémon. In gold, the turns it has left. The list scrolls. On the plan, a gold double arrow marks a Pokémon that carries
          effects of its own.
        </Note>
        <Screen kind="menu" label="Effects">
          <FieldEffects effects={effects} label={words.effects} empty={words.noEffects}>
            <OptionButton>{text.back}</OptionButton>
          </FieldEffects>
        </Screen>
      </Section>
      <Section title="Line browser">
        <Note>
          One Pokémon at a time, with the line’s letters underneath. The arrows step over the empty slot (D) and stop at the ends.
        </Note>
        <Screen label="Line browser">
          <div className="sb-browser" style={{ left: 0, top: 'calc(6 * var(--dn-u))', '--dn-hud-width': 'calc(104 * var(--dn-u))' } as CSSProperties}>
            {current && species && (
              <LineBrowser slots={slots} current={index} onChange={setIndex} labels={words} currentLabel={words.slot(LETTERS[index] ?? '', species.name[locale])}>
                <HudBox
                  side="foe"
                  name={species.name[locale]}
                  level={40}
                  gender="M"
                  hp={current.hp}
                  maxHp={120}
                  text={text}
                  {...(current.state === 'downed' ? { agony: { stacks: 2, text: text.agony, label: text.agonyLabel(2, 3) } } : {})}
                />
              </LineBrowser>
            )}
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Field', component: FieldPieces } satisfies Meta<typeof FieldPieces>
export default meta

export const PlanAndBrowser: StoryObj<typeof meta> = {}
