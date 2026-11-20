import { useId, useState } from 'react'
import type { DataPack, Gender } from '../../data/types'
import { ATTRIBUTE_CAP, CREATION_MIN, CREATION_POINTS, attributeTally, gainedPoints } from '../../game-rules/attributes'
import { tidyNickname } from '../../game-rules/nickname'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { GenderMark } from '../../ui/battle'
import { DexKey, DexPage, StepperBox, Tray } from '../../ui/dex'
import type { StepChrome } from './Creation'
import { ATTRIBUTE_ORDER } from './RecapScreen'
import { BIG_STEP } from './big-step'
import { type CreationDraft, type DraftChoice, attributeCeiling, identityProblems } from './draft'

export interface IdentityStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  rules: CampaignRules
  draft: CreationDraft
  onChoose: (choice: DraftChoice) => void
}

/** The sexes a player chooses between: a species of one sex, or of none, leaves nothing to choose. */
const SEXES: readonly Exclude<Gender, 'N'>[] = ['M', 'F']

/**
 * Who the Pokémon is (decisions 291 and 302): its name; its sex, as two
 * buttons, where its species has both; its six roleplay attributes, each a
 * number in a box of its own colour, starting at 5. What they are for is
 * behind the (i): the game master says it at the table.
 */
export function IdentityStep({ pack, language, messages, chrome, rules, draft, onChoose }: IdentityStepProps) {
  const text = messages.creation
  const words = text.identity
  const nameId = useId()
  const [about, setAbout] = useState(false)
  const species = draft.species ? pack.species[draft.species] : undefined
  if (!species) return null

  const level = rules.startingLevel
  // Nothing is called wrong before the player has typed anything.
  const nameProblem = draft.nickname === '' ? undefined : identityProblems(draft, { pack, rules }).nickname
  const sexes = species.genders.length > 1
  const tally = attributeTally(draft.attributes, level)
  const extra = gainedPoints(level)
  const placed = ATTRIBUTE_ORDER.reduce((sum, attribute) => sum + draft.attributes[attribute], 0)
  // Every point of creation must be placed; the level's extra ones may wait. The count turns once creation's are all placed.
  const state = tally.toPlace > 0 ? '' : ' dn-dex-count--spent'

  return (
    <>
      <DexPage
        title={words.title}
        steps={chrome.steps}
        covered={about}
        foot={
          <>
            <DexKey shape="square" aria-label={text.dex.about} onClick={() => setAbout(true)}>
              {text.dex.aboutKey}
            </DexKey>
            {/* What is wrong with the name, while something is; else the count, said again when it changes without taking the focus. */}
            {nameProblem ? (
              <p className="dn-dex-foot__said dn-dex-foot__said--problem" role="status">
                {words.nicknameProblem[nameProblem]}
              </p>
            ) : (
              <p className={`dn-dex-count${state}`} role="status" aria-label={tally.toPlace > 0 ? text.attributes.toPlace(tally.toPlace) : text.attributes.placed}>
                {text.dex.count(placed, CREATION_POINTS + extra)}
              </p>
            )}
            {chrome.next}
          </>
        }
      >
        <div className="dn-dex-identity dn-dex-split">
          <div className="dn-dex-identity__top">
            <div className="dn-dex-field">
              <label className="dn-dex-field__label" htmlFor={nameId}>
                {words.nickname}
              </label>
              <input
                id={nameId}
                className="dn-dex-field__input"
                type="text"
                value={draft.nickname}
                placeholder={species.name[language]}
                aria-invalid={nameProblem !== undefined}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
                onChange={(event) => onChoose({ choose: 'nickname', nickname: event.target.value })}
                onBlur={() => onChoose({ choose: 'nickname', nickname: tidyNickname(draft.nickname) })}
              />
            </div>
            {sexes && (
              <div className="dn-dex-sexes" role="group" aria-label={words.gender}>
                {SEXES.filter((sex) => species.genders.includes(sex)).map((sex) => (
                  <button key={sex} type="button" className={`dn-dex-sex dn-dex-sex--${sex.toLowerCase()}`} aria-pressed={draft.gender === sex} onClick={() => onChoose({ choose: 'gender', gender: sex })}>
                    <GenderMark gender={sex} label={words.genders[sex]} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="dn-dex-box-row">
            {ATTRIBUTE_ORDER.map((attribute) => {
              const name = text.attributes.names[attribute]
              return (
                <StepperBox
                  key={attribute}
                  short={text.dex.attributes.short[attribute]}
                  name={name}
                  tone={{ fill: `var(--dn-attr-${attribute})`, shade: `var(--dn-attr-${attribute}-shade)` }}
                  value={draft.attributes[attribute]}
                  min={CREATION_MIN}
                  max={ATTRIBUTE_CAP}
                  ceiling={attributeCeiling(draft.attributes, attribute, level)}
                  onChange={(value) => onChoose({ choose: 'attribute', attribute, value })}
                  raiseLabel={text.raise(name)}
                  lowerLabel={text.lower(name)}
                  ends={{ most: text.dex.most, least: text.dex.least }}
                  bigStep={BIG_STEP === undefined ? undefined : { by: BIG_STEP, raiseLabel: text.raiseBy(name, BIG_STEP), lowerLabel: text.lowerBy(name, BIG_STEP) }}
                />
              )
            })}
          </div>
        </div>
      </DexPage>

      <Tray open={about} title={text.dex.stepNames.identity} closeLabel={text.dex.close} onClose={() => setAbout(false)}>
        <p className="dn-tray__text">{text.attributes.intro}</p>
        {extra > 0 && <p className="dn-tray__text">{text.attributes.extra(Math.max(0, tally.extraLeft), extra)}</p>}
      </Tray>
    </>
  )
}
