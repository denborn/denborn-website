import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { BattlePlate, Battler, MessageBox, OrderBar, type PingLevel, ScenePlate, type SceneShot, type SceneSide, SceneSpot, SceneWorld, Screen, StatusBadge, TopStrip, pingLevel, spriteScale, useBattery, useClock } from '..'
import { BATTLE_BACKDROPS } from '../../data/battle-backdrops'
import { sceneArt } from '../../data/battle-scene'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

/** One line of the strip's story: a ping, and a battery or none. */
interface StripCase {
  milliseconds: number | undefined
  battery?: { percent: number; charging: boolean }
}

const STRIPS: readonly StripCase[] = [
  { milliseconds: 48, battery: { percent: 87, charging: false } },
  { milliseconds: 210, battery: { percent: 34, charging: true } },
  { milliseconds: 640, battery: { percent: 6, charging: false } },
  { milliseconds: undefined },
]

function Strip() {
  const text = useBattleText().strip
  const clock = useClock(useLocale())
  const here = useBattery()
  const pingOf = (milliseconds: number | undefined): { level: PingLevel; text: string; label: string } => {
    const level = pingLevel(milliseconds)
    return milliseconds === undefined || level === 'none' ? { level: 'none', text: text.noPing, label: text.pingLabel.none } : { level, text: text.ping(milliseconds), label: text.pingLabel[level](milliseconds) }
  }
  const batteryOf = (battery: StripCase['battery']) => battery && { ...battery, text: text.battery(battery.percent), label: text.batteryLabel(battery.percent, battery.charging) }
  return (
    <Phone>
      <Section title="The strip of a fight’s bottom screen">
        <Note>
          Across the top of a fight’s bottom screen (decision 249), as on the games’ touch screen: the device’s time; the ping to the relay,
          a small square and a figure in one colour (green up to 120 ms, yellow up to 300 ms, red past that: Denborn’s own figures), the
          square darker toward its edges (decision 262) and also as full as the line is good; then the battery, where the browser tells it (Chrome and Edge do; Safari and Firefox do not, so
          an iPhone shows none). Nothing in it is pressed. The last screen below is this device’s own, as the app would show it with no
          ping known yet.
        </Note>
        {STRIPS.map((strip) => (
          <Screen key={String(strip.milliseconds)} kind="touch" label="Strip">
            <TopStrip clock={clock} ping={pingOf(strip.milliseconds)} battery={batteryOf(strip.battery)} />
          </Screen>
        ))}
        <Screen kind="touch" label="Strip">
          <TopStrip clock={clock} ping={pingOf(undefined)} battery={batteryOf(here)} />
        </Screen>
      </Section>
    </Phone>
  )
}

interface SceneArgs {
  background: string
  /** The hour of the day, from 0 to 23. */
  hour: number
  /** What the camera does. */
  shot: SceneShot
  /** How many Pokémon each line has. */
  far: number
  near: number
  /** The played Pokémon's HP. */
  hp: number
  /** The Agony stacks left to the near line's third Pokémon. */
  stacks: number
}

interface Member {
  id: string
  level: number
  gender: 'M' | 'F'
}

// The first of each line stands on the ground: one that floats (Geodude, Zubat, Gastly) rises over its base as its animation goes.
const FAR: readonly Member[] = [
  { id: 'machop', level: 13, gender: 'M' },
  { id: 'onix', level: 14, gender: 'F' },
  { id: 'zubat', level: 11, gender: 'M' },
  { id: 'geodude', level: 12, gender: 'M' },
  { id: 'gastly', level: 15, gender: 'F' },
  { id: 'rhyhorn', level: 16, gender: 'M' },
]
const NEAR: readonly Member[] = [
  { id: 'pikachu', level: 16, gender: 'F' },
  { id: 'charmeleon', level: 17, gender: 'M' },
  { id: 'ivysaur', level: 16, gender: 'M' },
  { id: 'wartortle', level: 18, gender: 'F' },
  { id: 'eevee', level: 15, gender: 'F' },
  { id: 'snorlax', level: 20, gender: 'M' },
]

function Scene({ background, hour, shot, far, near, hp, stacks }: SceneArgs) {
  const pack = usePack()
  const locale = useLocale()
  const text = useBattleText()
  const art = sceneArt({ background, hour })
  const name = (id: string): string => pack.species[id]?.name[locale] ?? id
  const lines = { far: FAR.slice(0, far), near: NEAR.slice(0, near) }
  const [asked, setAsked] = useState<Record<SceneSide, string | undefined>>({ far: undefined, near: undefined })
  const shownOf = (side: SceneSide): Member | undefined => lines[side].find((member) => member.id === asked[side]) ?? lines[side][0]
  /** The played Pokémon: the first of the near line. */
  const played = NEAR[0]?.id
  const spot = (side: SceneSide) => {
    const member = shownOf(side)
    const species = member && pack.species[member.id]
    return (
      <SceneSpot side={side} id={species ? member.id : undefined} scale={spriteScale(side, species?.sprite)}>
        {species && <Battler species={species} name={name(member.id)} side={side === 'near' ? 'player' : 'foe'} female={member.gender === 'F'} scale={spriteScale(side, species.sprite)} pose={side === 'near' && member.id === NEAR[2]?.id ? 'downed' : 'standing'} />}
      </SceneSpot>
    )
  }
  const plate = (side: SceneSide) => {
    const member = shownOf(side)
    const index = member ? lines[side].indexOf(member) : -1
    const downed = side === 'near' && index === 2
    return (
      <ScenePlate side={side} id={member?.id}>
        {member && (
          <BattlePlate
            side={side}
            letter={'ABCDEF'.charAt(index)}
            name={name(member.id)}
            level={member.level}
            gender={member.gender}
            hp={side === 'near' ? (member.id === played ? hp : 22) : index === 1 ? 9 : 30}
            maxHp={side === 'near' ? 46 : 36}
            text={text}
            own={side === 'near' && member.id === played}
            {...(downed ? { agony: { stacks, text: text.agony, label: text.agonyLabel(stacks, 3) } } : {})}
          >
            {side === 'far' && index === 0 && <StatusBadge status="par" text={text.status.par.badge} label={text.status.par.name} />}
          </BattlePlate>
        )}
      </ScenePlate>
    )
  }
  /** A line as the command screen shows it: by the round's order for the party, by its places for the foes. */
  const bar = (side: SceneSide) => (
    <OrderBar
      entries={lines[side].map((member, index) => ({
        id: member.id,
        ...(side === 'near' ? { rank: index + 1 } : { letter: 'ABCDEF'.charAt(index) }),
        num: pack.species[member.id]?.num ?? 0,
        label: text.field.slot('ABCDEF'.charAt(index), name(member.id)),
        current: member.id === played,
        shown: member.id === shownOf(side)?.id,
        down: side === 'near' && index === 2,
      }))}
      label={side === 'near' ? text.choosing.orderLabel('') : text.choosing.foesLineLabel('')}
      onPick={(id) => setAsked({ ...asked, [side]: id })}
    />
  )
  return (
    <Phone>
      <Section title="A fight’s scene">
        <Note>
          One Pokémon of each line. Where (decision 283): on the battle base painted for it in the background, the middle of its
          feet on the middle of the base, as the games stand theirs; the near one’s feet are under the edge of the message band.
          How large (decision 277): as on Black and White’s own screen, measured on the owner’s screenshots of the games: the far
          one a DS pixel to a pixel of its picture, the near one one and a half. The background is one of Showdown’s fifteen
          backdrops (decision 268), laid at close to its own size: its whole height is the screen’s. The plates are where the games put theirs and never move (decision
          278): the far one’s band 40 down, the near one’s 120 down; without EXP (decision 247). The camera moves the scene under
          them (decision 279, the control <code>shot</code>): <code>roam</code> is its slow round while a choice is awaited,{' '}
          <code>far</code> and <code>near</code> close in on that side’s Pokémon while a round is told about it, <code>home</code>{' '}
          is at rest; the near Pokémon is nearer, so the camera moves it further and grows it faster. Nothing on this screen is
          pressed (decision 272): a press on a Pokémon in the lines below puts it on the scene. The hour of the day (decision 275,
          the control <code>hour</code>) lays a veil over the background. The near line’s third Pokémon is downed: its Agony
          (decisions 266 and 280) is the badge AGN among its conditions and three bars in the HP bar’s place (the control{' '}
          <code>stacks</code>). Denborn’s own, to be approved: the camera’s round and its two close shots, and the three veils’
          colours and hours.
        </Note>
        <Screen kind="scene" label="Scene">
          <SceneWorld backdrop={art.backdrop} url={art.url} hour={art.hour} shot={shot}>
            {spot('far')}
            {spot('near')}
          </SceneWorld>
          {plate('far')}
          {plate('near')}
          <div className="dn-scene__message">
            <MessageBox text={text.messages.prompt(name(played ?? 'pikachu'))} />
          </div>
        </Screen>
        <Screen kind="touch" label="Lines">
          <div className="dn-commands">
            <div className="dn-commands__bar dn-commands__bar--above">{bar('far')}</div>
            <div className="dn-commands__bar dn-commands__bar--below">{bar('near')}</div>
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Fight' } satisfies Meta
export default meta

export const TheStrip: StoryObj = { render: () => <Strip /> }

export const TheScene: StoryObj<typeof Scene> = {
  render: (args) => <Scene {...args} />,
  args: { background: 'meadow', hour: 12, shot: 'roam', far: 3, near: 3, hp: 37, stacks: 2 },
  argTypes: {
    background: { control: 'select', options: BATTLE_BACKDROPS.map((backdrop) => backdrop.id) },
    hour: { control: { type: 'range', min: 0, max: 23, step: 1 } },
    shot: { control: 'inline-radio', options: ['roam', 'home', 'far', 'near'] },
    far: { control: { type: 'range', min: 1, max: 6, step: 1 } },
    near: { control: { type: 'range', min: 1, max: 6, step: 1 } },
    hp: { control: { type: 'range', min: 0, max: 46, step: 1 } },
    stacks: { control: { type: 'range', min: 0, max: 3, step: 1 } },
  },
}
