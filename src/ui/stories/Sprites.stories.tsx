import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'
import { Battler, type BattlerHandle, type BattlerPose, CategoryIcon, ItemIconImage, PokemonIcon, PokemonSprite, Screen, TypeLabel } from '..'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

const ITEMS = ['potion', 'revive', 'fullrestore', 'linkingcord', 'leftovers', 'oranberry', 'ppup', 'firestone'] as const

function SpritesAndIcons() {
  const pack = usePack()
  const locale = useLocale()
  const text = useBattleText()
  const pikachu = pack.species.pikachu
  const mew = pack.species.mew
  if (!pikachu || !mew) return null
  return (
    <Phone>
      <Section title="Battle sprites">
        <Note>
          Showdown’s Gen 5 animated sprites, front and back, with the female one where it differs. They are drawn on whole device pixels,
          so their pixels stay square at any screen size. The last one has no sprite at all: MissingNo. stands in its place (see “Missing
          No”).
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
        <Note>
          Pokémon icons, item icons and category labels from Showdown (a few item icons from PokéAPI). Type labels are drawn by the app, in
          the language of the interface.
        </Note>
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
                <TypeLabel key={type.id} type={type.name.en} text={type.name[locale]} />
              ))}
            </div>
            <div className="sb-row" style={{ gap: 2 }}>
              {(['Physical', 'Special', 'Status'] as const).map((category) => (
                <CategoryIcon key={category} category={category} label={text.category[category]} />
              ))}
              {(['Physical', 'Special', 'Status'] as const).map((category) => (
                <CategoryIcon key={category} category={category} label={text.category[category]} compact />
              ))}
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

/** A species the artwork has nothing for, as a sprite that the device has not fetched yet would be. */
const NO_SPRITE = { id: 'none', sprite: null, femaleSprite: false } as const

function MissingStandIn() {
  const pack = usePack()
  const locale = useLocale()
  const pikachu = pack.species.pikachu
  const snorlax = pack.species.snorlax
  if (!pikachu || !snorlax) return null
  return (
    <Phone>
      <Section title="MissingNo., in the place of a sprite that is not there">
        <Note>
          A Pokémon whose sprite is not there shows MissingNo. (decisions 181 and 185): on a device that is still fetching the sprites, or for
          artwork that lacks one. It is the one piece of artwork kept in the repository: “MissingNo. GIF” by Pokemon-Ranger-Sumi, brought back
          to its own 45×50 pixels with a see-through background, its frames and their timing kept (decision 186). Left to right: Pikachu for
          size; MissingNo. from the front; from behind, mirrored (decision 188); held still, as for a downed Pokémon or reduced motion; at
          half size, as in a party’s line-up. It is read out by the Pokémon’s own name.
        </Note>
        <Screen label="MissingNo.">
          <div className="sb-row sb-pad" style={{ alignItems: 'end' }}>
            <PokemonSprite species={pikachu} name={pikachu.name[locale]} />
            <PokemonSprite species={NO_SPRITE} name="Front" />
            <PokemonSprite species={NO_SPRITE} name="Back" back />
            <PokemonSprite species={NO_SPRITE} name="Still" frozen />
            <PokemonSprite species={NO_SPRITE} name="Small" scale={0.5} />
          </div>
        </Screen>
      </Section>
      <Section title="On the field">
        <Note>As a foe, facing left like every foe, and as an ally, mirrored; Snorlax beside it for size.</Note>
        <Screen label="Field">
          <div className="sb-spot" style={{ left: 'calc(150 * var(--dn-u))', top: 'calc(20 * var(--dn-u))' }}>
            <Battler species={NO_SPRITE} name="Foe" side="foe" />
          </div>
          <div className="sb-spot" style={{ left: 'calc(210 * var(--dn-u))', top: 'calc(20 * var(--dn-u))' }}>
            <Battler species={snorlax} name={snorlax.name[locale]} side="foe" />
          </div>
          <div className="sb-spot" style={{ left: 'calc(50 * var(--dn-u))', top: 'calc(96 * var(--dn-u))' }}>
            <Battler species={NO_SPRITE} name="Ally" side="player" />
          </div>
          <div className="sb-spot" style={{ left: 'calc(115 * var(--dn-u))', top: 'calc(96 * var(--dn-u))' }}>
            <Battler species={snorlax} name={snorlax.name[locale]} side="player" />
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Sprites' } satisfies Meta
export default meta

export const SpritesIcons: StoryObj = { render: () => <SpritesAndIcons /> }

export const OnTheField: StoryObj = { render: () => <BattlerPoses /> }

export const MissingNo: StoryObj = { render: () => <MissingStandIn /> }
