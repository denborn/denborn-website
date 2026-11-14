import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_CAMPAIGN, sampleRules } from '../../domain/samples'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { CreationFlow } from './CreationFlow'

interface Args {
  /** Whether players choose a nature, or every Pokémon is neutral: the campaign's ruling. */
  natures: 'chosen' | 'neutral'
  startingLevel: number
}

function Creation({ natures, startingLevel }: Args) {
  const pack = usePack()
  const rules = { ...sampleRules(pack, 3, 2, 5), natures, startingLevel }
  return (
    <Phone>
      <CreationFlow invitation={{ campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules }} pack={pack} onLeave={() => undefined} />
      <Note>
        The first two of seven steps: the Pokémon, then its name, gender, nature and Ability. The real game data and the real limits are
        behind it: NEXT stays off until a step has what it needs. To come: roleplay attributes, IVs and EVs, moves, item pack, then a
        last look before the character is made. The controls below change the campaign’s rulings.
      </Note>
    </Phone>
  )
}

const meta = {
  title: 'Screens/Character creation',
  component: Creation,
  args: { natures: 'chosen', startingLevel: 5 },
  argTypes: { natures: { control: 'inline-radio', options: ['chosen', 'neutral'] }, startingLevel: { control: { type: 'range', min: 1, max: 100 } } },
} satisfies Meta<typeof Creation>
export default meta

export const SpeciesAndIdentity: StoryObj<typeof meta> = {}
