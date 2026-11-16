/**
 * The app's pages: each one ties a screen (src/features) to the address bar
 * and to what the device keeps. The screens themselves know neither.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { BattleScreen } from '../features/battle/BattleScreen'
import { GmConsole } from '../features/battle/GmConsole'
import { RewardsScreen } from '../features/battle/RewardsScreen'
import { CampaignEditor, RULE_IDS, type RuleId } from '../features/campaigns/CampaignEditor'
import { CampaignList } from '../features/campaigns/CampaignList'
import { ImportCampaign } from '../features/campaigns/ImportCampaign'
import { RemoveCampaign } from '../features/campaigns/RemoveCampaign'
import { readIncomingCampaign } from '../features/campaigns/incoming-campaign'
import { CharacterList } from '../features/characters/CharacterList'
import { ENEMY_FIELDS, EncounterEditor, type EncounterView, type EnemyField } from '../features/encounters/EncounterEditor'
import { EncounterList } from '../features/encounters/EncounterList'
import { withEncounter, withoutEncounter } from '../features/encounters/encounter-draft'
import { type LinkProblem, NewCharacter } from '../features/characters/NewCharacter'
import { CreationFlow } from '../features/creation/CreationFlow'
import { Credits } from '../features/credits/Credits'
import { Home } from '../features/home/Home'
import { ImportCharacter } from '../features/import/ImportCharacter'
import { QrCamera } from '../features/import/QrCamera'
import { type Device, readIncomingCode, readIncomingFile } from '../features/import/incoming'
import { Options } from '../features/options/Options'
import { GrantScreen } from '../features/progress/GrantScreen'
import { PROGRESS_VIEWS, ProgressScreen } from '../features/progress/ProgressScreen'
import { CharacterSheet } from '../features/sheet/CharacterSheet'
import { HostScreen } from '../features/session/HostScreen'
import { JoinScreen } from '../features/session/JoinScreen'
import { GUEST_START, type GuestState } from '../features/session/guest'
import { type GuestRun, runGuest } from '../features/session/run-guest'
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
import { useHosting } from './hosting'
import { useLibrary } from './library-store'
import { sessionKeys } from './session-keys'
import { useUnsavedGuard } from './unsaved-guard'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'

export function HomePage() {
  const navigate = useNavigate()
  usePageTitle(undefined)
  return <Home pack={usePack()} entries={['characters', 'session', 'campaigns', 'options']} offline={useOffline()} onOpen={(entry) => void navigate(`/${entry}`)} onCredits={() => void navigate('/credits')} />
}

/** The credits inside the app (decision 184). */
export function CreditsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  usePageTitle(useMessages().credits.title)
  // Back to the screen it was opened from, the home or the Options, when it is in this visit's history.
  return <Credits onBack={() => void (location.key !== 'default' ? navigate(-1) : navigate('/'))} />
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
  const guard = useUnsavedGuard()
  const entry = id === undefined ? undefined : library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  const asked = search.get('rule')
  // The code of the session of this campaign going on from this device, if there is one.
  const hostedCode = useHosting((state) => (state.hosted && state.hosted.campaignId === id ? state.hosted.code : undefined))
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
        if (!kept.ok) return kept
        // Nothing is left to lose: moving a campaign just saved to its own address is not asked about.
        guard.onUnsaved(false)
        if (id === undefined) void navigate(`/campaigns/${made.id}`, { replace: true })
        return kept
      }}
      origin={window.location.origin}
      onCopy={copyText}
      onSaveFile={(kept) => saveToDevice(campaignFile(kept))}
      onRemove={remove}
      onHost={() => void navigate(`/campaigns/${id ?? ''}/session`)}
      hosting={hostedCode}
      onEncounters={() => void navigate(`/campaigns/${id ?? ''}/encounters`)}
      onBack={() => void navigate('/campaigns')}
      onUnsaved={guard.onUnsaved}
      leaving={guard.leaving}
    />
  )
}

/** The game master hosting a session of a campaign. The session itself lives above the pages (hosting.ts): leaving this one does not leave the players (decision 143). */
export function HostSessionPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const { id } = useParams()
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const hosting = useHosting()
  /** During a fight: whether the session's own screen is shown in the console's place. */
  const [sessionShown, setSessionShown] = useState(false)
  /** The character whose sheet the game master last changed by hand: said once back on the session's screen. */
  const [granted, setGranted] = useState<string>()
  /** During a fight: whether its end, with its rewards, is being set. */
  const [ending, setEnding] = useState(false)
  const entry = library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  usePageTitle(campaign?.name ?? messages.campaigns.title)

  useEffect(() => {
    if (id !== undefined) useHosting.getState().start(id, pack)
  }, [id, pack])

  if (!campaign || id === undefined) return <CampaignUnavailable message={messages.campaigns.missing} />
  const hosted = hosting.hosted?.campaignId === id ? hosting.hosted : undefined
  // Hosting starts just after the page is first drawn.
  if (!hosted) return null
  const here = `/campaigns/${id}/session`
  const { session, table } = hosted.view

  // While a fight is on, this is its console; the session's own screen (the code, who asks to come in) is one tap away.
  const defaults = table && ending ? hosting.rewards() : undefined
  if (table && defaults) {
    return (
      <RewardsScreen
        pack={pack}
        encounter={table.encounter.name}
        outcome={table.outcome ? messages.battle.choosing.over[table.outcome] : undefined}
        party={session.party.map((member) => member.character)}
        defaults={defaults}
        onAward={(awards) => {
          hosting.closeFight(awards)
          setEnding(false)
          setSessionShown(false)
        }}
        onBack={() => setEnding(false)}
      />
    )
  }
  if (table && !sessionShown) {
    const there = new Set(session.party.filter((member) => member.present).map((member) => member.character.id))
    return (
      <GmConsole
        pack={pack}
        table={table}
        // A player who left mid-fight still has a Pokémon on the line: the campaign's own copy names it.
        party={[...session.party.map((member) => member.character), ...session.campaign.characters]}
        away={table.combatants.filter((combatant) => combatant.side === 'players' && !there.has(combatant.id)).map((combatant) => combatant.id)}
        onCommand={hosting.command}
        onEnd={() => setEnding(true)}
      >
        <div className="dn-row">
          <OptionButton onClick={() => setSessionShown(true)}>{messages.session.host.toSession}</OptionButton>
        </div>
      </GmConsole>
    )
  }
  // What the game master gives a character of the party or takes from it has a screen of its own, outside a fight.
  const receiving = table ? undefined : session.party.find((member) => member.character.id === search.get('grant'))?.character
  if (receiving) {
    return (
      <GrantScreen
        // Another character is another screen: what was being set for the first is not carried over.
        key={receiving.id}
        pack={pack}
        character={receiving}
        onGrant={(grant) => hosting.grant(receiving.id, grant)}
        onDone={(given) => {
          if (given) setGranted(receiving.nickname)
          // Back to the session's screen it was opened from, when it is in this visit's history.
          if (location.key !== 'default') void navigate(-1)
          else setSearch({}, { replace: true })
        }}
      />
    )
  }
  return (
    <HostScreen
      pack={pack}
      session={hosted.view.session}
      code={hosted.code}
      origin={window.location.origin}
      line={hosted.view.line}
      notice={hosted.notKept ? messages.saving[hosted.notKept] : hosted.fightNotKept ? messages.session.host.fightNotKept : undefined}
      stale={hosted.stale ? { name: hosted.stale.name, onRestart: () => hosting.settleStale('restart'), onEnd: () => hosting.settleStale('end') } : undefined}
      // Preparing an encounter from the session comes back to the session.
      onEncounter={(encounter) => void navigate(`/campaigns/${id}/encounters/${encounter ?? 'new'}`, { state: { back: here } })}
      onLaunch={hosting.launch}
      launching={hosted.launching}
      noLaunch={hosted.noLaunch}
      fight={table ? { name: table.encounter.name, onBack: () => setSessionShown(false) } : undefined}
      onApprove={hosting.approve}
      onDecline={hosting.decline}
      onRemove={hosting.remove}
      onRest={(character) => {
        setGranted(undefined)
        return hosting.rest(character)
      }}
      onGrant={(character) => {
        setGranted(undefined)
        setSearch({ grant: character })
      }}
      said={granted === undefined ? undefined : messages.progress.gm.granted(granted)}
      onEnd={() => {
        hosting.end()
        void navigate(`/campaigns/${id}`)
      }}
      onCopy={copyText}
      onBack={() => void navigate(`/campaigns/${id}`)}
    />
  )
}

/** The encounters prepared for a campaign. */
export function EncountersPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const messages = useMessages()
  const { id } = useParams()
  const entry = library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  usePageTitle(messages.encounters.title)
  if (!campaign || id === undefined) return <CampaignUnavailable message={messages.campaigns.missing} />
  return (
    <EncounterList
      campaign={campaign.name}
      encounters={campaign.encounters}
      onBack={() => void navigate(`/campaigns/${id}`)}
      onNew={() => void navigate(`/campaigns/${id}/encounters/new`)}
      onOpen={(encounter) => void navigate(`/campaigns/${id}/encounters/${encounter}`)}
    />
  )
}

const isEnemyField = (value: string | null): value is EnemyField => ENEMY_FIELDS.some((field) => field === value)

/** How deep a view is in the encounter: its page, one of its parts, one thing of one enemy. */
const depthOf = (view: EncounterView): number => (view.at === 'hub' ? 0 : view.at === 'enemy' && view.field ? 2 : 1)

/** One encounter of a campaign: a new one at …/encounters/new, a kept one at …/encounters/<id>. What is open is in the address, so that Back closes it. */
export function EncounterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const pack = usePack()
  const library = useLibrary()
  const messages = useMessages()
  const { id, encounterId } = useParams()
  const [search, setSearch] = useSearchParams()
  const guard = useUnsavedGuard()
  const entry = library.campaigns().find((stored) => stored.id === id)
  const campaign = entry?.read.ok ? entry.read.value : undefined
  const rules = campaign?.rulesHistory.at(-1)
  const encounter = campaign?.encounters.find((kept) => kept.id === encounterId)
  usePageTitle(encounter?.name ?? messages.encounters.newTitle)
  if (!campaign || !rules || id === undefined) return <CampaignUnavailable message={messages.campaigns.missing} />

  const list = `/campaigns/${id}/encounters`
  // Where the game master came from: the session being hosted, when the encounter was opened from it.
  const back = (location.state as { back?: string } | null)?.back ?? list
  const enemy = search.get('enemy')
  const field = search.get('field')
  const part = search.get('open')
  const view: EncounterView = enemy ? { at: 'enemy', id: enemy, ...(isEnemyField(field) ? { field } : {}) } : part === 'name' || part === 'bag' ? { at: part } : { at: 'hub' }

  return (
    <EncounterEditor
      // Another encounter is another page: what was being prepared is not carried over.
      key={encounterId ?? 'new'}
      pack={pack}
      rules={rules}
      encounter={encounter}
      view={view}
      onView={(next) => {
        // Closing what is open goes back one page when this visit opened it; otherwise the address is set straight.
        if (depthOf(next) < depthOf(view) && location.key !== 'default') void navigate(-1)
        else setSearch(next.at === 'enemy' ? { enemy: next.id, ...(next.field ? { field: next.field } : {}) } : next.at === 'hub' ? {} : { open: next.at }, { replace: depthOf(next) < depthOf(view), state: location.state as unknown })
      }}
      newId={newId}
      onSave={(made) => {
        // Written into the campaign as the device keeps it now: a session going on may have added a character meanwhile.
        const kept = library.saveCampaign(withEncounter(campaign, made))
        if (!kept.ok) return kept
        guard.onUnsaved(false)
        if (encounterId === undefined) void navigate(`${list}/${made.id}`, { replace: true, state: { back } })
        return kept
      }}
      onRemove={() => {
        if (encounter) library.saveCampaign(withoutEncounter(campaign, encounter.id))
        void navigate(back, { replace: true })
      }}
      onBack={() => void navigate(back)}
      onUnsaved={guard.onUnsaved}
      leaving={guard.leaving}
    />
  )
}

/** A player joining a session and being in it: the code at /session, the session itself at /session/<code>, so that a reload comes back to it. */
export function JoinSessionPage() {
  const navigate = useNavigate()
  const pack = usePack()
  const library = useLibrary()
  const { code: given } = useParams()
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const code = given !== undefined ? joinCodeIn(given) : undefined
  const run = useRef<GuestRun>(undefined)
  /** One more each time the player tries again with the same code. */
  const [attempt, setAttempt] = useState(0)
  const visit = `${code ?? ''}#${attempt}`
  /** Where the player stands, with the visit it is true of: what a former visit left is not shown for the next. */
  const [stand, setStand] = useState<{ visit: string; state: GuestState }>()
  const messages = useMessages()
  usePageTitle(messages.session.join.title)

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

  const state = code ? (stand?.visit === visit ? stand.state : GUEST_START) : undefined
  const fighting = state?.at === 'in' && state.fight !== undefined
  /** What the player opened for their character between two fights (milestone 7). */
  const opened = PROGRESS_VIEWS.find((view) => view === search.get('open'))
  // A fight closes what was open: the session's own screen is what its end comes back to.
  useEffect(() => {
    if (fighting && opened) setSearch({}, { replace: true })
  }, [fighting, opened, setSearch])

  // A fight takes the whole phone: the scene above, the choices below (decision 147).
  if (state?.at === 'in' && state.fight) {
    return (
      <div className="dn-page">
        <BattleScreen
          pack={pack}
          fight={state.fight}
          party={state.party.members.map((member) => member.character)}
          me={state.party.you}
          answer={state.answer}
          notice={!state.linked ? messages.session.join.lineDown : !state.hostThere ? messages.session.join.hostGone : undefined}
          onIntent={(intent) => run.current?.intend(intent)}
        />
      </div>
    )
  }

  if (state?.at === 'in' && opened) {
    const mine = state.party.members.find((member) => member.character.id === state.party.you)?.character
    const kept = library.characters().find((stored) => stored.id === state.party.you)
    return (
      <ProgressScreen
        // Another view starts from its own beginning.
        key={opened}
        pack={pack}
        party={state.party}
        view={opened}
        // The rules it was made under: this device's own when it has them, otherwise the ones kept with its copy.
        rules={mine && (library.rulesOf(mine.campaign.id, mine.campaign.rulesVersion, pack.species) ?? (kept?.read.ok ? kept.read.value.rules : undefined))}
        changed={state.changed}
        unreachable={!state.linked ? messages.session.join.lineDown : !state.hostThere ? messages.session.join.hostGone : undefined}
        onChange={(change) => run.current?.change(change)}
        onBack={() => {
          if (location.key !== 'default') void navigate(-1)
          else setSearch({}, { replace: true })
        }}
      />
    )
  }

  return (
    <JoinScreen
      // A code in the address that is no join code is shown as typed, for the player to correct.
      key={given ?? 'code'}
      pack={pack}
      code={given}
      state={state}
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
      onRewardsRead={() => run.current?.rewardsRead()}
      onGrantedRead={() => run.current?.grantedRead()}
      onOpen={(view) => setSearch({ open: view })}
      onAgain={() => setAttempt(attempt + 1)}
      onBack={() => void navigate('/')}
    />
  )
}

export function OptionsPage() {
  const navigate = useNavigate()
  usePageTitle(useMessages().options.title)
  return <Options offline={useOffline()} onCredits={() => void navigate('/credits')} onBack={() => void navigate('/')} />
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
