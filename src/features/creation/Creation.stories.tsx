import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SAMPLE_CAMPAIGN, sampleRules } from '../../domain/samples'
import { encodeCharacterCode, qrForm } from '../../shared/codec/codes'
import type { CharacterDocument } from '../../shared/schema/character'
import { newId } from '../../storage/ids'
import { QrCode } from '../../ui'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { CreationFlow } from './CreationFlow'

interface Args {
  /** Whether players choose a nature, or every Pokémon is neutral: the campaign's ruling. */
  natures: 'chosen' | 'neutral'
  /** Level-up moves only, or TM, tutor and egg moves as well. */
  moveAccess: 'level-up' | 'level-up-tm-tutor-egg'
  startingLevel: number
}

function Creation({ natures, moveAccess, startingLevel }: Args) {
  const pack = usePack()
  const [made, setMade] = useState<CharacterDocument>()
  const rules = { ...sampleRules(pack, 3, 2, 5), natures, moveAccess, startingLevel }
  return (
    <Phone>
      {made ? (
        <>
          <Note>
            <strong>{made.nickname}</strong> was made and passed every rule of creation. In the app it is saved and its sheet opens; here is
            its QR code, which carries the whole character.
          </Note>
          <QrCode text={qrForm(encodeCharacterCode(made), 'https://denborn-website.kori-san.workers.dev')} label={made.nickname} tooLong="—" />
        </>
      ) : (
        <CreationFlow invitation={{ campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules }} pack={pack} newId={newId} onLeave={() => undefined} onCreate={setMade} />
      )}
      <Note>
        The seven steps, with the real game data and the real limits behind them: a step lets you go on only when it has what it needs,
        and a choice the rules forbid does not take. The controls below change the campaign’s rulings; try a starting level of 1, then
        of 50.
      </Note>
    </Phone>
  )
}

const meta = {
  title: 'Screens/Character creation',
  component: Creation,
  args: { natures: 'chosen', moveAccess: 'level-up', startingLevel: 5 },
  argTypes: {
    natures: { control: 'inline-radio', options: ['chosen', 'neutral'] },
    moveAccess: { control: 'inline-radio', options: ['level-up', 'level-up-tm-tutor-egg'] },
    startingLevel: { control: { type: 'range', min: 1, max: 100 } },
  },
} satisfies Meta<typeof Creation>
export default meta

export const SevenSteps: StoryObj<typeof meta> = {}
