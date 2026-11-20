import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { sheetNumbers } from '../../domain/sheet'
import { useLanguage, useMessages } from '../../i18n'
import type { Party, SheetChange } from '../../shared/protocol/session'
import type { CampaignRules } from '../../shared/schema/rules'
import { DualScreen, Screen, StepHeader } from '../../ui'
import { BuildPreview } from '../sheet/BuildPreview'
import { Portrait } from '../sheet/Portrait'
import { BagView } from './BagView'
import { EvolveView } from './EvolveView'
import { PointsView } from './PointsView'
import { RestView } from './RestView'
import { type PointsDraft, draftOfPoints, placementOf, withPoint } from './points-draft'
import { refusalWords } from './refusal'

export const PROGRESS_VIEWS = ['points', 'evolve', 'bag', 'rest'] as const
/** What a player does for their character between two fights: place points, evolve, open the Bag, choose again during a rest. */
export type ProgressView = (typeof PROGRESS_VIEWS)[number]

export interface ProgressScreenProps {
  pack: DataPack
  /** The party as the game master's side last told it; the player's character is the one it names as theirs. */
  party: Party
  view: ProgressView
  /** The rules the player's character was made under, when this device has them. */
  rules: CampaignRules | undefined
  /** What became of the last change that was answered. */
  changed?: { id: string; refused?: string } | undefined
  /** What to say while the game master's side cannot be asked: nothing changes until it can. */
  unreachable?: string | undefined
  /** Asks a change of a sheet, and gives the id its answer will carry. */
  onChange: (change: SheetChange) => string | undefined
  onBack: () => void
}

/**
 * A character's progress, for its player, during a session and outside a
 * fight (milestone 7). The screen decides nothing: each change is asked of
 * the game master's side, and the sheet shown is the one it tells back.
 */
export function ProgressScreen({ pack, party, view, rules, changed, unreachable, onChange, onBack }: ProgressScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress
  /** The last change asked from this screen, and what to say once it is made. */
  const [asked, setAsked] = useState<{ id: string; said: string }>()
  /** The points being placed, for the sheet they were started on: a sheet that changed starts them over. */
  const [points, setPoints] = useState<{ revision: number; draft: PointsDraft; shown: 'stats' | 'attributes'; confirming: boolean }>()
  const member = party.members.find((entry) => entry.character.id === party.you)
  if (!member) return null
  const mine = member.character
  const numbers = sheetNumbers(mine, pack)

  const answer = asked && changed?.id === asked.id ? changed : undefined
  // A request the game master's side cannot hear is not waited for: it is asked again once it can.
  if (asked && !answer && unreachable !== undefined) setAsked(undefined)
  const pending = asked !== undefined && !answer
  const busy = pending || unreachable !== undefined
  const ask = (change: SheetChange, said: string): void => {
    const id = onChange(change)
    if (id !== undefined) setAsked({ id, said })
  }
  const notes = unreachable === undefined && !pending && !answer ? undefined : (
    <>
      {unreachable !== undefined && (
        <p className="dn-note" role="status">
          {unreachable}
        </p>
      )}
      {pending && (
        <p className="dn-note" role="status">
          {text.asking}
        </p>
      )}
      {answer?.refused !== undefined && (
        <p className="dn-note dn-note--error" role="alert">
          {refusalWords(text.refused, answer.refused)}
        </p>
      )}
      {asked && answer && answer.refused === undefined && (
        <p className="dn-note" role="status">
          {asked.said}
        </p>
      )}
    </>
  )

  const placing = points?.revision === mine.revision ? points : { revision: mine.revision, draft: draftOfPoints(mine), shown: 'stats' as const, confirming: false }
  const title = text[view].title(mine.nickname)
  const nature = mine.nature
  return (
    <DualScreen>
      <Screen kind="scene" label={mine.nickname}>
        {view === 'points' ? (
          <BuildPreview
            pack={pack}
            draft={{ species: mine.species, nickname: mine.nickname, gender: mine.gender, ability: mine.ability, attributes: placing.draft.scores, ivs: placing.draft.ivs, evs: placing.draft.evs, moves: [], ...(nature ? { nature } : {}) }}
            level={mine.level}
            view={placing.shown}
            language={language}
            text={messages.creation}
            levelText={messages.battle.level}
          />
        ) : (
          numbers && <Portrait pack={pack} character={mine} numbers={numbers} language={language} messages={messages} />
        )}
      </Screen>
      <Screen kind="menu" label={title} scrolls>
        <StepHeader title={title} />
        {view === 'points' && (
          <PointsView
            pack={pack}
            character={mine}
            draft={placing.draft}
            notes={notes}
            busy={busy}
            confirming={placing.confirming}
            // The top screen shows what the points being moved change: the stats, or the roleplay attributes.
            onPoint={(target, value) => setPoints({ ...placing, draft: withPoint(mine, placing.draft, target, value), shown: target.kind === 'scores' ? 'attributes' : 'stats', confirming: false })}
            onConfirming={(confirming) => setPoints({ ...placing, confirming })}
            onPlace={() => {
              ask({ do: 'points', ...placementOf(mine, placing.draft) }, text.points.done)
              setPoints({ ...placing, confirming: false })
            }}
            onBack={onBack}
          />
        )}
        {view === 'evolve' && <EvolveView pack={pack} character={mine} notes={notes} busy={busy} onEvolve={(to, said) => ask({ do: 'evolve', to }, said)} onBack={onBack} />}
        {view === 'bag' && <BagView pack={pack} characters={party.members.map((entry) => entry.character)} mine={mine} notes={notes} busy={busy} onAsk={ask} onBack={onBack} />}
        {view === 'rest' && (
          <RestView
            pack={pack}
            character={mine}
            resting={member.resting}
            rules={rules}
            notes={notes}
            busy={busy}
            done={answer !== undefined && answer.refused === undefined}
            onChoose={(choice) => ask({ do: 'reselect', ability: choice.ability, moves: [...choice.moves] }, text.rest.done)}
            onBack={onBack}
          />
        )}
      </Screen>
    </DualScreen>
  )
}
