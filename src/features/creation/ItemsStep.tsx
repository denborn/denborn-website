import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { ItemIconImage, OptionButton, Slot } from '../../ui'
import type { CreationDraft, DraftChoice } from './draft'

export interface ItemsStepProps {
  pack: DataPack
  rules: CampaignRules
  draft: CreationDraft
  language: Language
  text: Messages['creation']['items']
  onChoose: (choice: DraftChoice) => void
}

/** One of the campaign's item packs, and whether the Pokémon holds one item of it. */
export function ItemsStep({ pack, rules, draft, language, text, onChoose }: ItemsStepProps) {
  const chosen = draft.pack === undefined ? undefined : rules.itemPacks[draft.pack]
  const holdable = chosen?.items.filter((stack) => pack.items[stack.item]?.holdable) ?? []
  return (
    <div className="dn-stack">
      <p className="dn-note">{text.money(rules.startingMoney)}</p>
      {rules.itemPacks.map((itemPack, index) => (
        <Slot key={itemPack.name} selected={draft.pack === index} onClick={() => onChoose({ choose: 'pack', pack: index })}>
          <span className="dn-slot__text">
            <span className="dn-text-shadow">{itemPack.name}</span>
            <span className="dn-tags">
              {itemPack.items.length === 0 && <span>{text.nothing}</span>}
              {itemPack.items.map((stack) => {
                const item = pack.items[stack.item]
                return item ? (
                  <span key={stack.item}>
                    <ItemIconImage icon={item.icon} scale={0.5} />
                    {text.stack(item.name[language], stack.quantity)}
                  </span>
                ) : null
              })}
            </span>
          </span>
        </Slot>
      ))}
      {chosen && holdable.length > 0 && (
        <div role="group" aria-label={text.held} className="dn-entry">
          <span className="dn-label">{text.held}</span>
          <div className="dn-row">
            <OptionButton selected={draft.heldItem === undefined} onClick={() => onChoose({ choose: 'held', item: undefined })}>
              {text.none}
            </OptionButton>
            {holdable.map((stack) => (
              <OptionButton key={stack.item} selected={draft.heldItem === stack.item} onClick={() => onChoose({ choose: 'held', item: stack.item })}>
                {pack.items[stack.item]?.name[language]}
              </OptionButton>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
