/**
 * A game master's pages: campaigns, their encounters, and the session being
 * hosted with its fights. Fetched when one of them is first opened.
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { GmConsole } from '../features/battle/GmConsole'
import { RewardsScreen } from '../features/battle/RewardsScreen'
import { CampaignEditor, RULE_IDS, type RuleId } from '../features/campaigns/CampaignEditor'
import { CampaignList } from '../features/campaigns/CampaignList'
import { ImportCampaign } from '../features/campaigns/ImportCampaign'
import { RemoveCampaign } from '../features/campaigns/RemoveCampaign'
import { readIncomingCampaign } from '../features/campaigns/incoming-campaign'
import { ENEMY_FIELDS, EncounterEditor, type EncounterView, type EnemyField } from '../features/encounters/EncounterEditor'
import { EncounterList } from '../features/encounters/EncounterList'
import { withEncounter, withoutEncounter } from '../features/encounters/encounter-draft'
import { GrantScreen } from '../features/progress/GrantScreen'
import { HostScreen } from '../features/session/HostScreen'
import { useMessages } from '../i18n'
import { saveToDevice, textOfPickedFile } from '../storage/browser'
import { campaignFile, storedCampaignFile } from '../storage/files'
import { newId } from '../storage/ids'
import { OptionButton, Screen, StepHeader } from '../ui'
import { copyText } from './clipboard'
import { useHosting } from './hosting'
import { useLibrary } from './library-store'
import { useUnsavedGuard } from './unsaved-guard'
import { usePageTitle } from './page-title'

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
