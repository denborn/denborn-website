import { useMemo, useState } from 'react'
import type { DataPack, ItemData } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { ItemStack } from '../../shared/schema/common'
import { answers } from '../../shared/text/plain'
import { ItemIconImage, NumberField, OptionButton, Slot, TextField } from '../../ui'

export interface StacksEditorProps {
  pack: DataPack
  /** The items held, each with its quantity. */
  stacks: readonly ItemStack[]
  onChange: (stacks: ItemStack[]) => void
  /** Which items may be added; every item of the game data when left out. */
  offered?: (item: ItemData) => boolean
  /** The most kinds of item it may hold. */
  most: number
  language: Language
  text: Messages['campaigns']
}

/** The saved format's limit on the quantity of one item. */
const QUANTITY_MAX = 999
/** How many items a search lists at once. */
const FOUND_MAX = 20

/** Items with their quantities: each can be counted up or down or taken out, and others are found by name. Used for an item pack and for an encounter's Bag. */
export function StacksEditor({ pack, stacks, onChange, offered, most, language, text }: StacksEditorProps) {
  const [search, setSearch] = useState('')
  const items = useMemo(
    () =>
      Object.values(pack.items)
        .filter((item) => offered?.(item) ?? true)
        .sort((a, b) => a.name[language].localeCompare(b.name[language], language)),
    [pack, language, offered],
  )
  const held = stacks.map((stack) => stack.item)
  const found = search.trim() === '' ? [] : items.filter((item) => !held.includes(item.id) && answers(item.name[language], search))
  return (
    <>
      {stacks.map((stack) => {
        const name = pack.items[stack.item]?.name[language] ?? stack.item
        return (
          <div key={stack.item} className="dn-entry">
            <NumberField
              label={name}
              value={stack.quantity}
              min={1}
              max={QUANTITY_MAX}
              onChange={(quantity) => onChange(stacks.map((other) => (other.item === stack.item ? { ...other, quantity } : other)))}
              lowerLabel={text.fewer(name)}
              raiseLabel={text.oneMore(name)}
            />
            <div className="dn-row">
              <OptionButton aria-label={`${text.takeOut}: ${name}`} onClick={() => onChange(stacks.filter((other) => other.item !== stack.item))}>
                {text.takeOut}
              </OptionButton>
            </div>
          </div>
        )
      })}
      {stacks.length < most && (
        <>
          <TextField label={text.itemSearch} value={search} onChange={setSearch} type="search" autoComplete="off" enterKeyHint="search" />
          {found.slice(0, FOUND_MAX).map((item) => (
            <Slot
              key={item.id}
              onClick={() => {
                onChange([...stacks, { item: item.id, quantity: 1 }])
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
    </>
  )
}
