import type { Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, useRef, useState } from 'react'
import {
  Battler,
  type BattlerHandle,
  type BattlerPose,
  CommandMenu,
  HudBox,
  MessageBox,
  MoveButton,
  OptionButton,
  Screen,
  StatusBadge,
} from '..'
import type { Gender } from '../../data/types'
import { Note, Phone, useBoardText, useLocale, usePack } from './board'

interface Fighter {
  id: string
  level: number
  gender: Gender
  maxHp: number
  hp: number
}

// Made-up numbers: this board shows the look and the motion, the battle engine is not involved.
const FOES: Fighter[] = [
  { id: 'gengar', level: 42, gender: 'M', maxHp: 120, hp: 120 },
  { id: 'arcanine', level: 40, gender: 'F', maxHp: 150, hp: 96 },
  { id: 'dragonite', level: 45, gender: 'M', maxHp: 166, hp: 166 },
]
const PARTY: Fighter[] = [
  { id: 'pikachu', level: 38, gender: 'F', maxHp: 98, hp: 41 },
  { id: 'charizard', level: 41, gender: 'M', maxHp: 133, hp: 133 },
  { id: 'snorlax', level: 40, gender: 'M', maxHp: 210, hp: 18 },
]
const MOVES = ['flamethrower', 'airslash', 'dragonclaw', 'earthquake', 'roost', 'swordsdance'] as const
const FOE_X = [140, 186, 232]
const PARTY_X = [26, 74, 122]
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function BattleOnAPhone() {
  const pack = usePack()
  const locale = useLocale()
  const text = useBoardText()
  const attacker = useRef<BattlerHandle>(null)
  const target = useRef<BattlerHandle>(null)
  const [view, setView] = useState<'commands' | 'moves'>('commands')
  const [busy, setBusy] = useState(false)
  const [targetHp, setTargetHp] = useState(120)
  const [stacks, setStacks] = useState(3)
  const [pose, setPose] = useState<BattlerPose>('standing')
  const nameOf = (id: string): string => pack.species[id]?.name[locale] ?? id
  const [message, setMessage] = useState<string | null>(null)
  const shown = message ?? text.messages.prompt(nameOf('charizard'))

  const playMove = async (moveId: string): Promise<void> => {
    setBusy(true)
    setView('commands')
    setMessage(text.messages.used(nameOf('charizard'), pack.moves[moveId]?.name[locale] ?? moveId))
    await wait(700)
    await attacker.current?.attack()
    if (pose === 'standing') {
      await target.current?.hit()
      const left = Math.max(0, targetHp - 48)
      setTargetHp(left)
      await wait(900)
      if (left === 0) {
        setPose('downed')
        setMessage(text.messages.downed(nameOf('gengar')))
        await wait(1400)
        setMessage(text.messages.agonizing(nameOf('gengar')))
        await wait(1400)
      }
    } else if (pose === 'downed') {
      setMessage(text.messages.hitWhileDown(nameOf('gengar')))
      const left = stacks - 1
      setStacks(left)
      await wait(1400)
      if (left === 0) {
        setPose('gone')
        setMessage(text.messages.died(nameOf('gengar')))
        await wait(1400)
      }
    }
    setMessage(null)
    setBusy(false)
  }

  const reset = (): void => {
    setTargetHp(120)
    setStacks(3)
    setPose('standing')
    setMessage(null)
  }

  return (
    <Phone>
      <Screen label="Battle scene">
        {FOES.map((foe, index) => {
          const species = pack.species[foe.id]
          if (!species) return null
          return (
            <div key={foe.id} className="sb-spot" style={{ left: `calc(${FOE_X[index] ?? 0} * var(--dn-u))`, bottom: 'calc(121 * var(--dn-u))' }}>
              <Battler
                ref={index === 0 ? target : undefined}
                species={species}
                name={species.name[locale]}
                side="foe"
                female={foe.gender === 'F'}
                pose={index === 0 ? pose : 'standing'}
                scale={0.55}
              />
            </div>
          )
        })}
        {PARTY.map((ally, index) => {
          const species = pack.species[ally.id]
          if (!species) return null
          return (
            <div key={ally.id} className="sb-spot" style={{ left: `calc(${PARTY_X[index] ?? 0} * var(--dn-u))`, bottom: 'calc(40 * var(--dn-u))' }}>
              <Battler
                ref={index === 1 ? attacker : undefined}
                species={species}
                name={species.name[locale]}
                side="player"
                female={ally.gender === 'F'}
                scale={0.66}
              />
            </div>
          )
        })}
        <div className="sb-hud-stack" style={{ left: 'calc(2 * var(--dn-u))', top: 'calc(3 * var(--dn-u))', '--dn-hud-width': 'calc(104 * var(--dn-u))' } as CSSProperties}>
          {FOES.map((foe, index) => (
            <HudBox
              key={foe.id}
              side="foe"
              name={nameOf(foe.id)}
              level={foe.level}
              gender={foe.gender}
              hp={index === 0 ? targetHp : foe.hp}
              maxHp={foe.maxHp}
              text={text}
              {...(index === 0 && pose !== 'standing' ? { agony: { stacks, text: text.agony, label: text.agonyLabel(stacks, 3) }, agonyLook: 'bar' as const } : {})}
            />
          ))}
        </div>
        <div className="sb-hud-stack" style={{ right: 'calc(2 * var(--dn-u))', bottom: 'calc(49 * var(--dn-u))', '--dn-hud-width': 'calc(104 * var(--dn-u))' } as CSSProperties}>
          {PARTY.map((ally) => (
            <HudBox key={ally.id} side="player" name={nameOf(ally.id)} level={ally.level} gender={ally.gender} hp={ally.hp} maxHp={ally.maxHp} text={text}>
              {ally.id === 'snorlax' && <StatusBadge status="psn" text={text.status.psn[0]} label={text.status.psn[1]} />}
            </HudBox>
          ))}
        </div>
        <div className="sb-message">
          <MessageBox text={shown} />
        </div>
      </Screen>
      <Screen kind="touch" label="Commands">
        {view === 'commands' ? (
          <CommandMenu
            labels={text.commands}
            disabled={busy || pose === 'gone' ? ['fight', 'bag', 'run', 'switch'] : []}
            onCommand={(command) => command === 'fight' && setView('moves')}
          />
        ) : (
          <div className="dn-moves">
            {MOVES.map((id) => {
              const data = pack.moves[id]
              if (!data) return null
              return (
                <MoveButton
                  key={id}
                  name={data.name[locale]}
                  type={data.type}
                  typeLabel={pack.types[data.type.toLowerCase()]?.name[locale] ?? data.type}
                  category={data.category}
                  categoryLabel={data.category}
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
      </Screen>
      <div className="sb-tools">
        <button type="button" onClick={reset}>
          Start again
        </button>
      </div>
      <Note>
        A mock for the look and the motion only: the numbers are made up and the battle engine is not involved. Press <strong>FIGHT</strong>,
        pick a move, and watch the first foe: three hits bring it down, three more end its Agony. BAG, RUN and SWITCH are drawn but do
        nothing here. The layout for four to six Pokémon a side is designed with the battle screens (milestone 6).
      </Note>
    </Phone>
  )
}

const meta = { title: 'Scenes/Battle on a phone', component: BattleOnAPhone } satisfies Meta<typeof BattleOnAPhone>
export default meta

export const ThreeAgainstThree: StoryObj<typeof meta> = {}
