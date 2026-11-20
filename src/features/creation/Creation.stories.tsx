import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SAMPLE_CAMPAIGN, sampleRules } from '../../domain/samples'
import { type Invitation, encodeCharacterCode, encodeCreationCode, qrForm } from '../../shared/codec/codes'
import type { CharacterDocument } from '../../shared/schema/character'
import { newId } from '../../storage/ids'
import { STEP_ICONS, itemSheetIcon } from '../../data/sprites'
import { DualScreen, DualScreenFrame, ItemIconImage, QrCode, Screen } from '../../ui'
import { DexKey, Tray } from '../../ui/dex'
import { Device, Note, Phone, Section, useLocale, usePack } from '../../ui/stories/board'
import { Account } from '../account/Account'
import { en } from '../../i18n/en'
import { fr } from '../../i18n/fr'
import { Creation } from './Creation'
import { MovePicker } from './MovePicker'
import { RecapScreen } from './RecapScreen'
import { readCampaignLink } from './campaign-link'
import { FLOW_STEPS } from './flow'
import type { Recap } from './recap'

interface Args {
  /** Whether players choose a nature, or every Pokémon is neutral: the campaign's ruling. */
  natures: 'chosen' | 'neutral'
  /** Level-up moves only, or TM, tutor and egg moves as well. */
  moveAccess: 'level-up' | 'level-up-tm-tutor-egg'
  startingLevel: number
  /** The window the DS is in. */
  width: number
}

/** A second campaign, to bring to the board by its link: paste it in LINK. */
const OTHER_CAMPAIGN = { id: 'Kd7mT2xQ9bL4wR8z', name: 'Night Shift' }

function CreationStory({ natures, moveAccess, startingLevel, width }: Args) {
  const pack = usePack()
  const [made, setMade] = useState<CharacterDocument>()
  const rules = { ...sampleRules(pack, 3, 4, 6), natures, moveAccess, startingLevel }
  const own: Invitation = { campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules }
  const other: Invitation = { campaign: OTHER_CAMPAIGN, dataPackVersion: pack.version, rules: { ...rules, startingLevel: 30 } }
  const [brought, setBrought] = useState<Invitation[]>([])
  const [campaignId, setCampaignId] = useState<string>()
  // In the app, + New opens the new campaign's page; here a screen of the den stands for it, with its way back.
  const [away, setAway] = useState(false)
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
        <Device width={width} height={Math.round(width * 1.5) + 40}>
          <DualScreenFrame route={away ? 'account' : 'creation'} depth={away ? 1 : 0}>
            {away ? (
              <Account onBack={() => setAway(false)} />
            ) : (
              <Creation
                pack={pack}
                invitations={[own, ...brought]}
                campaignId={campaignId}
                campaignLocked={false}
                newId={newId}
                onLink={(text) => {
                  const read = readCampaignLink(text, pack.species)
                  if (read.ok) setBrought((before) => [...before.filter((one) => one.campaign.id !== read.invitation.campaign.id), read.invitation])
                  return read
                }}
                onCampaign={setCampaignId}
                onNewCampaign={() => setAway(true)}
                onLeave={() => setCampaignId(undefined)}
                onCreate={setMade}
              />
            )}
          </DualScreenFrame>
        </Device>
      )}
      <Note>
        Creation in a Pokédex (decisions 287 to 309), in the app’s own frame, with the real game data and the real limits behind it. The top
        screen fills itself as choices are made; the bar across the bottom screen goes to any step that is open; nothing scrolls. CREATE on
        + New leaves for the new campaign’s page, and comes back once it is saved (decision 299); here a screen of the den stands for that
        page. A second campaign comes by its link, pasted in LINK:
      </Note>
      <Note>
        <code style={{ wordBreak: 'break-all' }}>{encodeCreationCode(other, pack.species)}</code>
      </Note>
    </Phone>
  )
}

const meta = {
  title: 'Screens/Character creation',
  component: CreationStory,
  args: { natures: 'chosen', moveAccess: 'level-up', startingLevel: 5, width: 412 },
  argTypes: {
    natures: { control: 'inline-radio', options: ['chosen', 'neutral'] },
    moveAccess: { control: 'inline-radio', options: ['level-up', 'level-up-tm-tutor-egg'] },
    startingLevel: { control: { type: 'range', min: 1, max: 100 } },
    width: { control: 'inline-radio', options: [320, 412, 480] },
  },
} satisfies Meta<typeof CreationStory>
export default meta

export const InAPokedex: StoryObj<typeof meta> = { name: 'In a Pokédex' }

/** The Pokédex and a screen of the den, in the app's own frame, to go between as the app does. */
function Opening({ width }: Args) {
  const pack = usePack()
  const [open, setOpen] = useState(false)
  const [campaignId, setCampaignId] = useState<string>()
  const own: Invitation = { campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules: sampleRules(pack, 3, 4, 6) }
  return (
    <Phone>
      <Note>
        Into the Pokédex and out of it (decision 287). In place of the stripes, the Pokédex comes: shut, it rises onto the bottom screen; its
        lid rises onto the top one; then its two shutters part on both. Going out, by the arrow at the start of the bar of steps, the shutters
        close and the Pokédex goes back down. With reduced motion a screen is replaced at once. Denborn’s own, to be judged here.
      </Note>
      <div className="sb-tools">
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Shut the Pokédex' : 'Open the Pokédex'}
        </button>
      </div>
      <Device width={width} height={Math.round(width * 1.5) + 40}>
        <DualScreenFrame route={open ? 'creation' : 'account'} depth={open ? 1 : 0}>
          {open ? (
            <Creation
              pack={pack}
              invitations={[own]}
              campaignId={campaignId}
              campaignLocked={false}
              newId={newId}
              onLink={(text) => readCampaignLink(text, pack.species)}
              onCampaign={setCampaignId}
              onNewCampaign={() => setOpen(false)}
              onLeave={() => setOpen(false)}
              onCreate={() => setOpen(false)}
            />
          ) : (
            <Account onBack={() => setOpen(true)} />
          )}
        </DualScreenFrame>
      </Device>
    </Phone>
  )
}

export const OpeningThePokedex: StoryObj<typeof meta> = { name: 'Opening the Pokédex', render: (args) => <Opening {...args} /> }

/**
 * A second item of Showdown's sheet for each step's icon, to set beside the one the app uses: the Weakness Policy, a
 * Premier Ball, the Spell Tag, the Metronome, the Power Weight, the Dubious Disc, the Big Nugget and the Zoom Lens.
 */
const OTHER_ICONS: Record<(typeof FLOW_STEPS)[number], number> = { campaign: 609, species: 363, identity: 461, combat: 132, training: 360, moves: 113, items: 27, review: 574 }

/** The top screen with the longest of everything the game data has: what must still fit. */
function Longest() {
  const pack = usePack()
  const locale = useLocale()
  const messages = locale === 'fr' ? fr : en
  const longest = <Thing extends { name: Record<'en' | 'fr', string> }>(things: Thing[]): Thing | undefined => [...things].sort((a, b) => b.name[locale].length - a.name[locale].length)[0]
  const species = longest(Object.values(pack.species))
  const ability = longest(Object.values(pack.abilities))
  const item = longest(Object.values(pack.items).filter((one) => one.holdable))
  const nature = longest(Object.values(pack.natures).filter((one) => one.plus !== undefined))
  const full = { hp: 714, atk: 669, def: 614, spa: 535, spd: 614, spe: 504 }
  const recap: Recap = {
    campaign: 'Les Égarés de Denborn, saison des pluies, table du jeudi',
    level: 100,
    exp: 1_000_000,
    species,
    nickname: 'Wwwwwwwwwwwwwwwwwwwwwwww',
    gender: 'F',
    ability: ability?.id,
    nature,
    neutral: false,
    held: { item: item?.id },
    attributes: { strength: 95, dexterity: 75, endurance: 75, perception: 5, charisma: 50, intelligence: 99 },
    profile: species && { base: species.baseStats, trained: { hp: 255, atk: 180, def: 140, spa: 90, spd: 200, spe: 60 }, stats: full },
  }
  const empty: Recap = { campaign: undefined, level: undefined, exp: undefined, species: undefined, nickname: '', gender: undefined, ability: undefined, nature: undefined, neutral: false, held: undefined, attributes: undefined, profile: undefined }
  return (
    <Phone>
      <Section title="The top screen, with the longest of everything">
        <Note>
          Decision 288, in both languages: a name of 24 wide letters and a long campaign go by; the longest species, Ability, held item and nature
          of the game data; stats of three figures at every corner of the graph. Under it, the same screen with nothing known yet.
        </Note>
        <DualScreen>
          <Screen kind="dex" label="The longest">
            <RecapScreen pack={pack} recap={recap} language={locale} messages={messages} />
          </Screen>
          <Screen kind="dex" label="Nothing known">
            <RecapScreen pack={pack} recap={empty} language={locale} messages={messages} />
          </Screen>
        </DualScreen>
      </Section>
    </Phone>
  )
}

/** What is still the owner's to rule, side by side. */
function ToDecide() {
  const names = en.creation.dex.stepNames
  return (
    <Phone>
      <Section title="The steps' icons">
        <Note>
          Decision 289 asks for an icon a step. Each is an item of Showdown's sheet, already in the app. The first of each pair is the one in
          the bar today; the second is another that could stand for the step.
        </Note>
        <Screen kind="dex" label="Icons">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'calc(4 * var(--dn-u))', padding: 'calc(6 * var(--dn-u))' }}>
            {FLOW_STEPS.map((step) => (
              <div key={step} style={{ display: 'grid', justifyItems: 'center', gap: 'calc(3 * var(--dn-u))', padding: 'calc(4 * var(--dn-u))', background: 'var(--dn-dex-chrome)' }}>
                <span style={{ display: 'flex', gap: 'calc(6 * var(--dn-u))' }}>
                  <ItemIconImage icon={itemSheetIcon(STEP_ICONS[step])} />
                  <ItemIconImage icon={itemSheetIcon(OTHER_ICONS[step])} />
                </span>
                <span style={{ fontSize: 'calc(7 * var(--dn-t))', lineHeight: 1.1, textAlign: 'center' }}>{names[step]}</span>
              </div>
            ))}
          </div>
        </Screen>
      </Section>
      <Section title="“Analog”: a veil of scanlines">
        <Note>
          The owner asked for a “bluish analog” Pokédex. The app has the flat grid of the games, with a Pokédex that opens, flaps that turn and
          lamps. A veil of scanlines over each screen, one line of the device in every three, would make it read as an old screen; it is drawn
          here on the second screen only, to compare. It is not in the app.
        </Note>
        <DualScreen>
          <Screen kind="dex" label="Flat">
            <div style={{ position: 'absolute', left: 'calc(77 * var(--dn-u))', top: 'calc(50 * var(--dn-u))', width: 'calc(102 * var(--dn-u))' }}>
              <span className="dn-dex-bar dn-dex-bar--lit" style={{ height: 'calc(22 * var(--dn-u))' }}>
                <span className="dn-dex-bar__name">As in the app</span>
              </span>
            </div>
          </Screen>
          <Screen kind="dex" label="Veiled">
            <div style={{ position: 'absolute', left: 'calc(77 * var(--dn-u))', top: 'calc(50 * var(--dn-u))', width: 'calc(102 * var(--dn-u))' }}>
              <span className="dn-dex-bar dn-dex-bar--lit" style={{ height: 'calc(22 * var(--dn-u))' }}>
                <span className="dn-dex-bar__name">With the veil</span>
              </span>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgb(0 0 0 / 0.16) 1px, transparent 0)', backgroundSize: '100% 3px' }} />
          </Screen>
        </DualScreen>
      </Section>
    </Phone>
  )
}

/** The one place a move is chosen (decision 308), with the keys of each of its two uses. */
function Pickers() {
  const pack = usePack()
  const locale = useLocale()
  const messages = locale === 'fr' ? fr : en
  const moves = sampleRules(pack, 3, 4, 6).species.flatMap((id) => pack.species[id]?.learnset.map((entry) => entry.move) ?? [])
  const offered = [...new Set(moves)].filter((id) => id in pack.moves)
  const [chosen, setChosen] = useState<string>()
  const [kept, setKept] = useState<string[]>([])
  const toggle = (id: string): void => setKept(kept.includes(id) ? kept.filter((one) => one !== id) : [...kept, id].slice(0, 6))
  return (
    <Phone>
      <Section title="One move picker, two uses">
        <Note>
          Decision 308: a move is chosen in one place, the same wherever it is: the bar that narrows the wheel, the wheel, what the move in the
          middle is and does. Only the keys beside it differ. Above, a place of the Moves step (OK; the cross on the place takes a move off,
          decision 309); below, the filter of the Pokémon by the moves they can choose (+ or −, NONE, OK).
        </Note>
        <DualScreen>
          <Screen kind="dex" label="A place of the Moves step">
            <Tray open title={messages.creation.dex.moves.pick} closeLabel={messages.creation.dex.close} onClose={() => undefined}>
              <MovePicker
                pack={pack}
                language={locale}
                messages={messages}
                label={messages.creation.dex.moves.list}
                moves={offered}
                start={chosen}
                isMarked={(id) => id === chosen}
                still={false}
                onPress={setChosen}
                keys={(id) => (
                  <DexKey shape="go" disabled={id === undefined} onClick={() => setChosen(id)}>
                    {messages.creation.dex.ok}
                  </DexKey>
                )}
              />
            </Tray>
          </Screen>
          <Screen kind="dex" label="The filter by moves">
            <Tray open title={messages.creation.dex.species.movesOf(kept.length, 6)} closeLabel={messages.creation.dex.close} onClose={() => undefined}>
              <MovePicker
                pack={pack}
                language={locale}
                messages={messages}
                label={messages.creation.dex.species.move}
                moves={offered}
                start={kept[0]}
                isMarked={(id) => kept.includes(id)}
                still={false}
                onPress={toggle}
                keys={(id) => (
                  <>
                    <span className="dn-dex-filter-wheel__pair">
                      <DexKey shape="square" disabled={id === undefined} onClick={() => id !== undefined && toggle(id)}>
                        {id !== undefined && kept.includes(id) ? '−' : '+'}
                      </DexKey>
                      <DexKey shape="square" disabled={kept.length === 0} onClick={() => setKept([])}>
                        {messages.creation.dex.species.noMoves}
                      </DexKey>
                    </span>
                    <DexKey shape="go" onClick={() => undefined}>
                      {messages.creation.dex.ok}
                    </DexKey>
                  </>
                )}
              />
            </Tray>
          </Screen>
        </DualScreen>
      </Section>
    </Phone>
  )
}

export const MovePickers: StoryObj<typeof meta> = { name: 'One move picker, two uses', render: () => <Pickers /> }
export const TheLongest: StoryObj<typeof meta> = { name: 'The top screen, the longest of everything', render: () => <Longest /> }
export const Rulings: StoryObj<typeof meta> = { name: 'To decide: icons, and the veil', render: () => <ToDecide /> }
