import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { RulesProblem } from '../../domain/rules-check'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { ItemPack } from '../../shared/schema/rules'
import { OptionButton, Slot, TextField } from '../../ui'
import { StacksEditor } from './StacksEditor'

export interface PacksRuleProps {
  pack: DataPack
  itemPacks: readonly ItemPack[]
  /** What is wrong with the rules as they stand: a pack without a name, two packs with one name. */
  problems: readonly RulesProblem[]
  onChange: (itemPacks: ItemPack[]) => void
  language: Language
  text: Messages['campaigns']
}

/** The saved format's limits: a name's length, the kinds of item in a pack, the packs of a campaign. */
const NAME_MAX = 40
const ITEMS_MAX = 100
const PACKS_MAX = 50

/** The item packs of a campaign: their list, and one of them open to be filled. */
export function PacksRule({ pack, itemPacks, problems, onChange, language, text }: PacksRuleProps) {
  const [open, setOpen] = useState<number>()
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
      <StacksEditor pack={pack} stacks={current.items} onChange={(items) => change(open, { ...current, items })} most={ITEMS_MAX} language={language} text={text} />
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
