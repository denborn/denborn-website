/**
 * A player's page in a live session: joining, being in, the fight, and what a
 * character does between two fights. Fetched when first opened.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePack } from '../data/use-pack'
import { BattleScreen } from '../features/battle/BattleScreen'
import { PROGRESS_VIEWS, ProgressScreen } from '../features/progress/ProgressScreen'
import { JoinScreen } from '../features/session/JoinScreen'
import { GUEST_START, type GuestState } from '../features/session/guest'
import { type GuestRun, runGuest } from '../features/session/run-guest'
import { useMessages } from '../i18n'
import { joinCodeIn } from '../shared/protocol/room-code'
import { useLibrary } from './library-store'
import { sessionKeys } from './session-keys'
import { usePageTitle } from './page-title'

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
  /** How long the relay took to answer the last check of this device's line, with the visit it is true of. */
  const [latency, setLatency] = useState<{ visit: string; milliseconds: number | undefined }>()
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
      // The screen's alone: how far the relay is, for the strip of a fight.
      onLatency: (milliseconds) => setLatency({ visit, milliseconds }),
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
      <BattleScreen
        pack={pack}
        fight={state.fight}
        party={state.party.members.map((member) => member.character)}
        me={state.party.you}
        answer={state.answer}
        notice={!state.linked ? messages.session.join.lineDown : !state.hostThere ? messages.session.join.hostGone : undefined}
        latency={latency?.visit === visit ? latency.milliseconds : undefined}
        onIntent={(intent) => run.current?.intend(intent)}
      />
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
