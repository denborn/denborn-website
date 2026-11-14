import type { DataPack } from '../../data/types'
import type { CreationProblem } from '../../domain/character-check'
import { ATTRIBUTE_IDS } from '../../game-rules/attributes'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { Panel } from '../../ui'
import type { CreationDraft } from './draft'

export interface ReviewStepProps {
  pack: DataPack
  rules: CampaignRules
  draft: CreationDraft
  /** What the rules still find wrong; nothing to show when the list is empty. */
  problems: CreationProblem[] | undefined
  language: Language
  text: Messages['creation']
}

/** Everything chosen, on one page, before the character is made. Its stats are on the screen above. */
export function ReviewStep({ pack, rules, draft, problems, language, text }: ReviewStepProps) {
  const species = draft.species ? pack.species[draft.species] : undefined
  const itemPack = draft.pack === undefined ? undefined : rules.itemPacks[draft.pack]
  if (!species) return null
  const nature = rules.natures === 'chosen' && draft.nature ? pack.natures[draft.nature]?.name[language] : text.review.neutral
  const held = draft.heldItem ? pack.items[draft.heldItem]?.name[language] : text.items.none
  const bag = (itemPack?.items ?? [])
    .map((stack) => ({ ...stack, quantity: stack.item === draft.heldItem ? stack.quantity - 1 : stack.quantity }))
    .filter((stack) => stack.quantity > 0)
    .map((stack) => text.items.stack(pack.items[stack.item]?.name[language] ?? stack.item, stack.quantity))
  return (
    <div className="dn-stack">
      {(problems === undefined || problems.length > 0) && (
        <Panel>
          <p className="dn-note dn-note--error" role="alert">
            {text.review.notReady}
          </p>
          {/* For whoever has to find out why: the rules' own names for what is wrong. */}
          {problems && <p className="dn-note">{problems.map((problem) => problem.kind).join(', ')}</p>}
        </Panel>
      )}
      <dl className="dn-facts">
        <dt>{text.identity.nickname}</dt>
        <dd>{draft.nickname.trim()}</dd>
        <dt>{text.review.species}</dt>
        <dd>{species.name[language]}</dd>
        <dt>{text.identity.gender}</dt>
        <dd>{draft.gender ? text.identity.genders[draft.gender] : ''}</dd>
        <dt>{text.review.nature}</dt>
        <dd>{nature}</dd>
        <dt>{text.identity.ability}</dt>
        <dd>{draft.ability ? pack.abilities[draft.ability]?.name[language] : ''}</dd>
      </dl>
      <span className="dn-label">{text.attributes.title}</span>
      <dl className="dn-facts">
        {ATTRIBUTE_IDS.flatMap((attribute) => [<dt key={`${attribute}-name`}>{text.attributes.names[attribute]}</dt>, <dd key={attribute}>{draft.attributes[attribute]}</dd>])}
      </dl>
      <span className="dn-label">{text.review.moves}</span>
      <dl className="dn-facts">
        {draft.moves.flatMap((id) => {
          const move = pack.moves[id]
          return move ? [<dt key={`${id}-name`}>{move.name[language]}</dt>, <dd key={id}>{text.moves.pp(move.pp)}</dd>] : []
        })}
      </dl>
      <span className="dn-label">{itemPack?.name}</span>
      <dl className="dn-facts">
        <dt>{text.review.holds}</dt>
        <dd>{held}</dd>
        <dt>{text.review.bag}</dt>
        <dd>{bag.length > 0 ? bag.join(', ') : text.items.nothing}</dd>
        <dt />
        <dd>{text.review.money(rules.startingMoney)}</dd>
      </dl>
    </div>
  )
}
