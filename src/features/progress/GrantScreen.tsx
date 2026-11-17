import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { MONEY_MAX } from '../../domain/after-fight'
import { STACKS_MAX, countOf } from '../../domain/bag'
import type { Grant } from '../../domain/grants'
import { sheetNumbers } from '../../domain/sheet'
import { MAX_LEVEL, expForLevel, levelForExp } from '../../game-rules/exp'
import { useLanguage, useMessages } from '../../i18n'
import { GRANTED_ITEMS_MAX } from '../../shared/protocol/session'
import type { CharacterDocument } from '../../shared/schema/character'
import type { ItemStack } from '../../shared/schema/common'
import { wholeTyped } from '../../shared/text/plain'
import { DualScreen, OptionButton, Screen, StepHeader, TextField } from '../../ui'
import { StacksEditor } from '../campaigns/StacksEditor'
import { Portrait } from '../sheet/Portrait'

export interface GrantScreenProps {
  pack: DataPack
  /** The character given to or taken from, as the party has it. */
  character: CharacterDocument
  /** Gives and takes at once; gives back why nothing was done, when nothing was. */
  onGrant: (grant: Grant) => string | undefined
  /** Back to the session, once given or with nothing changed. */
  onDone: (granted: boolean) => void
}

/** What changed between the Bag the character has and the Bag as the game master set it: above 0 given, below 0 taken. */
function bagChanges(before: readonly ItemStack[], after: readonly ItemStack[]): { item: string; quantity: number }[] {
  const items = [...new Set([...before, ...after].map((stack) => stack.item))]
  return items.map((item) => ({ item, quantity: countOf(after, item) - countOf(before, item) })).filter(({ quantity }) => quantity !== 0)
}

/**
 * What the game master gives a character or takes from it by hand (decisions
 * 5 and 170): EXP, which is only ever added; its Pokédollars and its Bag, set
 * to what they should be. Nothing changes before CONFIRM; the character's
 * player is then told what was given and what was taken.
 */
export function GrantScreen({ pack, character, onGrant, onDone }: GrantScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress.gm
  const [exp, setExp] = useState('0')
  const [money, setMoney] = useState(String(character.money))
  const [bag, setBag] = useState<ItemStack[]>(() => [...character.bag])
  const [refused, setRefused] = useState<string>()
  const numbers = sheetNumbers(character, pack)
  const title = text.title(character.nickname)

  const given = wholeTyped(exp)
  const purse = wholeTyped(money)
  const purseOk = purse !== undefined && purse <= MONEY_MAX
  const items = bagChanges(character.bag, bag)
  const reached = given === undefined ? character.level : Math.max(character.level, levelForExp(Math.min(expForLevel(MAX_LEVEL), character.exp + given)))
  const tooMany = items.length > GRANTED_ITEMS_MAX
  const changes = given !== undefined && purseOk && (given > 0 || purse !== character.money || items.length > 0)

  return (
    <DualScreen>
      <Screen kind="scene" label={character.nickname}>
        {numbers && <Portrait pack={pack} character={character} numbers={numbers} language={language} messages={messages} />}
      </Screen>
      <Screen kind="menu" label={title} scrolls>
        <StepHeader title={title} />
        <div className="dn-stack">
          <p className="dn-note">{text.hint}</p>
          {refused !== undefined && (
            <p className="dn-note dn-note--error" role="alert">
              {refused === 'fight-on' || refused === 'bag-full' ? text.refused[refused] : text.refused.other}
            </p>
          )}
          <TextField
            label={text.exp}
            value={exp}
            onChange={setExp}
            inputMode="numeric"
            autoComplete="off"
            invalid={given === undefined}
            {...(given === undefined ? { hint: text.notWhole } : reached > character.level ? { hint: text.levelUp(reached) } : {})}
          />
          <TextField
            label={text.money}
            value={money}
            onChange={setMoney}
            inputMode="numeric"
            autoComplete="off"
            invalid={!purseOk}
            hint={!purseOk ? text.moneyMost(MONEY_MAX) : purse === character.money ? text.moneyNow(character.money) : `${text.moneyNow(character.money)} ${text.moneyChange(purse - character.money)}`}
          />
          <div role="group" aria-label={text.bag} className="dn-entry">
            <span className="dn-label">{text.bag}</span>
            {bag.length === 0 && <p className="dn-note">{messages.sheet.emptyBag}</p>}
            <StacksEditor pack={pack} stacks={bag} onChange={setBag} most={STACKS_MAX} language={language} text={messages.campaigns} />
          </div>
          {tooMany && (
            <p className="dn-note dn-note--error" role="status">
              {text.tooMany(GRANTED_ITEMS_MAX)}
            </p>
          )}
        </div>
        <div className="dn-foot">
          <OptionButton onClick={() => onDone(false)}>{messages.nav.back}</OptionButton>
          <OptionButton
            primary
            disabled={!changes || tooMany}
            onClick={() => {
              if (given === undefined || purse === undefined) return
              const problem = onGrant({ exp: given, money: purse - character.money, items })
              setRefused(problem)
              if (problem === undefined) onDone(true)
            }}
          >
            {text.confirm}
          </OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
