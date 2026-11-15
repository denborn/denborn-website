/**
 * The app's pages: each one ties a screen (src/features) to the address bar
 * and to what the device keeps. The screens themselves know neither.
 */
import { useState } from 'react'
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { CampaignEditor, RULE_IDS, type RuleId } from '../features/campaigns/CampaignEditor'
import { CampaignList } from '../features/campaigns/CampaignList'
import { CharacterList } from '../features/characters/CharacterList'
import { type LinkProblem, NewCharacter } from '../features/characters/NewCharacter'
import { CreationFlow } from '../features/creation/CreationFlow'
import { Home } from '../features/home/Home'
import { ImportCharacter } from '../features/import/ImportCharacter'
import { QrCamera } from '../features/import/QrCamera'
import { type Device, readIncomingCode, readIncomingFile } from '../features/import/incoming'
import { Options } from '../features/options/Options'
import { CharacterSheet } from '../features/sheet/CharacterSheet'
import { PaperSheet } from '../features/sheet/PaperSheet'
import { RemoveCharacter } from '../features/sheet/RemoveCharacter'
import { SheetUnavailable } from '../features/sheet/SheetUnavailable'
import { sheetToShow } from '../features/sheet/open-sheet'
import { useLanguage, useMessages } from '../i18n'
import { decodeCreationCode } from '../shared/codec/codes'
import type { CharacterDocument } from '../shared/schema/character'
import { saveToDevice, textOfPickedFile } from '../storage/browser'
import { campaignFile, characterFile, storedCharacterFile } from '../storage/files'
import { newId } from '../storage/ids'
import type { WriteResult } from '../storage/library'
import { OptionButton, Panel, Screen, StepHeader } from '../ui'
import { copyText } from './clipboard'
import { useLibrary } from './library-store'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'

export function HomePage() {
  const navigate = useNavigate()
  usePageTitle(undefined)
  return <Home pack={usePack()} entries={['characters', 'campaigns', 'options']} onOpen={(entry) => void navigate(`/${entry}`)} />
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  usePageTitle(useMessages().campaigns.title)
  return <CampaignList entries={library.campaigns()} onBack={() => void navigate('/')} onNew={() => void navigate('/campaigns/new')} onOpen={(id) => void navigate(`/campaigns/${id}`)} />
}

const isRule = (value: string | null): value is RuleId => RULE_IDS.some((id) => id === value)

/** A campaign's page: a new campaign at /campaigns/new, a kept one at /campaigns/<id>. The rule that is open is in the address, so that Back closes it. */
export function CampaignPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const { id } = useParams()
  const [search, setSearch] = useSearchParams()
  const [unsaved, setUnsaved] = useState(false)
  // Leaving the page with changes not saved asks first. Moving a campaign just saved to its own address is not leaving.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname && !(nextLocation.state as { justSaved?: true } | null)?.justSaved,
  )
  // Closing the tab or reloading with changes not saved asks too, in the browser's own words.
  useBeforeUnload((event) => {
    if (unsaved) event.preventDefault()
  })
  const entry = id === undefined ? undefined : library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  const asked = search.get('rule')
  usePageTitle(campaign?.name ?? messages.campaigns.newTitle)

  if (id !== undefined && !campaign) {
    return (
      <div className="dn-page">
        <Screen kind="menu" label={messages.campaigns.title} tall>
          <StepHeader title={messages.campaigns.title} />
          <div className="dn-stack">
            <p className="dn-note dn-note--error">{entry ? messages.campaigns.unreadable : messages.campaigns.missing}</p>
          </div>
          <div className="dn-foot">
            <OptionButton onClick={() => void navigate('/campaigns')}>{messages.nav.back}</OptionButton>
          </div>
        </Screen>
      </div>
    )
  }

  return (
    <CampaignEditor
      // Another campaign is another page: its rules being set are not carried over.
      key={id ?? 'new'}
      pack={pack}
      campaign={campaign}
      rule={isRule(asked) ? asked : undefined}
      onRule={(rule) => {
        if (rule) setSearch({ rule })
        // Closing a rule goes back to the page it was opened from, when there is one in this visit's history.
        else if (location.key !== 'default') void navigate(-1)
        else setSearch({}, { replace: true })
      }}
      newId={newId}
      onSave={(made) => {
        const kept = library.saveCampaign(made)
        if (kept.ok && id === undefined) void navigate(`/campaigns/${made.id}`, { replace: true, state: { justSaved: true } })
        return kept
      }}
      origin={window.location.origin}
      onCopy={copyText}
      onSaveFile={(kept) => saveToDevice(campaignFile(kept))}
      onBack={() => void navigate('/campaigns')}
      onUnsaved={setUnsaved}
      leaving={blocker.state === 'blocked' ? { stay: () => blocker.reset(), leave: () => blocker.proceed() } : undefined}
    />
  )
}

export function OptionsPage() {
  const navigate = useNavigate()
  usePageTitle(useMessages().options.title)
  return <Options offline={useOffline()} onBack={() => void navigate('/')} />
}

export function CharactersPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  usePageTitle(useMessages().characters.title)
  return (
    <CharacterList
      pack={usePack()}
      entries={library.characters()}
      kept={library.kept}
      onBack={() => void navigate('/')}
      onNew={() => void navigate('/characters/new')}
      onImport={() => void navigate('/characters/import')}
      onOpen={(id) => void navigate(`/characters/${id}`)}
    />
  )
}

export function ImportCharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const location = useLocation()
  // A character's link opened from outside the app sends the visitor here with its code.
  const arrivedWith = (location.state as { code?: string } | null)?.code
  usePageTitle(useMessages().import.title)
  const device: Device = {
    pack,
    kept: library.characters(),
    rulesOf: (campaign) => library.rulesOf(campaign.id, campaign.rulesVersion, pack.species),
  }
  return (
    <ImportCharacter
      // Each arrival starts the screen over, so that a second link opened while it is up is read too.
      key={location.key}
      pack={pack}
      arrivedWith={arrivedWith}
      readFile={(text) => readIncomingFile(text, device)}
      readCode={(text) => readIncomingCode(text, device)}
      textOfFile={textOfPickedFile}
      camera={(props) => <QrCamera {...props} />}
      // Kept with the rules it was checked under, like a character made here.
      onKeep={(incoming) => library.saveCharacter({ ...incoming.character, rules: incoming.rules })}
      onOpen={(id) => void navigate(`/characters/${id}`)}
      onBack={() => void navigate('/characters')}
    />
  )
}

export function CharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const language = useLanguage()
  const { id } = useParams()
  const entry = library.characters().find((stored) => stored.id === id)
  const shown = sheetToShow(entry, (campaign) => library.rulesOf(campaign.id, campaign.rulesVersion, pack.species), pack)
  usePageTitle(shown.show === 'sheet' ? shown.character.nickname : messages.sheet.title)
  const back = (): void => void navigate('/characters')

  const remove = (): void => void navigate(`/characters/${id ?? ''}/remove`)

  if (shown.show === 'problem') {
    // Whatever is kept under that id can still leave as a file, exactly as it is stored, and can be removed.
    return (
      <SheetUnavailable
        problem={shown.problem}
        onBack={back}
        onSaveFile={entry ? () => saveToDevice(storedCharacterFile(entry)) : undefined}
        onRemove={entry ? remove : undefined}
      />
    )
  }
  const origin = window.location.origin
  return (
    <>
      <CharacterSheet
        pack={pack}
        character={shown.character}
        numbers={shown.numbers}
        origin={origin}
        notice={shown.otherGameData ? messages.sheet.otherData : undefined}
        onBack={back}
        onSaveFile={() => saveToDevice(characterFile(shown.character, shown.rules))}
        onPrint={() => window.print()}
        onRemove={remove}
      />
      {/* Out of sight on screen; in print it takes the place of the screens. */}
      <PaperSheet pack={pack} character={shown.character} numbers={shown.numbers} language={language} messages={messages} origin={origin} />
    </>
  )
}

export function RemoveCharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const language = useLanguage()
  const { id } = useParams()
  const entry = library.characters().find((stored) => stored.id === id)
  const shown = sheetToShow(entry, (campaign) => library.rulesOf(campaign.id, campaign.rulesVersion, pack.species), pack)
  const sheet = shown.show === 'sheet' ? shown : undefined
  usePageTitle(sheet ? messages.sheet.removal.title(sheet.character.nickname) : messages.sheet.removal.titleUnreadable)

  if (!entry) return <SheetUnavailable problem="missing" onBack={() => void navigate('/characters')} />
  return (
    <RemoveCharacter
      shown={sheet && { pack, character: sheet.character, numbers: sheet.numbers, language, messages }}
      // The file with its rules when the character passes its checks; otherwise what is kept, exactly as it is stored.
      onSaveFile={() => saveToDevice(sheet ? characterFile(sheet.character, sheet.rules) : storedCharacterFile(entry))}
      onRemove={() => {
        library.removeCharacter(entry.id)
        // The list takes this page's place: going back does not return to a question already answered.
        void navigate('/characters', { replace: true })
      }}
      onKeep={() => void navigate(`/characters/${entry.id}`)}
    />
  )
}

export function NewCharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  // A link opened from outside that could not be read sends the visitor here with the reason.
  const arrivedWith = (useLocation().state as { problem?: LinkProblem } | null)?.problem
  usePageTitle(useMessages().newCharacter.title)

  const open = (text: string): LinkProblem | undefined => {
    const decoded = decodeCreationCode(text, pack.species)
    if (!decoded.ok) return decoded.reason
    library.saveInvitation(decoded.value, pack.species)
    void navigate(`/characters/new/${decoded.value.campaign.id}`, { state: { invitation: decoded.value } })
    return undefined
  }

  return (
    <NewCharacter
      invitations={library.invitations(pack.species)}
      problem={arrivedWith}
      onBack={() => void navigate('/characters')}
      onCampaign={(campaignId) => void navigate(`/characters/new/${campaignId}`)}
      onLink={open}
    />
  )
}

export function CreateCharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const { campaignId } = useParams()
  const [unsaved, setUnsaved] = useState<{ character: CharacterDocument; reason: Extract<WriteResult, { ok: false }>['reason'] }>()
  usePageTitle(messages.creation.title)
  const invitation = library.invitations(pack.species).find((entry) => entry.campaign.id === campaignId)

  if (!invitation) {
    return (
      <div className="dn-page">
        <Screen kind="menu" label={messages.creation.title} tall>
          <StepHeader title={messages.creation.title} />
          <div className="dn-stack">
            <p className="dn-note dn-note--error">{messages.newCharacter.unknownCampaign}</p>
          </div>
          <div className="dn-foot">
            <OptionButton onClick={() => void navigate('/characters/new')}>{messages.nav.back}</OptionButton>
          </div>
        </Screen>
      </div>
    )
  }

  // The device could not keep the new character: its file is offered before anything else.
  if (unsaved) {
    return (
      <div className="dn-page">
        <Screen kind="menu" label={messages.creation.title} tall>
          <StepHeader title={messages.creation.review.created(unsaved.character.nickname)} />
          <div className="dn-stack">
            <Panel>
              <p className="dn-note dn-note--error" role="alert">
                {messages.saving[unsaved.reason]} {messages.saving.file}
              </p>
            </Panel>
            <div className="dn-row">
              <OptionButton primary onClick={() => saveToDevice(characterFile(unsaved.character, invitation.rules))}>
                {messages.saving.saveFile}
              </OptionButton>
            </div>
          </div>
          <div className="dn-foot">
            <OptionButton onClick={() => void navigate('/characters')}>{messages.saving.carryOn}</OptionButton>
          </div>
        </Screen>
      </div>
    )
  }

  const keep = (character: CharacterDocument): void => {
    // Kept with the rules it was made under, like its file: the entry alone is enough to check it later.
    const saved = library.saveCharacter({ ...character, rules: invitation.rules })
    if (saved.ok) void navigate('/characters')
    else setUnsaved({ character, reason: saved.reason })
  }

  return <CreationFlow invitation={invitation} pack={pack} newId={newId} onLeave={() => void navigate('/characters/new')} onCreate={keep} />
}
