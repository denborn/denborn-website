import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules, ItemPack } from '../../shared/schema/rules'
import { ItemIconImage, ScrollingText } from '../../ui'
import { DexIcon, DexKey, DexLamp, DexPage, Tray, Wheel, type WheelSize } from '../../ui/dex'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import type { StepChrome } from './Creation'
import { type About, FilterWheel } from './FilterWheel'
import type { CreationDraft, DraftChoice } from './draft'

export interface ItemsStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  rules: CampaignRules
  draft: CreationDraft
  onChoose: (choice: DraftChoice) => void
}

/** The Pokémon's wheel, to the pixel: the same drum in the same place, on the right (decisions 297 and 308). */
const PACKS: WheelSize = { height: 142, row: 26 }
/** How many of a pack's items show beside the wheel before the rest is a count. */
const SHOWN = 8

/**
 * The item pack the character starts with (decision 294): the campaign's
 * packs on a wheel on the right, as every wheel of creation is (decision
 * 308), what the one in the middle holds beside it. INSPECT says what each
 * item does, and is where one of them is given to the Pokémon to hold; SELECT
 * takes the pack.
 */
export function ItemsStep({ pack, language, messages, chrome, rules, draft, onChoose }: ItemsStepProps) {
  const text = messages.creation
  const words = text.dex.items
  const still = usePrefersReducedMotion()
  const packs = rules.itemPacks.map((itemPack, index) => ({ id: String(index), name: itemPack.name, itemPack, index }))
  const [looked, setLooked] = useState(draft.pack === undefined ? undefined : String(draft.pack))
  const [inspecting, setInspecting] = useState(false)
  const at = packs.find((one) => one.id === looked) ?? packs[0]
  const isChosen = at !== undefined && draft.pack === at.index
  const held = isChosen && draft.heldItem ? pack.items[draft.heldItem] : undefined

  const stacks = (itemPack: ItemPack) => itemPack.items.flatMap((stack) => (pack.items[stack.item] ? [{ id: stack.item, name: pack.items[stack.item]?.name[language] ?? stack.item, quantity: stack.quantity }] : []))
  const contents = at ? stacks(at.itemPack) : []
  const isHeld = (id: string): boolean => isChosen && draft.heldItem === id

  /** The item in the middle is given to hold, or put back: holding one of a pack takes the pack. */
  const hold = (id: string): void => {
    if (!at) return
    if (!isChosen) onChoose({ choose: 'pack', pack: at.index })
    onChoose({ choose: 'held', item: isHeld(id) ? undefined : id })
  }
  const aboutItem = (id: string): About | undefined => {
    const data = pack.items[id]
    if (!data) return undefined
    const said = isHeld(id) ? words.holding : data.holdable ? undefined : words.cannotHold
    return { lead: said && <p className="dn-dex-move-about__facts">{said}</p>, text: data.description[language] }
  }

  return (
    <>
      <DexPage
        title={text.items.title}
        steps={chrome.steps}
        covered={inspecting}
        foot={
          <>
            <DexKey disabled={!at || contents.length === 0} onClick={() => setInspecting(true)}>
              {words.inspect}
            </DexKey>
            {/* Between INSPECT and NEXT: a plain key (decision 303). */}
            <DexKey shape="square" on={isChosen} disabled={!at} onClick={() => at && onChoose({ choose: 'pack', pack: at.index })}>
              {words.select}
            </DexKey>
            {chrome.next}
          </>
        }
      >
        <div className="dn-dex-packs">
          <Wheel
            label={words.list}
            items={packs}
            centred={at?.id}
            onCentre={setLooked}
            onPick={(id) => onChoose({ choose: 'pack', pack: Number(id) })}
            size={PACKS}
            empty={text.items.nothing}
            row={(one, lit) => (
              <span className={`dn-dex-bar dn-dex-row${lit ? ' dn-dex-bar--lit' : ''}`}>
                <DexLamp on={one.index === draft.pack} />
                {/* A name too long for its row goes by, on the row in the middle. */}
                <span className="dn-dex-bar__name">{lit ? <ScrollingText text={one.name} still={still} /> : one.name}</span>
              </span>
            )}
          />
        </div>
        <div className="dn-dex-pack" aria-live="polite">
          <p className="dn-dex-pack__money">{text.review.money(rules.startingMoney)}</p>
          <ul className="dn-dex-pack__items">
            {contents.length === 0 && <li>{text.items.nothing}</li>}
            {contents.slice(0, SHOWN).map((stack) => {
              const data = pack.items[stack.id]
              return (
                <li key={stack.id}>
                  {data && <ItemIconImage icon={data.icon} scale={0.5} />}
                  <span className="dn-dex-pack__name">{stack.name}</span>
                  <span>×{stack.quantity}</span>
                </li>
              )
            })}
            {contents.length > SHOWN && <li>{words.more(contents.length - SHOWN)}</li>}
          </ul>
          <p className="dn-dex-pack__held">
            {text.items.held}: {held ? held.name[language] : text.dex.none}
          </p>
        </div>
      </DexPage>

      <Tray open={inspecting} title={at?.name ?? text.items.title} closeLabel={text.dex.close} onClose={() => setInspecting(false)}>
        {inspecting && (
          <FilterWheel
            label={at?.name ?? text.items.title}
            none={text.items.nothing}
            options={contents}
            start={isChosen ? draft.heldItem : undefined}
            isKept={isHeld}
            about={aboutItem}
            still={still}
            row={(stack, lit) => {
              const data = pack.items[stack.id]
              return (
                <span className={`dn-dex-bar dn-dex-row${lit ? ' dn-dex-bar--lit' : ''}`}>
                  <DexIcon>{data && <ItemIconImage icon={data.icon} scale={0.75} />}</DexIcon>
                  <DexLamp on={isHeld(stack.id)} />
                  <span className="dn-dex-bar__name">{stack.name}</span>
                  <span className="dn-dex-bar__end">×{stack.quantity}</span>
                </span>
              )
            }}
            keys={(id) => (
              <>
                <DexKey shape="square" on={(id !== undefined && isHeld(id)) || undefined} disabled={id === undefined || !pack.items[id]?.holdable} onClick={() => id !== undefined && hold(id)}>
                  {id !== undefined && isHeld(id) ? words.putBack : words.hold}
                </DexKey>
                <DexKey shape="go" onClick={() => setInspecting(false)}>
                  {text.dex.ok}
                </DexKey>
              </>
            )}
          />
        )}
      </Tray>
    </>
  )
}
