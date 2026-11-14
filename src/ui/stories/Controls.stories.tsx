import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { OptionButton, Panel, PokemonIcon, Screen, Slot } from '..'
import { Note, Phone, Section, useLocale, usePack } from './board'

const PARTY = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'] as const

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
