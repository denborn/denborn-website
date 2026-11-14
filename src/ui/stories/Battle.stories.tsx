import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AgonyBadge, CommandMenu, ExpBar, HpBar, HudBox, MessageBox, MoveButton, Screen, StatusBadge, type StatusId } from '..'
import { Note, Phone, Section, useBoardText, useLocale, usePack } from './board'

const STATUSES: StatusId[] = ['psn', 'tox', 'brn', 'par', 'slp', 'frz']
const MOVES = ['flamethrower', 'airslash', 'dragonclaw', 'earthquake', 'roost', 'swordsdance'] as const

function HudAndMeters({ hp, maxHp }: { hp: number; maxHp: number }) {
  const text = useBoardText()
  const locale = useLocale()
  const pack = usePack()
  const name = (id: string): string => pack.species[id]?.name[locale] ?? id
  return (
    <Phone>
      <Section title="HUD box">
        <Note>
          Name, gender and level stand on the scene; badges and the HP bar sit on the dark plate, as in Black 2. Change the HP in the
          controls below: the bar drains at a steady pace and turns yellow under half, red at a fifth.
        </Note>
        <Screen label="HUD boxes">
          <div className="sb-stack sb-pad">
            <HudBox side="foe" name={name('charizard')} level={84} gender="M" hp={hp} maxHp={maxHp} text={text} />
            <HudBox side="player" name={name('pikachu')} level={54} gender="F" hp={hp} maxHp={maxHp} text={text} showNumbers>
              <StatusBadge status="par" text={text.status.par[0]} label={text.status.par[1]} />
            </HudBox>
            <HudBox side="player" name={name('magnemite')} level={7} gender="N" hp={Math.round(maxHp * 0.12)} maxHp={maxHp} text={text}>
              <StatusBadge status="brn" text={text.status.brn[0]} label={text.status.brn[1]} />
            </HudBox>
          </div>
        </Screen>
      </Section>
      <Section title="Meters and badges">
        <Screen kind="menu" label="Meters and badges">
          <div className="sb-stack sb-pad">
            <HpBar current={hp} max={maxHp} label={text.hpLabel(hp, maxHp)} />
            <ExpBar progress={0.62} label="EXP 62%" />
            <div className="sb-row">
              {STATUSES.map((status) => (
                <StatusBadge key={status} status={status} text={text.status[status][0]} label={text.status[status][1]} />
              ))}
            </div>
            <div className="sb-row">
              {[3, 2, 1, 0].map((stacks) => (
                <AgonyBadge key={stacks} stacks={stacks} text={text.agony} label={text.agonyLabel(stacks, 3)} />
              ))}
            </div>
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

function Commands() {
  const text = useBoardText()
  const locale = useLocale()
  const pack = usePack()
  const [view, setView] = useState<'commands' | 'moves'>('commands')
  const [move, setMove] = useState<string | null>(null)
  return (
    <Phone>
      <Section title="Command menu and moves">
        <Note>
          The touch screen. FIGHT is the great ball, as in Black and White; BAG, RUN and SWITCH run along the bottom. FIGHT opens the six
          moves, each on its type’s colour.
        </Note>
        <Screen kind="touch" label="Commands">
          {view === 'commands' ? (
            <CommandMenu labels={text.commands} disabled={['run']} onCommand={(command) => command === 'fight' && setView('moves')} />
          ) : (
            <div className="dn-moves">
              {MOVES.map((id, index) => {
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
                    pp={index === 4 ? 0 : data.pp - index}
                    maxPp={data.pp}
                    ppText={text.pp}
                    selected={move === id}
                    disabled={index === 4}
                    onSelect={() => setMove(id)}
                  />
                )
              })}
            </div>
          )}
        </Screen>
        <div className="sb-tools">
          <button type="button" onClick={() => setView(view === 'commands' ? 'moves' : 'commands')}>
            {view === 'commands' ? 'Show the moves' : 'Show the commands'}
          </button>
        </div>
      </Section>
    </Phone>
  )
}

function Messages() {
  const text = useBoardText()
  const locale = useLocale()
  const pack = usePack()
  const [index, setIndex] = useState(0)
  const a = pack.species.gengar?.name[locale] ?? 'A'
  const b = pack.species.snorlax?.name[locale] ?? 'B'
  const lines = [
    text.messages.used(a, pack.moves.shadowball?.name[locale] ?? ''),
    text.messages.downed(b),
    text.messages.agonizing(b),
    text.messages.bagUsed(a, pack.items.revive?.name[locale] ?? '', b),
    text.messages.revived(b),
  ]
  return (
    <Phone>
      <Section title="Message band">
        <Note>
          Text appears letter by letter over the darkened scene. A tap, Enter or Space shows the whole line, then asks for the next one. A
          screen reader gets each line whole, once.
        </Note>
        <Screen label="Message band">
          <div className="sb-message">
            <MessageBox text={lines[index % lines.length] ?? ''} onAdvance={() => setIndex(index + 1)} advanceLabel={text.next} />
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Battle' } satisfies Meta
export default meta

export const HudMetersBadges: StoryObj<typeof HudAndMeters> = {
  render: (args) => <HudAndMeters {...args} />,
  args: { hp: 96, maxHp: 120 },
  argTypes: { hp: { control: { type: 'range', min: 0, max: 120, step: 1 } }, maxHp: { control: false } },
}

export const CommandsAndMoves: StoryObj = { render: () => <Commands /> }

export const MessageBand: StoryObj = { render: () => <Messages /> }
