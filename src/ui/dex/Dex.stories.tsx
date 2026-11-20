import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DexIcon, DexKey, DexLamp, DexPage, Flap, ProfileGraph, StepBar, StepperBox, Tray, Wheel, type WheelSize } from '.'
import { ItemIconImage, PokemonIcon, Screen, TypeLabel } from '..'
import { STEP_ICONS, itemSheetIcon } from '../../data/sprites'
import { Note, Phone, Section, useLocale, usePack } from '../stories/board'

const SPECIES_WHEEL: WheelSize = { height: 142, row: 26 }

const STEPS = ['campaign', 'species', 'identity', 'combat', 'training', 'moves', 'items', 'review'] as const
type Step = (typeof STEPS)[number]

/** The bar of steps as the board shows it: the steps before the current one done, the two after it not open yet. */
function Steps({ current, onStep }: { current: Step; onStep: (step: Step) => void }) {
  const at = STEPS.indexOf(current)
  return (
    <StepBar
      label="Steps"
      current={current}
      onStep={onStep}
      back={{ label: 'Back', onBack: () => undefined }}
      steps={STEPS.map((id, index) => ({
        id,
        name: id,
        icon: <ItemIconImage icon={itemSheetIcon(STEP_ICONS[id])} scale={0.75} />,
        done: index < at,
        open: index <= at + 1,
      }))}
    />
  )
}

interface Args {
  /** How many of the Pokédex's species the wheel holds. */
  rows: number
}

function WheelStory({ rows }: Args) {
  const pack = usePack()
  const locale = useLocale()
  const species = Object.values(pack.species)
    .sort((a, b) => a.num - b.num)
    .slice(0, rows)
    .map((entry) => ({ id: entry.id, name: entry.name[locale], num: entry.num }))
  const [looked, setLooked] = useState<string>()
  const [chosen, setChosen] = useState<string>()
  const [step, setStep] = useState<Step>('species')
  const [tray, setTray] = useState(false)
  const shown = species.find((entry) => entry.id === looked) ?? species[0]
  return (
    <Phone>
      <Section title="The wheel">
        <Note>
          Decision 290. The row in the middle is the one looked at: whole, lit, its brackets red. Drag it, scroll it, press a row to bring it to the
          middle, use the arrows, Page Up and Page Down, Home and End, or type a name. The rail at its side goes through the list fast. Only the
          rows near the middle are drawn, however long the list. A press on the row in the middle, or CHOOSE, lights its lamp. FILTER opens a
          tray over the screen: Escape or its cross shuts it.
        </Note>
        <Screen kind="dex" label="The wheel">
          <DexPage
            title="The wheel"
            covered={tray}
            steps={<Steps current={step} onStep={setStep} />}
            foot={
              <>
                <DexKey>Search</DexKey>
                <DexKey on={tray} onClick={() => setTray(true)}>
                  Filter
                </DexKey>
                <span className="dn-dex-foot__end">
                  <DexKey shape="go" disabled={!shown} onClick={() => setChosen(shown?.id)}>
                    Choose
                  </DexKey>
                </span>
              </>
            }
          >
            <div style={{ position: 'absolute', left: 'calc(110 * var(--dn-u))', top: 0, width: 'calc(146 * var(--dn-u))' }}>
              <Wheel
                label="Pokémon"
                items={species}
                centred={looked}
                onCentre={setLooked}
                onPick={setChosen}
                size={SPECIES_WHEEL}
                rail
                empty="No Pokémon."
                row={(entry, lit) => (
                  <span className={`dn-dex-bar${lit ? ' dn-dex-bar--lit' : ''}`} style={{ height: '100%' }}>
                    <DexIcon>
                      <PokemonIcon num={entry.num} scale={0.75} />
                    </DexIcon>
                    <DexLamp on={entry.id === chosen} />
                    <span className="dn-dex-bar__number">{String(entry.num).padStart(3, '0')}</span>
                    <span className="dn-dex-bar__name">{entry.name}</span>
                  </span>
                )}
              />
            </div>
            <div className="dn-dex-slab" style={{ position: 'absolute', left: 'calc(4 * var(--dn-u))', top: 'calc(18 * var(--dn-u))', width: 'calc(102 * var(--dn-u))', height: 'calc(100 * var(--dn-u))' }}>
              <span className="dn-text-outline">
                <Flap shown={shown?.id ?? ''}>{shown?.name ?? '???'}</Flap>
              </span>
            </div>
          </DexPage>
          <Tray open={tray} title="Filter" closeLabel="Close" onClose={() => setTray(false)} foot={<DexKey onClick={() => setTray(false)}>OK</DexKey>}>
            <p className="dn-tray__text">A tray: what comes over a screen of the Pokédex. The focus is held inside it.</p>
            <p className="dn-tray__text">
              <TypeLabel type="Electric" text="Electric" /> <TypeLabel type="Water" text="Water" />
            </p>
          </Tray>
        </Screen>
      </Section>
    </Phone>
  )
}

const ATTRIBUTES = [
  { id: 'strength', short: 'STR', name: 'Strength' },
  { id: 'dexterity', short: 'DEX', name: 'Dexterity' },
  { id: 'endurance', short: 'END', name: 'Endurance' },
  { id: 'intelligence', short: 'INT', name: 'Intelligence' },
  { id: 'perception', short: 'PER', name: 'Perception' },
  { id: 'charisma', short: 'CHA', name: 'Charisma' },
] as const

const CORNERS = [
  { id: 'hp', short: 'HP', name: 'HP', base: 35 },
  { id: 'atk', short: 'ATK', name: 'Attack', base: 55 },
  { id: 'def', short: 'DEF', name: 'Defense', base: 40 },
  { id: 'spe', short: 'SPE', name: 'Speed', base: 90 },
  { id: 'spd', short: 'SPD', name: 'Sp. Def', base: 50 },
  { id: 'spa', short: 'SPA', name: 'Sp. Atk', base: 50 },
] as const

function NumbersStory() {
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute.id, 50])))
  const placed = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const left = 300 - placed
  return (
    <Phone>
      <Section title="Numbers in boxes, and the profile graph">
        <Note>
          Decision 292: plus above the number, minus below; a held button goes on, and the number can be typed. Decision 288: the filled shape is
          the base stats, the red outline what training makes of them. Here the six boxes drive the outline, to show it move.
        </Note>
        <Screen kind="dex" label="Boxes">
          <DexPage title="Boxes" steps={<Steps current="identity" onStep={() => undefined} />} foot={<p className={`dn-dex-count${left === 0 ? ' dn-dex-count--spent' : ''}`}>{placed}/300</p>}>
            <div style={{ position: 'absolute', inset: 'calc(2 * var(--dn-u)) calc(4 * var(--dn-u))', display: 'grid', gridTemplateColumns: 'repeat(3, calc(80 * var(--dn-u)))', gap: 'calc(4 * var(--dn-u))' }}>
              {ATTRIBUTES.map((attribute) => (
                <StepperBox
                  key={attribute.id}
                  short={attribute.short}
                  name={attribute.name}
                  tone={{ fill: `var(--dn-attr-${attribute.id})`, shade: `var(--dn-attr-${attribute.id}-shade)` }}
                  value={scores[attribute.id] ?? 0}
                  min={5}
                  max={75}
                  ceiling={Math.min(75, (scores[attribute.id] ?? 0) + Math.max(0, left))}
                  onChange={(value) => setScores({ ...scores, [attribute.id]: value })}
                  raiseLabel={`Raise ${attribute.name}`}
                  lowerLabel={`Lower ${attribute.name}`}
                />
              ))}
            </div>
          </DexPage>
        </Screen>
        <Screen kind="dex" label="Graph">
          <div style={{ position: 'absolute', left: 'calc(133 * var(--dn-u))', top: 'calc(74 * var(--dn-u))' }}>
            <ProfileGraph
              label="Stats"
              radius={46}
              corners={CORNERS.map((corner, index) => {
                const score = scores[ATTRIBUTES[index]?.id ?? ''] ?? 50
                return { ...corner, base: corner.base / 255, trained: (corner.base + score - 5) / 255, value: String(10 + score), trend: index === 3 ? 'up' : index === 5 ? 'down' : undefined, trendLabel: index === 3 ? 'raised' : 'lowered' }
              })}
            />
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta: Meta<Args> = {
  title: 'Components/Pokédex',
  argTypes: { rows: { control: { type: 'select' }, options: [0, 3, 9, 151] } },
  args: { rows: 151 },
}
export default meta

export const TheWheel: StoryObj<Args> = { name: 'The wheel', render: (args) => <WheelStory {...args} /> }
export const Numbers: StoryObj<Args> = { name: 'Boxes and the graph', render: () => <NumbersStory /> }
