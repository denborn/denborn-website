import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'
import { Battler, type BattlerHandle, type BattlerPose, CategoryIcon, ItemIconImage, PokemonIcon, PokemonSprite, Screen, TypeIcon } from '..'
import { Note, Phone, Section, useLocale, usePack } from './board'

const ITEMS = ['potion', 'revive', 'fullrestore', 'linkingcord', 'leftovers', 'oranberry', 'ppup', 'firestone'] as const

function SpritesAndIcons() {
  const pack = usePack()
  const locale = useLocale()
  const pikachu = pack.species.pikachu
  const mew = pack.species.mew
  if (!pikachu || !mew) return null
  return (
    <Phone>
      <Section title="Battle sprites">
        <Note>
          Showdown’s Gen 5 animated sprites, front and back, with the female one where it differs. They are drawn on whole device pixels,
          so their pixels stay square at any screen size. The last one has no sprite at all: its name is shown.
        </Note>
        <Screen label="Sprites">
          <div className="sb-row sb-pad" style={{ alignItems: 'end' }}>
            <PokemonSprite species={pikachu} name={pikachu.name[locale]} />
            <PokemonSprite species={pikachu} name={pikachu.name[locale]} female />
            <PokemonSprite species={pikachu} name={pikachu.name[locale]} back />
            <PokemonSprite species={mew} name={mew.name[locale]} frozen />
            <PokemonSprite species={{ id: 'none', sprite: null, femaleSprite: false }} name="???" />
          </div>
        </Screen>
      </Section>
      <Section title="Icons">
        <Note>Pokémon icons, item icons, and the games’ type and category labels, all from Showdown (a few item icons from PokéAPI).</Note>
        <Screen kind="menu" label="Icons">
          <div className="sb-stack sb-pad">
            <div className="sb-row" style={{ gap: 0 }}>
              {[1, 4, 7, 25, 94, 143].map((num) => (
                <PokemonIcon key={num} num={num} />
              ))}
            </div>
            <div className="sb-row" style={{ gap: 4 }}>
              {ITEMS.map((id) => {
                const item = pack.items[id]
                return item ? <ItemIconImage key={id} icon={item.icon} label={item.name[locale]} /> : null
              })}
            </div>
            <div className="sb-row" style={{ gap: 2 }}>
              {Object.values(pack.types).map((type) => (
                <TypeIcon key={type.id} type={type.name.en} label={type.name[locale]} />
              ))}
            </div>
            <div className="sb-row" style={{ gap: 2 }}>
              <CategoryIcon category="Physical" label="Physical" />
              <CategoryIcon category="Special" label="Special" />
              <CategoryIcon category="Status" label="Status" />
            </div>
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

function BattlerPoses() {
  const pack = usePack()
  const locale = useLocale()
  const foe = useRef<BattlerHandle>(null)
  const ally = useRef<BattlerHandle>(null)
  const [pose, setPose] = useState<BattlerPose>('standing')
  const [round, setRound] = useState(0)
  const gengar = pack.species.gengar
  const snorlax = pack.species.snorlax
  if (!gengar || !snorlax) return null
  return (
    <Phone>
      <Section title="A Pokémon on the field">
        <Note>
          It slides in from its own side, lunges when it uses a move, blinks when it is hit, sinks and greys when downed (it stays on the
          field: it is agonizing), and drops out of sight when it is out of the fight. With reduced motion there is no slide, lunge or
          blink, and sprites stand still.
        </Note>
        <Screen label="Battlers">
          <div className="sb-spot" style={{ left: 'calc(180 * var(--dn-u))', top: 'calc(20 * var(--dn-u))' }}>
            <Battler key={`foe${round}`} ref={foe} species={gengar} name={gengar.name[locale]} side="foe" pose={pose} />
          </div>
          <div className="sb-spot" style={{ left: 'calc(70 * var(--dn-u))', top: 'calc(96 * var(--dn-u))' }}>
            <Battler key={`ally${round}`} ref={ally} species={snorlax} name={snorlax.name[locale]} side="player" />
          </div>
        </Screen>
        <div className="sb-tools">
          <button type="button" onClick={() => setRound(round + 1)}>
            Enter
          </button>
          <button type="button" onClick={() => void ally.current?.attack().then(() => foe.current?.hit())}>
            Attack, then hit
          </button>
          <button type="button" onClick={() => setPose('downed')}>
            Downed
          </button>
          <button type="button" onClick={() => setPose('standing')}>
            Revived
          </button>
          <button type="button" onClick={() => setPose('gone')}>
            Gone
          </button>
        </div>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Sprites' } satisfies Meta
export default meta

export const SpritesIcons: StoryObj = { render: () => <SpritesAndIcons /> }

export const OnTheField: StoryObj = { render: () => <BattlerPoses /> }
