/**
 * The app's pages: each one ties a screen (src/features) to the address bar
 * and to what the device keeps. The screens themselves know neither.
 */
import { useEffect, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { CampaignEditor, RULE_IDS, type RuleId } from '../features/campaigns/CampaignEditor'
import { CampaignList } from '../features/campaigns/CampaignList'
import { ImportCampaign } from '../features/campaigns/ImportCampaign'
import { RemoveCampaign } from '../features/campaigns/RemoveCampaign'
import { readIncomingCampaign } from '../features/campaigns/incoming-campaign'
import { CharacterList } from '../features/characters/CharacterList'
import { type LinkProblem, NewCharacter } from '../features/characters/NewCharacter'
import { CreationFlow } from '../features/creation/CreationFlow'
import { Home } from '../features/home/Home'
import { ImportCharacter } from '../features/import/ImportCharacter'
import { QrCamera } from '../features/import/QrCamera'
import { type Device, readIncomingCode, readIncomingFile } from '../features/import/incoming'
import { Options } from '../features/options/Options'
import { CharacterSheet } from '../features/sheet/CharacterSheet'
import { HostScreen } from '../features/session/HostScreen'
import { JoinScreen } from '../features/session/JoinScreen'
import { GUEST_START, type GuestState } from '../features/session/guest'
import { openSession } from '../features/session/host'
import { type GuestRun, runGuest } from '../features/session/run-guest'
import { type HostRun, type HostView, runHost } from '../features/session/run-host'
import { PaperSheet } from '../features/sheet/PaperSheet'
import { RemoveCharacter } from '../features/sheet/RemoveCharacter'
import { SheetUnavailable } from '../features/sheet/SheetUnavailable'
import { sheetToShow } from '../features/sheet/open-sheet'
import { useLanguage, useMessages } from '../i18n'
import { decodeCreationCode } from '../shared/codec/codes'
import { joinCodeIn } from '../shared/protocol/room-code'
import type { CharacterDocument } from '../shared/schema/character'
import { saveToDevice, textOfPickedFile } from '../storage/browser'
import { campaignFile, characterFile, storedCampaignFile, storedCharacterFile } from '../storage/files'
import { newId } from '../storage/ids'
import type { WriteResult } from '../storage/library'
import { OptionButton, Panel, Screen, StepHeader } from '../ui'
import { copyText } from './clipboard'
import { useLibrary } from './library-store'
import { sessionKeys } from './session-keys'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'

export function HomePage() {
  const navigate = useNavigate()
  usePageTitle(undefined)
  return <Home pack={usePack()} entries={['characters', 'session', 'campaigns', 'options']} onOpen={(entry) => void navigate(`/${entry}`)} />
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  usePageTitle(useMessages().campaigns.title)
  return (
    <CampaignList
      entries={library.campaigns()}
      onBack={() => void navigate('/')}
      onNew={() => void navigate('/campaigns/new')}
      onImport={() => void navigate('/campaigns/import')}
      onOpen={(id) => void navigate(`/campaigns/${id}`)}
    />
  )
}

export function ImportCampaignPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  usePageTitle(useMessages().campaigns.importing.title)
  return (
    <ImportCampaign
      read={(text) => readIncomingCampaign(text, pack, library.campaigns())}
      textOfFile={textOfPickedFile}
      onKeep={(campaign) => library.saveCampaign(campaign)}
      onOpen={(id) => void navigate(`/campaigns/${id}`)}
      onBack={() => void navigate('/campaigns')}
    />
  )
}

export function RemoveCampaignPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const messages = useMessages()
  const { id } = useParams()
  const entry = library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  usePageTitle(campaign ? messages.campaigns.removal.title(campaign.name) : messages.campaigns.removal.titleUnreadable)

  if (!entry) return <CampaignUnavailable message={messages.campaigns.missing} />
  return (
    <RemoveCampaign
      name={campaign?.name}
      // Its file as the app writes it when it can be read; otherwise what is kept, exactly as it is stored.
      onSaveFile={() => saveToDevice(campaign ? campaignFile(campaign) : storedCampaignFile(entry))}
      onRemove={() => {
        library.removeCampaign(entry.id)
        // The list takes this page's place: going back does not return to a question already answered.
        void navigate('/campaigns', { replace: true })
      }}
      onKeep={() => void navigate(`/campaigns/${entry.id}`)}
    />
  )
}

interface CampaignUnavailableProps {
  message: string
  /** Given when the device does keep something under that id: it can leave as a file and be removed. */
  onSaveFile?: () => void
  onRemove?: () => void
}

/** In a campaign's place when there is none to show: why, and for an entry that cannot be read, its file and the way to remove it. */
function CampaignUnavailable({ message, onSaveFile, onRemove }: CampaignUnavailableProps) {
  const navigate = useNavigate()
  const messages = useMessages()
  return (
    <div className="dn-page">
      <Screen kind="menu" label={messages.campaigns.title} tall>
        <StepHeader title={messages.campaigns.title} />
        <div className="dn-stack">
          <p className="dn-note dn-note--error">{message}</p>
          {onSaveFile && (
            <div className="dn-row">
              <OptionButton primary onClick={onSaveFile}>
                {messages.campaigns.saveFile}
              </OptionButton>
            </div>
          )}
          {onRemove && (
            <div className="dn-row">
              <OptionButton onClick={onRemove}>{messages.campaigns.remove}</OptionButton>
            </div>
          )}
        </div>
        <div className="dn-foot">
          <OptionButton onClick={() => void navigate('/campaigns')}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
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

  const remove = (): void => void navigate(`/campaigns/${id ?? ''}/remove`)
  if (id !== undefined && !campaign) {
    if (!entry) return <CampaignUnavailable message={messages.campaigns.missing} />
    return <CampaignUnavailable message={messages.campaigns.unreadable} onSaveFile={() => saveToDevice(storedCampaignFile(entry))} onRemove={remove} />
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
      onRemove={remove}
      onHost={() => void navigate(`/campaigns/${id ?? ''}/session`)}
      onBack={() => void navigate('/campaigns')}
      onUnsaved={setUnsaved}
      leaving={blocker.state === 'blocked' ? { stay: () => blocker.reset(), leave: () => blocker.proceed() } : undefined}
    />
  )
}

/** The game master hosting a session of a campaign: the page that keeps the line to the relay open. Leaving it leaves the players waiting; coming back takes the session up again (decision 122). */
export function HostSessionPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const { id } = useParams()
  const run = useRef<HostRun>(undefined)
  // The room this device hosts the campaign in: the one it had, or a new one, made once for this visit.
  const [hosting] = useState(() => (id === undefined ? undefined : sessionKeys.hostingOf(id)))
  const [view, setView] = useState<HostView>()
  const [notKept, setNotKept] = useState<Extract<WriteResult, { ok: false }>['reason']>()
  const entry = library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  usePageTitle(campaign?.name ?? messages.campaigns.title)

  useEffect(() => {
    // Read once, when hosting starts: from then on the session itself holds the campaign and hands its changes over.
    const kept = useLibrary.getState().campaigns().find((stored) => stored.id === id)
    if (!hosting || !kept?.read.ok) return
    const hosted = kept.read.value
    const started = runHost({
      campaign: hosted,
      pack,
      hosting,
      origin: window.location.origin,
      onChange: setView,
      onCampaign: (changed) => {
        const saved = useLibrary.getState().saveCampaign(changed)
        setNotKept(saved.ok ? undefined : saved.reason)
      },
      onMembers: (members) => sessionKeys.keepMembers(hosted.id, members),
    })
    run.current = started
    return () => {
      started.stop()
      run.current = undefined
    }
  }, [id, pack, hosting])

  if (!campaign || !hosting || id === undefined) return <CampaignUnavailable message={messages.campaigns.missing} />
  // Until the line first speaks: the session as this device remembers it, on its way to the relay.
  const shown = view ?? { session: openSession(campaign, hosting.members), line: 'connecting' as const }
  return (
    <HostScreen
      pack={pack}
      session={shown.session}
      code={hosting.code}
      origin={window.location.origin}
      line={shown.line}
      notice={notKept ? messages.saving[notKept] : undefined}
      onApprove={(peer, keep) => run.current?.approve(peer, keep)}
      onDecline={(peer) => run.current?.decline(peer)}
      onRemove={(peer) => run.current?.remove(peer)}
      onEnd={() => {
        run.current?.end()
        // The room is given up: the next session of the campaign gets a new code.
        sessionKeys.forgetHosting(id)
        void navigate(`/campaigns/${id}`)
      }}
      onCopy={copyText}
      onBack={() => void navigate(`/campaigns/${id}`)}
    />
  )
}

/** A player joining a session and being in it: the code at /session, the session itself at /session/<code>, so that a reload comes back to it. */
export function JoinSessionPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const { code: given } = useParams()
  const code = given !== undefined ? joinCodeIn(given) : undefined
  const run = useRef<GuestRun>(undefined)
  /** One more each time the player tries again with the same code. */
  const [attempt, setAttempt] = useState(0)
  const visit = `${code ?? ''}#${attempt}`
  /** Where the player stands, with the visit it is true of: what a former visit left is not shown for the next. */
  const [stand, setStand] = useState<{ visit: string; state: GuestState }>()
  usePageTitle(useMessages().session.join.title)

  useEffect(() => {
    if (!code) return
    const seat = sessionKeys.seatAt(code)
    const kept = useLibrary.getState().characters().find((stored) => stored.id === seat.character)
    const started = runGuest({
      code,
      origin: window.location.origin,
      token: seat.token,
      dataPackVersion: pack.version,
      character: kept?.read.ok ? kept.read.value : undefined,
      onChange: (next) => {
        setStand({ visit, state: next })
        if (next.at !== 'out') return
        // Out with nothing to come back to: the place is given up. Refused or removed: the place stays, the character is to choose again.
        if (next.why === 'ended' || next.why === 'noSession' || next.why === 'left') sessionKeys.forgetSeat(code)
        else if (next.why === 'refused' || next.why === 'removed') sessionKeys.bring(code, undefined)
      },
      // The copy the game master's side gave back is the one that counts (decision 13): it takes the place of the device's.
      onKeep: (copy) => void useLibrary.getState().saveCharacter(copy),
    })
    run.current = started
    return () => {
      started.stop()
      run.current = undefined
    }
  }, [code, pack, visit])

  return (
    <JoinScreen
      // A code in the address that is no join code is shown as typed, for the player to correct.
      key={given ?? 'code'}
      pack={pack}
      code={given}
      state={code ? (stand?.visit === visit ? stand.state : GUEST_START) : undefined}
      characters={library.characters().flatMap((stored) => (stored.read.ok ? [stored.read.value] : []))}
      onCode={(typed) => void navigate(`/session/${typed}`)}
      onChoose={(character) => {
        if (code) sessionKeys.bring(code, character.id)
        run.current?.choose(character)
      }}
      onCreate={(invitation) => {
        // The rules the game master's side gave are kept like a creation link's; creation then knows to come back here.
        library.saveInvitation(invitation, pack.species)
        void navigate(`/characters/new/${invitation.campaign.id}`, { state: { session: code } })
      }}
      onLeave={() => run.current?.leave()}
      onAgain={() => setAttempt(attempt + 1)}
      onBack={() => void navigate('/')}
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
  // Set when creation was started from a session's join screen (decision 128): the code of the session to come back to.
  const session = (useLocation().state as { session?: string } | null)?.session

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
    if (!saved.ok) {
      setUnsaved({ character, reason: saved.reason })
      return
    }
    if (session === undefined) {
      void navigate('/characters')
      return
    }
    // Made from a session's join screen: it is the character brought, and the session is where the player goes back to.
    sessionKeys.bring(session, character.id)
    void navigate(`/session/${session}`, { replace: true })
  }

  // Leaving before the character is made goes back where creation was started from.
  const leave = (): void => void navigate(session === undefined ? '/characters/new' : `/session/${session}`)
  return <CreationFlow invitation={invitation} pack={pack} newId={newId} onLeave={leave} onCreate={keep} />
}
