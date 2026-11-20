import type { ReactNode } from 'react'
import type { DataPack } from '../../data/types'
import { pointsLeft } from '../../domain/level-up'
import { ATTRIBUTE_CAP, ATTRIBUTE_IDS, type AttributeId, CREATION_MIN } from '../../game-rules/attributes'
import { STAT_IDS } from '../../game-rules/stats'
import { TV_MAX, tvOf } from '../../game-rules/training'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import { NumberField, OptionButton } from '../../ui'
import { ViewFoot } from './ViewFoot'
import { type PointTarget, type PointsDraft, leftAfter, newPoints, rangeOf } from './points-draft'

export interface PointsViewProps {
  pack: DataPack
  character: CharacterDocument
  /** Where the player would put the points: nothing is asked before PLACE. */
  draft: PointsDraft
  /** Where the last request stands, said over the buttons; nothing when there is nothing to say. */
  notes: ReactNode
  /** True while nothing can be asked. */
  busy: boolean
  /** True while the player is asked to confirm. */
  confirming: boolean
  onPoint: (target: PointTarget, value: number) => void
  onConfirming: (confirming: boolean) => void
  onPlace: () => void
  onBack: () => void
}

/**
 * The points a character's levels brought, for its player to place (decision
 * 8): TV and roleplay points, each kind shown while it has points left.
 * What the sheet already has is the lowest each total goes; placing is
 * confirmed, since it is for good.
 */
export function PointsView({ pack, character, draft, notes, busy, confirming, onPoint, onConfirming, onPlace, onBack }: PointsViewProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress.points
  const dead = character.condition.state === 'dead'
  const toPlace = pointsLeft(character)
  const left = leftAfter(character, draft)
  const placing = newPoints(character, draft)
  const nothing = toPlace.tv <= 0 && toPlace.attributes <= 0
  const tv = tvOf(draft)

  return (
    <>
      <div className="dn-stack">
        {dead && (
          <p className="dn-note dn-note--error" role="status">
            {text.dead(character.nickname)}
          </p>
        )}
        {!dead && nothing && <p className="dn-note">{text.none}</p>}
        {!dead && !nothing && (
          <>
            <p className="dn-note">{text.intro}</p>
            {toPlace.tv > 0 && (
              <div role="group" aria-label={text.tv(left.tv)} className="dn-entry">
                <span className="dn-label" role="status">
                  {text.tv(left.tv)}
                </span>
                {STAT_IDS.map((stat) => {
                  const name = pack.statNames[stat][language]
                  const range = rangeOf(character, draft, { kind: 'tv', stat })
                  return (
                    <NumberField
                      key={stat}
                      label={name}
                      value={tv[stat]}
                      min={0}
                      max={TV_MAX}
                      floor={range.floor}
                      ceiling={range.ceiling}
                      onChange={(value) => onPoint({ kind: 'tv', stat }, value)}
                      lowerLabel={messages.creation.lower(name)}
                      raiseLabel={messages.creation.raise(name)}
                    />
                  )
                })}
              </div>
            )}
            {toPlace.attributes > 0 && (
              <div role="group" aria-label={text.attributes(left.scores)} className="dn-entry">
                <span className="dn-label" role="status">
                  {text.attributes(left.scores)}
                </span>
                {ATTRIBUTE_IDS.map((attribute: AttributeId) => {
                  const name = messages.creation.attributes.names[attribute]
                  const range = rangeOf(character, draft, { kind: 'scores', attribute })
                  return (
                    <NumberField
                      key={attribute}
                      label={name}
                      value={draft.scores[attribute]}
                      min={CREATION_MIN}
                      max={ATTRIBUTE_CAP}
                      floor={range.floor}
                      ceiling={range.ceiling}
                      onChange={(value) => onPoint({ kind: 'scores', attribute }, value)}
                      lowerLabel={messages.creation.lower(name)}
                      raiseLabel={messages.creation.raise(name)}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      <ViewFoot
        said={
          confirming ? (
            <p className="dn-note dn-note--error" role="alert">
              {text.question(placing)}
            </p>
          ) : (
            notes
          )
        }
      >
        {confirming ? (
          <>
            <OptionButton disabled={busy} onClick={onPlace}>
              {text.yes}
            </OptionButton>
            <OptionButton primary onClick={() => onConfirming(false)}>
              {text.no}
            </OptionButton>
          </>
        ) : (
          <>
            <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
            {!dead && !nothing && (
              <OptionButton primary disabled={busy || placing === 0} onClick={() => onConfirming(true)}>
                {text.place}
              </OptionButton>
            )}
          </>
        )}
      </ViewFoot>
    </>
  )
}
