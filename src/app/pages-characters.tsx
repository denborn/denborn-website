/**
 * A player's pages for their characters: the list, creation, the sheet,
 * importing and removing. Fetched when one of them is first opened.
 */
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { CharacterList } from '../features/characters/CharacterList'
import { Creation } from '../features/creation/Creation'
import { type CampaignLinkProblem, type CampaignLinkRead, readCampaignLink } from '../features/creation/campaign-link'
import { DEN, DenScreen } from '../features/home/DenScreen'
import { ImportCharacter } from '../features/import/ImportCharacter'
import { type Device, readIncomingCode, readIncomingFile } from '../features/import/incoming'
import { QrCamera } from '../features/scan/QrCamera'
import { CharacterSheet } from '../features/sheet/CharacterSheet'
import { PaperSheet } from '../features/sheet/PaperSheet'
import { RemoveCharacter } from '../features/sheet/RemoveCharacter'
import { SheetUnavailable } from '../features/sheet/SheetUnavailable'
import { sheetToShow } from '../features/sheet/open-sheet'
import { useLanguage, useMessages } from '../i18n'
import type { Invitation } from '../shared/codec/codes'
import type { CharacterDocument } from '../shared/schema/character'
import { saveToDevice, textOfPickedFile } from '../storage/browser'
import { characterFile, storedCharacterFile } from '../storage/files'
import { newId } from '../storage/ids'
import type { WriteResult } from '../storage/library'
import { DualScreen, OptionButton, Panel, Screen, StepHeader } from '../ui'
import { NEW_CAMPAIGN_FOR_CHARACTER } from './campaign-for-character'
import { useLibrary } from './library-store'
import { useShownCharacter } from './shown-character'
import { sessionKeys } from './session-keys'
import { usePageTitle } from './page-title'

export function CharactersPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const shown = useShownCharacter()
  usePageTitle(useMessages().characters.title)
  return (
    <CharacterList
      pack={usePack()}
      entries={library.characters()}
      kept={library.kept}
      shown={shown.id}
      onShow={shown.show}
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
  const show = useShownCharacter((state) => state.show)
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
      // Kept with the rules it was checked under, like a character made here; back on the list, it is the one shown.
      onKeep={(incoming) => {
        const saved = library.saveCharacter({ ...incoming.character, rules: incoming.rules })
        if (saved.ok) show(incoming.character.id)
        return saved
      }}
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

export function CreateCharacterPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const show = useShownCharacter((state) => state.show)
  const messages = useMessages()
  const { campaignId } = useParams()
  const [unsaved, setUnsaved] = useState<{ character: CharacterDocument; reason: Extract<WriteResult, { ok: false }>['reason'] }>()
  // A campaign read here that the device could not keep: creation goes on with it all the same, for as long as the page is open.
  const [lent, setLent] = useState<Invitation>()
  usePageTitle(messages.creation.title)
  // Reading them inflates every code kept: done again only when the device has written something.
  const kept = useMemo(() => library.invitations(pack.species), [library, pack])
  const invitations = lent && !kept.some((one) => one.campaign.id === lent.campaign.id) ? [...kept, lent] : kept
  const invitation = invitations.find((entry) => entry.campaign.id === campaignId)
  // `session`: creation was started from a session's join screen (decision 128), and this is the code of the session to come back
  // to. `problem`: a link opened from outside could not be read, and this is why.
  const arrival = useLocation().state as { session?: string; problem?: CampaignLinkProblem } | null
  const session = arrival?.session

  // The device could not keep the new character: its file is offered before anything else.
  if (unsaved && invitation) {
    return (
      <DualScreen>
        <DenScreen key={DEN} label={messages.creation.title} />
        <Screen kind="menu" label={messages.creation.title} scrolls>
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
      </DualScreen>
    )
  }

  const keep = (character: CharacterDocument): void => {
    if (!invitation) return
    // Kept with the rules it was made under, like its file: the entry alone is enough to check it later.
    const saved = library.saveCharacter({ ...character, rules: invitation.rules })
    if (!saved.ok) {
      setUnsaved({ character, reason: saved.reason })
      return
    }
    if (session === undefined) {
      // Back on the list, the one just made is the one shown.
      show(character.id)
      void navigate('/characters')
      return
    }
    // Made from a session's join screen: it is the character brought, and the session is where the player goes back to.
    sessionKeys.bring(session, character.id)
    void navigate(`/session/${session}`, { replace: true })
  }

  /** Reads a pasted or scanned text; the campaign it names is kept here, like one whose link was opened from outside. */
  const read = (text: string): CampaignLinkRead => {
    const result = readCampaignLink(text, pack.species)
    if (result.ok) {
      library.saveInvitation(result.invitation, pack.species)
      setLent(result.invitation)
    }
    return result
  }

  return (
    <Creation
      pack={pack}
      invitations={invitations}
      campaignId={campaignId}
      campaignLocked={session !== undefined}
      arrivedWith={arrival?.problem}
      newId={newId}
      camera={(props) => <QrCamera {...props} />}
      onLink={read}
      // The session a creation was started from goes with it from step to step.
      onCampaign={(id) => void navigate(id === undefined ? '/characters/new' : `/characters/new/${id}`, { state: session === undefined ? null : { session } })}
      // The new campaign's page brings the player back here once it is saved (decision 299).
      onNewCampaign={() => void navigate(NEW_CAMPAIGN_FOR_CHARACTER)}
      // Leaving before the character is made goes back where creation was started from.
      onLeave={() => void navigate(session === undefined ? '/characters' : `/session/${session}`)}
      onCreate={keep}
    />
  )
}
