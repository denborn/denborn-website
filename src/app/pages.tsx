/**
 * The app's pages: each one ties a screen (src/features) to the address bar
 * and to what the device keeps. The screens themselves know neither.
 */
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { CharacterList } from '../features/characters/CharacterList'
import { type LinkProblem, NewCharacter } from '../features/characters/NewCharacter'
import { CreationFlow } from '../features/creation/CreationFlow'
import { Home } from '../features/home/Home'
import { Options } from '../features/options/Options'
import { CharacterSheet } from '../features/sheet/CharacterSheet'
import { PaperSheet } from '../features/sheet/PaperSheet'
import { SheetUnavailable } from '../features/sheet/SheetUnavailable'
import { sheetToShow } from '../features/sheet/open-sheet'
import { useLanguage, useMessages } from '../i18n'
import { decodeCreationCode } from '../shared/codec/codes'
import type { CharacterDocument } from '../shared/schema/character'
import { saveToDevice } from '../storage/browser'
import { characterFile, storedCharacterFile } from '../storage/files'
import { newId } from '../storage/ids'
import type { WriteResult } from '../storage/library'
import { OptionButton, Panel, Screen, StepHeader } from '../ui'
import { useLibrary } from './library-store'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'

export function HomePage() {
  const navigate = useNavigate()
  usePageTitle(undefined)
  // Campaigns join the list when the game master's screens exist.
  return <Home pack={usePack()} entries={['characters', 'options']} onOpen={(entry) => void navigate(`/${entry}`)} />
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
      onOpen={(id) => void navigate(`/characters/${id}`)}
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

  if (shown.show === 'problem') {
    // Whatever is kept under that id can still leave as a file, exactly as it is stored.
    return <SheetUnavailable problem={shown.problem} onBack={back} onSaveFile={entry ? () => saveToDevice(storedCharacterFile(entry)) : undefined} />
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
      />
      {/* Out of sight on screen; in print it takes the place of the screens. */}
      <PaperSheet pack={pack} character={shown.character} numbers={shown.numbers} language={language} messages={messages} origin={origin} />
    </>
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
