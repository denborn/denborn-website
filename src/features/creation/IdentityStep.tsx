import type { DataPack, StatId } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { tidyNickname } from '../../game-rules/nickname'
import type { CampaignRules } from '../../shared/schema/rules'
import { OptionButton, Slot, TextField } from '../../ui'
import type { CreationDraft, DraftChoice, IdentityProblems } from './draft'

export interface IdentityStepProps {
  pack: DataPack
  rules: CampaignRules
  draft: CreationDraft
  problems: IdentityProblems
  language: Language
  text: Messages['creation']['identity']
  onChoose: (choice: DraftChoice) => void
}

/** The five stats a nature can raise or lower, in the games' order. */
const NATURE_STATS: StatId[] = ['atk', 'def', 'spa', 'spd', 'spe']
/** Where the games' table puts each nature that changes nothing: on the diagonal, one per stat. */
const NEUTRAL_AT: Partial<Record<StatId, string>> = { atk: 'hardy', def: 'docile', spa: 'bashful', spd: 'quirky', spe: 'serious' }

/** The name, the gender, the nature and the Ability of the Pokémon chosen. */
export function IdentityStep({ pack, rules, draft, problems, language, text, onChoose }: IdentityStepProps) {
  const species = draft.species ? pack.species[draft.species] : undefined
  if (!species) return null
  // Nothing is called wrong before the player has typed anything.
  const nameProblem = draft.nickname === '' ? undefined : problems.nickname
  const natures = Object.values(pack.natures)
  const short = (stat: StatId): string => pack.statNames[stat][language]
  return (
    <div className="dn-stack">
      <TextField
        label={text.nickname}
        value={draft.nickname}
        onChange={(nickname) => onChoose({ choose: 'nickname', nickname })}
        onBlur={() => onChoose({ choose: 'nickname', nickname: tidyNickname(draft.nickname) })}
        placeholder={species.name[language]}
        hint={nameProblem ? text.nicknameProblem[nameProblem] : text.nicknameHint}
        invalid={nameProblem !== undefined}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="done"
      />

      <div role="group" aria-label={text.gender} className="dn-entry">
        <span className="dn-label">{text.gender}</span>
        <div className="dn-row">
          {species.genders.map((gender) => (
            <OptionButton key={gender} selected={draft.gender === gender} onClick={() => onChoose({ choose: 'gender', gender })}>
              {text.genders[gender]}
              {species.genderRatio && gender !== 'N' && ` ${text.share(Math.round(species.genderRatio[gender] * 1000) / 10)}`}
            </OptionButton>
          ))}
        </div>
      </div>

      <div role="group" aria-label={text.nature} className="dn-entry">
        <span className="dn-label">{text.nature}</span>
        {rules.natures === 'neutral' ? (
          <p className="dn-note">{text.natureNeutral}</p>
        ) : (
          <>
            <p className="dn-note">{text.natureHint}</p>
            <div className="dn-table dn-table--natures">
              <span className="dn-table__head" aria-hidden="true">
                {text.raises} ↓
                <br />
                {text.lowers} →
              </span>
              {NATURE_STATS.map((stat) => (
                <span key={`lowers-${stat}`} className="dn-table__head" aria-hidden="true">
                  {short(stat)}
                </span>
              ))}
              {NATURE_STATS.map((raised) => [
                <span key={`raises-${raised}`} className="dn-table__head" aria-hidden="true">
                  {short(raised)}
                </span>,
                ...NATURE_STATS.map((lowered) => {
                  // On the diagonal a nature raises and lowers nothing.
                  const nature = raised === lowered ? pack.natures[NEUTRAL_AT[raised] ?? ''] : natures.find((entry) => entry.plus === raised && entry.minus === lowered)
                  if (!nature) return <span key={`${raised}-${lowered}`} />
                  const label = raised === lowered ? text.natureLabelNeutral(nature.name[language]) : text.natureLabel(nature.name[language], short(raised), short(lowered))
                  return (
                    <button
                      key={`${raised}-${lowered}`}
                      type="button"
                      className="dn-cell"
                      aria-pressed={draft.nature === nature.id}
                      aria-label={label}
                      onClick={() => onChoose({ choose: 'nature', nature: nature.id })}
                    >
                      {nature.name[language]}
                    </button>
                  )
                }),
              ])}
            </div>
          </>
        )}
      </div>

      <div role="group" aria-label={text.ability} className="dn-entry">
        <span className="dn-label">{text.ability}</span>
        {species.abilities.map((id) => {
          const ability = pack.abilities[id]
          if (!ability) return null
          return (
            <Slot key={id} selected={draft.ability === id} onClick={() => onChoose({ choose: 'ability', ability: id })}>
              <span className="dn-slot__text">
                <span className="dn-text-shadow">
                  {ability.name[language]}
                  {species.hiddenAbility === id && <span className="dn-slot__tag"> {text.hidden}</span>}
                </span>
                <span className="dn-note">{ability.description[language]}</span>
              </span>
            </Slot>
          )
        })}
      </div>
    </div>
  )
}
