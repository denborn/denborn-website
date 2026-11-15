import { useMemo, useState } from 'react'
import type { DataPack } from '../../data/types'
import type { RulesProblem } from '../../domain/rules-check'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { ItemPack } from '../../shared/schema/rules'
import { answers } from '../../shared/text/plain'
import { ItemIconImage, NumberField, OptionButton, Slot, TextField } from '../../ui'

export interface PacksRuleProps {
  pack: DataPack
  itemPacks: readonly ItemPack[]
  /** What is wrong with the rules as they stand: a pack without a name, two packs with one name. */
  problems: readonly RulesProblem[]
  onChange: (itemPacks: ItemPack[]) => void
  language: Language
  text: Messages['campaigns']
}

/** The saved format's limits: a name's length, the kinds of item in a pack, the packs of a campaign, the quantity of one item. */
const NAME_MAX = 40
const ITEMS_MAX = 100
const PACKS_MAX = 50
const QUANTITY_MAX = 999
/** How many items a search lists at once. */
const FOUND_MAX = 20

/** The item packs of a campaign: their list, and one of them open to be filled. */
export function PacksRule({ pack, itemPacks, problems, onChange, language, text }: PacksRuleProps) {
  const [open, setOpen] = useState<number>()
  const [search, setSearch] = useState('')
  const items = useMemo(() => Object.values(pack.items).sort((a, b) => a.name[language].localeCompare(b.name[language], language)), [pack, language])
  const current = open === undefined ? undefined : itemPacks[open]
  const change = (index: number, changed: ItemPack): void => onChange(itemPacks.map((itemPack, at) => (at === index ? changed : itemPack)))

  if (open === undefined || !current) {
    return (
      <div className="dn-stack">
        <p className="dn-note">{text.packsHint}</p>
        {itemPacks.map((itemPack, index) => (
          <Slot key={index} state={problems.some((problem) => 'pack' in problem && problem.pack === index) ? 'down' : 'normal'} onClick={() => setOpen(index)}>
            <span className="dn-slot__text">
              <span className="dn-text-shadow">{itemPack.name.trim() || text.toChoose}</span>
              <span className="dn-note">{text.pack(itemPack.items.length)}</span>
            </span>
          </Slot>
        ))}
        <div className="dn-row">
          <OptionButton
            primary
            disabled={itemPacks.length >= PACKS_MAX}
            onClick={() => {
              onChange([...itemPacks, { name: '', items: [] }])
              setOpen(itemPacks.length)
            }}
          >
            {text.addPack}
          </OptionButton>
        </div>
      </div>
    )
  }

  const nameProblem = problems.find((problem) => 'pack' in problem && problem.pack === open && (problem.kind === 'blank-pack-name' || problem.kind === 'repeated-pack-name'))
  const held = current.items.map((stack) => stack.item)
  const found = search.trim() === '' ? [] : items.filter((item) => !held.includes(item.id) && answers(item.name[language], search))
  return (
    <div className="dn-stack">
      <TextField
        label={text.packName}
        value={current.name}
        onChange={(name) => change(open, { ...current, name })}
        maxLength={NAME_MAX}
        autoComplete="off"
        invalid={nameProblem !== undefined}
        {...(nameProblem ? { hint: text.packProblem[nameProblem.kind === 'blank-pack-name' ? 'blank' : 'repeated'] } : {})}
      />
      {current.items.map((stack) => {
        const item = pack.items[stack.item]
        const name = item?.name[language] ?? stack.item
        return (
          <div key={stack.item} className="dn-entry">
            <NumberField
              label={name}
              value={stack.quantity}
              min={1}
              max={QUANTITY_MAX}
              onChange={(quantity) => change(open, { ...current, items: current.items.map((other) => (other.item === stack.item ? { ...other, quantity } : other)) })}
              lowerLabel={text.fewer(name)}
              raiseLabel={text.oneMore(name)}
            />
            <div className="dn-row">
              <OptionButton aria-label={`${text.takeOut}: ${name}`} onClick={() => change(open, { ...current, items: current.items.filter((other) => other.item !== stack.item) })}>
                {text.takeOut}
              </OptionButton>
            </div>
          </div>
        )
      })}
      {current.items.length < ITEMS_MAX && (
        <>
          <TextField label={text.itemSearch} value={search} onChange={setSearch} type="search" autoComplete="off" enterKeyHint="search" />
          {found.slice(0, FOUND_MAX).map((item) => (
            <Slot
              key={item.id}
              onClick={() => {
                change(open, { ...current, items: [...current.items, { item: item.id, quantity: 1 }] })
                setSearch('')
              }}
            >
              <span className="dn-slot__icon">
                <ItemIconImage icon={item.icon} />
              </span>
              <span className="dn-slot__text">
                <span className="dn-text-shadow">{item.name[language]}</span>
                <span className="dn-note">{item.description[language]}</span>
              </span>
            </Slot>
          ))}
          {found.length > FOUND_MAX && <p className="dn-note">{text.typeMore(found.length - FOUND_MAX)}</p>}
        </>
      )}
      <div className="dn-row">
        <OptionButton onClick={() => setOpen(undefined)}>{text.backToPacks}</OptionButton>
        <OptionButton
          onClick={() => {
            onChange(itemPacks.filter((_, at) => at !== open))
            setOpen(undefined)
          }}
        >
          {text.removePack}
        </OptionButton>
      </div>
    </div>
  )
}
