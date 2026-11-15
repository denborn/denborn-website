import { useMemo, useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { NumberField, OptionButton, PokemonIcon, Slot, TextField, TypeLabel } from '../../ui'
import { NO_FILTER, type SpeciesFilter, speciesShown, statTotalOf, statTotalRange, ticked, unticked } from './species-filters'

export interface SpeciesRuleProps {
  pack: DataPack
  /** The species players may create, in Pokédex order. */
  chosen: readonly string[]
  onChange: (chosen: string[]) => void
  language: Language
  text: Messages['campaigns']['species']
}

const STAGES = ['any', 'first', 'final'] as const
const LEGENDARIES = ['any', 'only', 'without'] as const
const TOTAL_SIDES = ['atMost', 'atLeast'] as const

/**
 * The species players may create: each Pokémon is ticked or not. The filters
 * narrow what is shown, and two buttons tick or untick everything shown
 * (decision 112).
 */
export function SpeciesRule({ pack, chosen, onChange, language, text }: SpeciesRuleProps) {
  const [filter, setFilter] = useState<SpeciesFilter>(NO_FILTER)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const range = useMemo(() => statTotalRange(pack), [pack])
  const types = useMemo(() => Object.values(pack.types).sort((a, b) => a.name[language].localeCompare(b.name[language], language)), [pack, language])
  const shown = speciesShown(pack, filter, language)
  const shownIds = shown.map((species) => species.id)
  const set = (changes: Partial<SpeciesFilter>): void => setFilter({ ...filter, ...changes })

  return (
    <div className="dn-stack">
      <TextField label={text.search} value={filter.search} onChange={(search) => set({ search })} type="search" autoComplete="off" enterKeyHint="search" />
      <div className="dn-row">
        <OptionButton selected={filtersOpen} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
          {text.filters}
        </OptionButton>
      </div>
      {filtersOpen && (
        <>
          <div role="group" aria-label={text.stage} className="dn-entry">
            <span className="dn-label">{text.stage}</span>
            <div className="dn-row">
              {STAGES.map((stage) => (
                <OptionButton key={stage} selected={filter.stage === stage} onClick={() => set({ stage })}>
                  {text.stages[stage]}
                </OptionButton>
              ))}
            </div>
          </div>
          <div role="group" aria-label={text.legendary} className="dn-entry">
            <span className="dn-label">{text.legendary}</span>
            <div className="dn-row">
              {LEGENDARIES.map((legendary) => (
                <OptionButton key={legendary} selected={filter.legendary === legendary} onClick={() => set({ legendary })}>
                  {text.legendaries[legendary]}
                </OptionButton>
              ))}
            </div>
          </div>
          <div role="group" aria-label={text.total} className="dn-entry">
            <span className="dn-label">{text.total}</span>
            <div className="dn-row">
              <OptionButton selected={!filter.statTotal} onClick={() => set({ statTotal: undefined })}>
                {text.totals.any}
              </OptionButton>
              {TOTAL_SIDES.map((side) => (
                // Starts where it leaves every Pokémon in: the highest total for "at most", the lowest for "at least".
                <OptionButton key={side} selected={filter.statTotal?.side === side} onClick={() => set({ statTotal: { side, total: filter.statTotal?.total ?? (side === 'atMost' ? range.max : range.min) } })}>
                  {text.totals[side]}
                </OptionButton>
              ))}
            </div>
            {filter.statTotal && (
              <NumberField
                label={text.totals[filter.statTotal.side]}
                value={filter.statTotal.total}
                min={range.min}
                max={range.max}
                onChange={(total) => set({ statTotal: { side: filter.statTotal?.side ?? 'atMost', total } })}
                lowerLabel={text.lowerTotal}
                raiseLabel={text.raiseTotal}
              />
            )}
          </div>
          <div role="group" aria-label={text.type} className="dn-entry">
            <span className="dn-label">{text.type}</span>
            <div className="dn-row">
              <OptionButton selected={filter.type === undefined} onClick={() => set({ type: undefined })}>
                {text.anyType}
              </OptionButton>
              {types.map((type) => (
                <OptionButton key={type.id} selected={filter.type === type.id} onClick={() => set({ type: type.id })}>
                  {type.name[language].toUpperCase()}
                </OptionButton>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="dn-note" role="status">
        {text.count(chosen.length, Object.keys(pack.species).length, shown.length)}
      </p>
      <div className="dn-row">
        <OptionButton disabled={shown.length === 0} onClick={() => onChange(ticked(chosen, shownIds, pack))}>
          {text.tickShown}
        </OptionButton>
        <OptionButton disabled={shown.length === 0} onClick={() => onChange(unticked(chosen, shownIds))}>
          {text.untickShown}
        </OptionButton>
      </div>
      {shown.length === 0 && <p className="dn-note">{text.noneShown}</p>}
      {shown.map((species) => {
        const isChosen = chosen.includes(species.id)
        return (
          <Slot key={species.id} selected={isChosen} state={isChosen ? 'ok' : 'normal'} onClick={() => onChange(isChosen ? unticked(chosen, [species.id]) : ticked(chosen, [species.id], pack))}>
            <PokemonIcon num={species.num} />
            <span className="dn-slot__text">
              <span className="dn-slot__line">
                <span className="dn-slot__main dn-text-shadow">{species.name[language]}</span>
                <span className="dn-slot__side">
                  {species.types.map((type) => (
                    <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[language] ?? type} />
                  ))}
                </span>
              </span>
              <span className="dn-note">{text.statTotal(statTotalOf(species))}</span>
            </span>
          </Slot>
        )
      })}
    </div>
  )
}
