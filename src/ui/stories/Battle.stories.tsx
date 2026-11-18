import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AbilityBand, AgonyBadge, CommandMenu, ExpBar, HpBar, HudBox, MessageBox, MoveButton, Screen, StatusBadge, type StatusId, TileButton } from '..'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

const STATUSES: StatusId[] = ['psn', 'tox', 'brn', 'par', 'slp', 'frz']
const MOVES = ['flamethrower', 'airslash', 'dragonclaw', 'earthquake', 'roost', 'swordsdance'] as const

function HudAndMeters({ hp, maxHp }: { hp: number; maxHp: number }) {
  const text = useBattleText()
  const locale = useLocale()
  const pack = usePack()
  const name = (id: string): string => pack.species[id]?.name[locale] ?? id
  return (
    <Phone>
      <Section title="HUD box">
        <Note>
          Name, gender and level stand on the scene; badges and the HP bar sit on the dark plate, as in Black 2. Change the HP in the
          controls below: the bar drains at a steady pace and turns yellow under half, red at a fifth. A downed Pokémon has no HP to
          show: its Agony (decision 266) is a badge as BRN or PSN are, and three long bars in the HP bar’s place, one for each time it
          can still agonize; a bar empties when a stack is lost.
        </Note>
        <Screen label="HUD boxes">
          <div className="sb-stack sb-pad">
            <HudBox side="foe" name={name('charizard')} level={84} gender="M" hp={hp} maxHp={maxHp} text={text} />
            <HudBox side="player" name={name('pikachu')} level={54} gender="F" hp={hp} maxHp={maxHp} text={text} showNumbers>
              <StatusBadge status="par" text={text.status.par.badge} label={text.status.par.name} />
            </HudBox>
            <HudBox side="player" name={name('magnemite')} level={7} gender="N" hp={Math.round(maxHp * 0.12)} maxHp={maxHp} text={text}>
              <StatusBadge status="brn" text={text.status.brn.badge} label={text.status.brn.name} />
            </HudBox>
            <HudBox
              side="player"
              name={name('snorlax')}
              level={40}
              gender="M"
              hp={0}
              maxHp={maxHp}
              text={text}
              agony={{ stacks: 2, text: text.agony, label: text.agonyLabel(2, 3) }}
            />
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
                <StatusBadge key={status} status={status} text={text.status[status].badge} label={text.status[status].name} />
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
  const text = useBattleText()
  const locale = useLocale()
  const pack = usePack()
  const [view, setView] = useState<'commands' | 'moves'>('commands')
  const [move, setMove] = useState<string | null>(null)
  return (
    <Phone>
      <Section title="Command menu and moves">
        <Note>
          The touch screen, drawn with the games’ own pieces (decision 255): the two halves of the ball, as large as the games draw
          them, over a brown ground that shows between them as the belt; FIGHT written in the belt’s notch, with no button drawn
          (decision 259); BAG, SWITCH and RUN on the three tiles of the bottom edge, each word written by the app (decision 256).
          Press FIGHT: the halves part and the belt lights up; then the ball opens, the red half up under the strip and the white one
          down, and the six moves come in the belt, two across and three down, each on its type’s colour, with the way back on RUN’s
          own tile (decision 261). The whole command screen, with the order of the round, the strip and the tiles of the top edge, is
          in Screens / Battle.
        </Note>
        {/* A screen of its own for each, as in the app: one that comes with its ball open opens it. */}
        <Screen key={view} kind="touch" label="Commands" {...(view === 'moves' ? { ball: 'open' as const } : {})}>
          {view === 'commands' ? (
            <CommandMenu labels={text.commands} disabled={['run']} onCommand={(command) => command === 'fight' && setView('moves')} />
          ) : (
            <div className="dn-moves">
              <div className="dn-moves__grid">
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
                      categoryLabel={text.category[data.category]}
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
              <TileButton word={text.back} edge="bottom" tone="run" onClick={() => setView('commands')} />
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
  const text = useBattleText()
  const locale = useLocale()
  const pack = usePack()
  const [index, setIndex] = useState(0)
  const a = pack.species.gengar?.name[locale] ?? 'A'
  const b = pack.species.snorlax?.name[locale] ?? 'B'
  const lines = [
    text.messages.prompt(a),
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

/** The band's words, as the games order them in each language. */
const bandWords = (locale: 'en' | 'fr', name: string, ability: string): string => (locale === 'fr' ? `${ability} ${/^[aeiouyh]/i.test(name) ? 'd’' : 'de '}${name}` : `${name}’s ${ability}`)

function AbilityBands() {
  const text = useBattleText()
  const locale = useLocale()
  const pack = usePack()
  const [round, setRound] = useState(0)
  const foe = pack.species.arcanine?.name[locale] ?? 'A'
  const ally = pack.species.pikachu?.name[locale] ?? 'B'
  const abilityName = (id: string): string => pack.abilities[id]?.name[locale] ?? id
  return (
    <Phone>
      <Section title="Ability band">
        <Note>
          Denborn’s own drawing, after the band the games slide in when an Ability acts (decisions 165 and 167). It comes in from its Pokémon’s
          side of the scene: over a foe’s head from the right, in the reds; over an ally’s from the left, in the blues. A long name goes
          on a second line. It stays while the message band says what the Ability did, then goes. With reduced motion it appears in
          place. A screen reader gets it once, like a line of the message band. Tap the message to see the bands come in again.
        </Note>
        <Screen label="Ability band">
          <div className="sb-browser" style={{ left: 0, top: 'calc(2 * var(--dn-u))', ['--dn-hud-width' as string]: 'calc(104 * var(--dn-u))' }}>
            <HudBox side="foe" name={foe} level={36} gender="M" hp={120} maxHp={120} text={text} />
          </div>
          <div className="sb-browser" style={{ right: 0, bottom: 'calc(48 * var(--dn-u))', ['--dn-hud-width' as string]: 'calc(104 * var(--dn-u))' }}>
            <HudBox side="player" name={ally} level={34} gender="F" hp={74} maxHp={96} text={text} />
          </div>
          <AbilityBand key={`foe-${round}`} side="foe" text={bandWords(locale, foe, abilityName('intimidate'))} />
          <AbilityBand key={`ally-${round}`} side="player" text={bandWords(locale, ally, abilityName('lightningrod'))} />
          <div className="sb-message">
            <MessageBox text={text.messages.prompt(ally)} onAdvance={() => setRound(round + 1)} advanceLabel={text.next} />
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

export const AbilityBandStory: StoryObj = { name: 'Ability Band', render: () => <AbilityBands /> }
