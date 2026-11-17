import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Screen } from '../Screen'
import { TitleScene } from '../title-scene'
import type { CastMember } from '../wanderers'
import { Note, Phone, Section, usePack } from './board'

/** A character for the board: a species of the data pack under a name a player could give it. */
interface Sample {
  species: string
  name: string
  female?: boolean
  dead?: boolean
}

const FEW: readonly Sample[] = [
  { species: 'pikachu', name: 'Volt' },
  { species: 'bulbasaur', name: 'Mousse' },
  { species: 'charmander', name: 'Braise' },
]

const MANY: readonly Sample[] = [
  ...FEW,
  { species: 'squirtle', name: 'Écume' },
  { species: 'eevee', name: 'Noisette', female: true },
  { species: 'psyduck', name: 'Migraine' },
  { species: 'gastly', name: 'Brume' },
  { species: 'abra', name: 'Sieste' },
]

const LARGE: readonly Sample[] = [
  { species: 'moltres', name: 'Seigneur des Flammes' },
  { species: 'snorlax', name: 'Édredon' },
  { species: 'onix', name: 'Gravier' },
  { species: 'rattata', name: 'Mi' },
]

const WITH_DEAD: readonly Sample[] = [
  ...FEW,
  { species: 'cubone', name: 'Osselet', dead: true },
  { species: 'gengar', name: 'Minuit', dead: true },
]

function useCast(samples: readonly Sample[]): CastMember[] {
  const pack = usePack()
  return samples.flatMap(({ species, name, female = false, dead = false }) => {
    const found = pack.species[species]
    return found ? [{ id: `${species} ${name}`, name, species: found, female, dead }] : []
  })
}

/** The den in the rain with the characters given, as the list of characters shows it on its top screen. */
function Meadow({ samples, still = false, label }: { samples: readonly Sample[]; still?: boolean; label: string }) {
  const cast = useCast(samples)
  return (
    <Screen kind="scene" label={label}>
      <TitleScene intro={false} still={still} lightning={false} cast={cast} />
    </Screen>
  )
}

function Walking() {
  // A new number draws the scene anew: everyone comes in again.
  const [visit, setVisit] = useState(0)
  return (
    <Phone>
      <Note>
        Denborn’s own (decisions 225 to 229), to be judged here: the top screen of the list of characters. The den in the rain, without
        the name or the lightning, and the characters kept on the device walking round it, each under its name. The first one comes in at
        once from a bottom corner, at twice a walk; the others walk in after it, 0.7 s apart, by one corner then the other. Each stops not far from
        where it came in, then walks to a spot, rests 1 to 4 s, and walks again, a pixel of the scene at a time; none sets foot on the
        rocks, and one behind the den passes behind its light. “The come in should feel natural”: they hop as they walk, as a Pokémon’s
        icon does in the games’ menus; one that walks away is seen from behind, and turns to face you when it stops. They are the
        battle sprites, half a pixel of the scene to a pixel of theirs, mirrored to head the other way, and dimmed by the night as the
        rocks are; their names stay bright.
      </Note>
      <div className="sb-tools">
        <button type="button" onClick={() => setVisit(visit + 1)}>
          Come in again
        </button>
      </div>
      <Section title="Three characters">
        <Meadow key={visit} samples={FEW} label="Three characters" />
      </Section>
      <Section title="Eight characters: five at a time, in turns">
        <Note>Never more than five. Every 12 s the one out longest runs off by the nearer bottom corner and the next walks in (decision 227).</Note>
        <Meadow key={visit} samples={MANY} label="Eight characters" />
      </Section>
      <Section title="The largest sprites, a long name, a small one">
        <Note>A name longer than twelve letters or so is cut with an ellipsis. A large Pokémon keeps to where it shows whole, its name included.</Note>
        <Meadow key={visit} samples={LARGE} label="Large sprites" />
      </Section>
    </Phone>
  )
}

function Dead() {
  return (
    <Phone>
      <Note>
        A dead character does not walk (decision 228): it is a ghost in the den’s light, smaller than those who walk. It rises from the
        den’s base under its name, sways from side to side within the light, its rows wavering, with a glow round it in the Ghost type’s
        colour that comes and goes. It does not go with the light: near the top it breaks up by itself, in squares that drift up and are
        gone, and its name breaks up with it. One at a time: the first 2 s after the scene is there, the next 6 to 10 s after the last has
        gone; a rise lasts 6 s. It is drawn by the app on a small sheet of its own pixels, from the sprite’s first frame, and its name on
        another; no 3D library is used. What was read into the owner’s words (the glow’s colour, the timings, one at a time) is to be
        judged here.
      </Note>
      <Section title="Three living, two dead">
        <Meadow samples={WITH_DEAD} label="Three living, two dead" />
      </Section>
      <Section title="The dead alone">
        <Meadow samples={WITH_DEAD.filter((sample) => sample.dead)} label="The dead alone" />
      </Section>
    </Phone>
  )
}

function Widths() {
  return (
    <div className="sb-stack" style={{ justifyItems: 'center' }}>
      <Note>
        A phone shows a little more or less of the meadow, so there is more or less ground to walk on: beside the den, 17 pixels of the
        scene on the narrowest phone. The sprites’ pixels are whole device pixels on each.
      </Note>
      {[320, 412, 480].map((width) => (
        <Section key={width} title={`${width} px`}>
          <div style={{ width }}>
            <Meadow samples={WITH_DEAD} label={`${width} px`} />
          </div>
        </Section>
      ))}
    </div>
  )
}

function Still() {
  return (
    <Phone>
      <Note>
        With reduced motion, or with the Options’ switch for the title screen’s animation off (decision 206), nothing moves: the rain hangs,
        the characters stand round the den, the first to its left, the next to its right and so on, each side filled from behind it to in
        front of it, their sprites held on one frame, and the first of the dead stands in the light, whole.
      </Note>
      <Section title="Five characters, one dead">
        <Meadow samples={[...MANY.slice(0, 5), ...WITH_DEAD.slice(3, 4)]} still label="Standing still" />
      </Section>
      <Section title="The largest sprites">
        <Meadow samples={LARGE} still label="Large sprites, standing still" />
      </Section>
    </Phone>
  )
}

const meta = { title: 'Screens/Characters on the plain' } satisfies Meta
export default meta

export const WalkingRoundTheDen: StoryObj = { render: () => <Walking /> }
export const TheDead: StoryObj = { render: () => <Dead /> }
export const OnEveryPhone: StoryObj = { render: () => <Widths /> }
export const NothingMoves: StoryObj = { render: () => <Still /> }
