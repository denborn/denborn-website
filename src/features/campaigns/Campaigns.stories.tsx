import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { sampleRules } from '../../domain/samples'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { CampaignEditor, type RuleId } from './CampaignEditor'
import { CampaignList } from './CampaignList'
import { ImportCampaign } from './ImportCampaign'
import { RemoveCampaign } from './RemoveCampaign'
import type { IncomingCampaignResult } from './incoming-campaign'

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
        onRemove={() => undefined}
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

function Campaigns() {
  const pack = usePack()
  const kept = (id: string, name: string, version: number, species: number): CampaignDocument => ({
    kind: 'denborn.campaign',
    schemaVersion: 1,
    id,
    revision: version,
    dataPackVersion: pack.version,
    name,
    rulesHistory: [{ ...sampleRules(pack, 2, 2, 4, species), version }],
  })
  const entries = [kept('Hn4wB9cE2yU6sJ5d', 'Les Égarés de Denborn', 3, 151), kept('q8Zr3vX1mK7pL0aT', 'Night Shift', 1, 47)].map((campaign) => ({ id: campaign.id, read: { ok: true as const, value: campaign }, raw: '' }))
  return (
    <Phone>
      <CampaignList entries={[...entries, { id: 'broken', read: { ok: false, reason: 'not-this-kind' }, raw: '' }]} onBack={() => undefined} onNew={() => undefined} onImport={() => undefined} onOpen={() => undefined} />
    </Phone>
  )
}

/** The campaigns a device keeps as their game master: the way in from the home's Campaigns. */
export const List: Story = {
  render: () => (
    <>
      <Campaigns />
      <Note>The list of campaigns, built like the list of characters: a row opens the campaign’s page, NEW starts one.</Note>
    </>
  ),
}

function Importing({ standing }: { standing: 'new' | 'newer' }) {
  const pack = usePack()
  const made = (version: number, species: number, startingLevel: number): CampaignDocument => ({
    kind: 'denborn.campaign',
    schemaVersion: 1,
    id: 'Hn4wB9cE2yU6sJ5d',
    revision: version,
    dataPackVersion: pack.version,
    name: 'Les Égarés de Denborn',
    rulesHistory: [{ ...sampleRules(pack, 2, 2, 4, species), version, startingLevel }],
  })
  const read = (): IncomingCampaignResult => ({ ok: true, campaign: made(3, 151, 20), otherGameData: false, standing, ...(standing === 'newer' ? { kept: made(2, 120, 5) } : {}) })
  return (
    <Phone>
      <ImportCampaign read={read} textOfFile={() => Promise.resolve('a file')} onKeep={() => ({ ok: true })} onOpen={() => undefined} onBack={() => undefined} />
    </Phone>
  )
}

/** Importing and removing a campaign follow the characters' screens (decisions 117 and 118). */
export const ImportAndRemove: Story = {
  render: () => (
    <>
      <Importing standing="new" />
      <Importing standing="newer" />
      <Phone>
        <RemoveCampaign name="Les Égarés de Denborn" onSaveFile={() => undefined} onRemove={() => undefined} onKeep={() => undefined} />
      </Phone>
      <Note>
        A campaign comes in by its file only: choose a file on either of the first two phones to see it read (the first as new here, the
        second as more recent than the copy kept). The third phone is the question asked before a campaign is removed; the way there is
        at the end of a saved campaign’s page.
      </Note>
    </>
  ),
}
