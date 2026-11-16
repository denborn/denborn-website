import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { RewardDefaults } from '../../domain/rewards'
import { MAX_LEVEL, expForLevel, levelForExp } from '../../game-rules/exp'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import { wholeTyped } from '../../shared/text/plain'
import { OptionButton, PokemonSprite, Screen, StepHeader, TextField } from '../../ui'

export interface RewardsScreenProps {
  pack: DataPack
  /** The encounter that ends, by its name. */
  encounter: string
  /** How the fight stands, in words: who won, or nothing while it is not over. */
  outcome?: string | undefined
  /** Every character of the party: each gets a line (decision 159). */
  party: readonly CharacterDocument[]
  /** What the app fills in: the enemies defeated, worked out for each character (decisions 130, 134 and 160). */
  defaults: RewardDefaults
  /** Ends the encounter and awards these amounts, by character. */
  onAward: (awards: Record<string, { exp: number; money: number }>) => void
  /** Back to the fight, which goes on. */
  onBack: () => void
}

/**
 * The end of an encounter, for the game master: what each character of the
 * party is awarded, filled in by the app and theirs to change, line by line
 * for the EXP and once for the Pokédollars (decision 4). Awarding ends the
 * encounter; everyone who fought is left as the fight left them.
 */
export function RewardsScreen({ pack, encounter, outcome, party, defaults, onAward, onBack }: RewardsScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.battle.console.rewards
  const [exp, setExp] = useState<Record<string, string>>(() => Object.fromEntries(party.map((character) => [character.id, String(defaults.exp[character.id] ?? 0)])))
  const [money, setMoney] = useState(String(defaults.money))
  const amounts = party.map((character) => ({ character, exp: wholeTyped(exp[character.id] ?? '') }))
  const each = wholeTyped(money)
  const ready = each !== undefined && amounts.every((line) => line.exp !== undefined)

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.title(encounter)}>
          <div className="dn-lineup dn-lineup--party">
            {party.map((character) => {
              const species = pack.species[character.species]
              return species ? <PokemonSprite key={character.id} species={species} name={character.nickname} female={character.gender === 'F'} scale={0.5} decorative /> : null
            })}
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={text.title(encounter)} tall>
        <StepHeader title={text.title(encounter)} />
        <div className="dn-stack">
          {outcome && (
            <p className="dn-note" role="status">
              {outcome}
            </p>
          )}
          <p className="dn-note">{text.hint}</p>
          {amounts.map(({ character, exp: typed }) => {
            const reached = typed === undefined ? character.level : Math.max(character.level, levelForExp(Math.min(expForLevel(MAX_LEVEL), character.exp + typed)))
            return (
              <TextField
                key={character.id}
                label={text.exp(`${character.nickname} (${pack.species[character.species]?.name[language] ?? character.species}, ${messages.battle.level} ${character.level})`)}
                value={exp[character.id] ?? ''}
                onChange={(value) => setExp({ ...exp, [character.id]: value })}
                inputMode="numeric"
                autoComplete="off"
                invalid={typed === undefined}
                {...(typed === undefined ? { hint: text.notWhole } : reached > character.level ? { hint: text.levelUp(reached) } : {})}
              />
            )
          })}
          <TextField label={text.money} value={money} onChange={setMoney} inputMode="numeric" autoComplete="off" invalid={each === undefined} {...(each === undefined ? { hint: text.notWhole } : {})} />
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.battle.back}</OptionButton>
          <OptionButton
            primary
            disabled={!ready}
            onClick={() => {
              if (each === undefined) return
              onAward(Object.fromEntries(amounts.map((line) => [line.character.id, { exp: line.exp ?? 0, money: each }])))
            }}
          >
            {text.award}
          </OptionButton>
        </div>
      </Screen>
    </div>
  )
}
