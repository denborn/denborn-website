import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { sampleRules } from '../../domain/samples'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { CampaignEditor, type RuleId } from './CampaignEditor'

interface Args {
  /** A campaign already saved, or one being set for the first time. */
  saved: boolean
}

function Editor({ saved }: Args) {
  const pack = usePack()
  const [rule, setRule] = useState<RuleId>()
  const [campaign, setCampaign] = useState<CampaignDocument | undefined>(() =>
    saved
      ? { kind: 'denborn.campaign', schemaVersion: 1, id: 'Hn4wB9cE2yU6sJ5d', revision: 2, dataPackVersion: pack.version, name: 'Les Égarés de Denborn', rulesHistory: [{ ...sampleRules(pack, 2, 2, 4), version: 1 }] }
      : undefined,
  )
  return (
    <Phone>
      <CampaignEditor
        pack={pack}
        campaign={campaign}
        rule={rule}
        onRule={setRule}
        newId={() => 'Hn4wB9cE2yU6sJ5d'}
        onSave={(made) => {
          setCampaign(made)
          return { ok: true }
        }}
        origin="https://denborn-website.kori-san.workers.dev"
        onCopy={() => Promise.resolve(true)}
        onSaveFile={() => undefined}
        onBack={() => undefined}
      />
    </Phone>
  )
}

const meta = {
  title: 'Screens/Campaign rules',
  component: Editor,
  args: { saved: false },
} satisfies Meta<typeof Editor>
export default meta
type Story = StoryObj<typeof meta>

/** A campaign being set for the first time. */
export const NewCampaign: Story = {
  render: (args) => (
    <>
      <Editor {...args} />
      <Note>
        A campaign’s page (decision 113): one row per rule. A tap on a row opens that rule alone, and DONE comes back here. Natures and
        moves have no default and say TO CHOOSE; an item pack is TO ADD; the starting level and Pokédollars show 5 and 3000 (decision 114).
        SAVE THE RULES lights up once nothing is left to choose. Open Pokémon to try the filters of decision 112.
      </Note>
    </>
  ),
}

/** A campaign already saved: its creation link and QR code stand under its rules. */
export const SavedCampaign: Story = {
  args: { saved: true },
  render: (args) => (
    <>
      <Editor {...args} />
      <Note>
        A saved campaign. Under its rules: the creation link as a QR code and as text, a button to copy it, and the campaign’s file. Change
        a rule and the link gives way to “Changes not saved yet” until the rules are saved again, which makes the next version.
      </Note>
    </>
  ),
}
