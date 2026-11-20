import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { ItemIconImage, TypeLabel } from '../../ui'
import { DexKey, DexPage } from '../../ui/dex'
import type { StepChrome } from './Creation'
import { type CreationDraft, MOVES_MAX, startingBag } from './draft'

export interface ReviewStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  rules: CampaignRules
  draft: CreationDraft
  /** The character can be made: every rule of creation is passed. */
  ready: boolean
  onCreate: () => void
}

/** How many stacks of the Bag show before the rest is a count. */
const SHOWN = 7

/**
 * A last look (decision 295): what the top screen does not show, the moves
 * and what it starts with, before the character is made.
 */
export function ReviewStep({ pack, language, messages, chrome, rules, draft, ready, onCreate }: ReviewStepProps) {
  const text = messages.creation
  const itemPack = draft.pack === undefined ? undefined : rules.itemPacks[draft.pack]
  const bag = itemPack ? startingBag(itemPack, draft.heldItem) : []
  return (
    <DexPage
      title={text.review.title}
      steps={chrome.steps}
      foot={
        <>
          <p className={`dn-dex-foot__said${ready ? '' : ' dn-dex-foot__said--problem'}`} role={ready ? undefined : 'alert'}>
            {ready ? '' : text.review.notReady}
          </p>
          <DexKey shape="go" disabled={!ready} onClick={onCreate}>
            {text.review.create}
          </DexKey>
        </>
      }
    >
      <div className="dn-dex-review">
        <h3 className="dn-dex-review__title">{text.review.moves}</h3>
        <ol className="dn-dex-review__moves">
          {Array.from({ length: MOVES_MAX }, (_, place) => {
            const move = pack.moves[draft.moves[place] ?? '']
            return (
              <li key={place} className={`dn-dex-bar${move ? '' : ' dn-dex-bar--empty'}`}>
                {move ? (
                  <>
                    <TypeLabel type={move.type} text={pack.types[move.type.toLowerCase()]?.name[language] ?? move.type} />
                    <span className="dn-dex-bar__name">{move.name[language]}</span>
                    <span className="dn-dex-bar__end">{text.moves.pp(move.pp)}</span>
                  </>
                ) : (
                  <span className="dn-dex-bar__name">{text.dex.none}</span>
                )}
              </li>
            )
          })}
        </ol>
        <h3 className="dn-dex-review__title">
          {itemPack?.name ?? text.items.title} · {text.review.money(rules.startingMoney)}
        </h3>
        <ul className="dn-dex-pack__items dn-dex-review__bag">
          {bag.length === 0 && <li>{text.items.nothing}</li>}
          {bag.slice(0, SHOWN).map((stack) => {
            const item = pack.items[stack.item]
            return (
              <li key={stack.item}>
                {item && <ItemIconImage icon={item.icon} scale={0.5} />}
                <span className="dn-dex-pack__name">{item?.name[language] ?? stack.item}</span>
                <span>×{stack.quantity}</span>
              </li>
            )
          })}
          {bag.length > SHOWN && <li>{text.dex.items.more(bag.length - SHOWN)}</li>}
        </ul>
      </div>
    </DexPage>
  )
}
