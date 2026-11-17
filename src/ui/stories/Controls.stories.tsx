import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { MenuButton, type MenuTone, OptionButton, Panel, PointedMenuButton, PokemonIcon, Screen, Slot } from '..'
import { MENU_POKEMON, type MenuPokemon } from '../../data/sprites'
import { Note, Phone, Section, useLocale, usePack } from './board'

const PARTY = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'] as const

/** Each colour of a menu button, with the Pokémon it was chosen for. */
const MENU: readonly { tone: MenuTone; pokemon: MenuPokemon }[] = [
  { tone: 'yellow', pokemon: MENU_POKEMON.pikachu },
  { tone: 'red', pokemon: MENU_POKEMON.eternamaxEternatus },
  { tone: 'brown', pokemon: MENU_POKEMON.falinks },
  { tone: 'grey', pokemon: MENU_POKEMON.klang },
  { tone: 'purple', pokemon: MENU_POKEMON.megaStarmie },
]

function Controls() {
  const pack = usePack()
  const locale = useLocale()
  const [chosen, setChosen] = useState<string>('charmander')
  const [speed, setSpeed] = useState('mid')
  return (
    <Phone>
      <Section title="Slots">
        <Note>
          A row that can be chosen, after the party screen: resting, selected, confirmed (green), downed (red) and unavailable. The state is
          also carried by the outline, never by the colour alone.
        </Note>
        <Screen kind="menu" label="Slots">
          <div className="sb-stack sb-pad">
            {PARTY.map((id, index) => {
              const species = pack.species[id]
              if (!species) return null
              return (
                <Slot
                  key={id}
                  selected={chosen === id}
                  state={index === 2 ? 'ok' : index === 3 ? 'down' : 'normal'}
                  onClick={() => setChosen(id)}
                >
                  <PokemonIcon num={species.num} />
                  <span className="dn-text-shadow">{species.name[locale]}</span>
                </Slot>
              )
            })}
            <Slot disabled>
              <span className="dn-text-shadow">—</span>
            </Slot>
          </div>
        </Screen>
      </Section>
      <Section title="Menu buttons">
        <Note>
          The main menu’s buttons (decisions 221, 224 and 230): a plate in the colours of its Pokémon, in two flat halves with a faint checker
          on the lower one, in a party slot’s rim. Everything starts from
          the left: the Pokémon, in a place that is the same on every button, then one word. In its place the Pokémon is in the middle and
          stands on the bottom, over its round shadow, so that a small one and a large one are about the same point, on one line. Blue is the party slot’s own; the other colours are Denborn’s own, from
          colours measured elsewhere. Hold one down: it sinks and lights up, its rim turns white and its Pokémon hops off its shadow; let
          go, and it springs back. The blue pair is UPDATE’s (decisions 233 and 239): the options screen’s shape, pointed at both ends, as large as
          its cell, with its Pokémon as the last letter of its word, as large as on the other buttons and centred on the capitals (decisions 235 and 237); the second cannot be pressed.
        </Note>
        <Screen kind="menu" label="Menu buttons">
          <div className="dn-menu">
            <div className="dn-menu__grid">
              {MENU.map(({ tone, pokemon }) => (
                <MenuButton key={tone} tone={tone} pokemon={pokemon}>
                  {tone.toUpperCase()}
                </MenuButton>
              ))}
              <PointedMenuButton tone="blue" pokemon={MENU_POKEMON.unownExclamation}>
                BLUE
              </PointedMenuButton>
              <PointedMenuButton tone="blue" pokemon={MENU_POKEMON.unownQuestion} disabled>
                BLUE
              </PointedMenuButton>
            </div>
          </div>
        </Screen>
      </Section>
      <Section title="Option buttons and panels">
        <Note>Small buttons for a choice among several, after the options screen, and the two boxes for text: Black 2’s and White 2’s.</Note>
        <Screen kind="menu" label="Options">
          <div className="sb-stack sb-pad">
            <div className="sb-row">
              {['slow', 'mid', 'fast'].map((value) => (
                <OptionButton key={value} selected={speed === value} onClick={() => setSpeed(value)}>
                  {value.toUpperCase()}
                </OptionButton>
              ))}
              <OptionButton disabled>OFF</OptionButton>
            </div>
            <Panel>
              <span className="dn-text-shadow">{pack.moves.flamethrower?.description[locale]}</span>
            </Panel>
            <Panel tone="light">{pack.items.leftovers?.description[locale]}</Panel>
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Controls', component: Controls } satisfies Meta<typeof Controls>
export default meta

export const SlotsOptionsPanels: StoryObj<typeof meta> = {}
