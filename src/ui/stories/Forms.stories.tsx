import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { NumberField, Screen } from '..'
import { Note, Phone, Section, useLocale } from './board'

/** The points a budget of this story leaves to share out: a number's ceiling then comes before the end of its scale. */
const BUDGET = 510
const EV_MAX = 252

function Numbers() {
  const french = useLocale() === 'fr'
  const [seconds, setSeconds] = useState(60)
  const [level, setLevel] = useState(5)
  const [evs, setEvs] = useState({ hp: 252, attack: 6 })
  const left = BUDGET - evs.hp - evs.attack
  const name = (english: string, inFrench: string): string => (french ? inFrench : english)
  return (
    <Phone>
      <Section title="A number to set">
        <Note>
          No slider (decision 251): a minus, the number, a plus, on one row. A tap is one point. Hold a button: after a short wait it goes on,
          by one and then by ten, and stops when let go, at the end of its scale, or when the finger leaves it. Tap the number to type it:
          a phone shows its number pad. With a keyboard, the arrows go by one, Page Up and Page Down by ten, Home and End to the ends. The
          two EVs share a budget, so the plus of one stops before 252 once the other has taken its part.
        </Note>
        <Screen kind="menu" label={name('Numbers', 'Nombres')} scrolls>
          <div className="dn-stack">
            <NumberField label={name('Seconds for each round', 'Secondes par tour')} value={seconds} min={10} max={300} onChange={setSeconds} lowerLabel={name('Fewer seconds', 'Moins de secondes')} raiseLabel={name('More seconds', 'Plus de secondes')} />
            <NumberField label={name('Level', 'Niveau')} value={level} min={1} max={100} onChange={setLevel} lowerLabel={name('Lower the level', 'Baisser le niveau')} raiseLabel={name('Raise the level', 'Monter le niveau')} />
            <NumberField label={name('HP EVs', 'EV de PV')} value={evs.hp} min={0} max={EV_MAX} ceiling={Math.min(EV_MAX, evs.hp + left)} onChange={(hp) => setEvs({ ...evs, hp })} lowerLabel={name('Lower HP EVs', 'Baisser les EV de PV')} raiseLabel={name('Raise HP EVs', 'Monter les EV de PV')} />
            <NumberField
              label={name('Attack EVs, with a name long enough to take two lines', 'EV d’Attaque, avec un nom assez long pour tenir sur deux lignes')}
              value={evs.attack}
              min={0}
              max={EV_MAX}
              ceiling={Math.min(EV_MAX, evs.attack + left)}
              onChange={(attack) => setEvs({ ...evs, attack })}
              lowerLabel={name('Lower Attack EVs', 'Baisser les EV d’Attaque')}
              raiseLabel={name('Raise Attack EVs', 'Monter les EV d’Attaque')}
            />
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/Forms', component: Numbers } satisfies Meta<typeof Numbers>
export default meta

export const NumbersWithoutASlider: StoryObj<typeof meta> = {}
