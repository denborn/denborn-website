import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { PokemonIcon, Slot, TextField, TypeLabel } from '../../ui'
import type { CreationDraft } from './draft'

export interface SpeciesStepProps {
  pack: DataPack
  rules: CampaignRules
  draft: CreationDraft
  language: Language
  text: Messages['creation']['species']
  onChoose: (species: string) => void
}

/** Letters only, without accents or capitals: "Mélofée" is found by "melo". */
const plain = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** The Pokémon the campaign offers, in Pokédex order, with a field to find one by name. */
export function SpeciesStep({ pack, rules, draft, language, text, onChoose }: SpeciesStepProps) {
  const [search, setSearch] = useState('')
  const offered = rules.species
    .map((id) => pack.species[id])
    .filter((species) => species !== undefined)
    .sort((a, b) => a.num - b.num)
  const wanted = plain(search.trim())
  const shown = wanted ? offered.filter((species) => plain(species.name[language]).includes(wanted)) : offered
  return (
    <div className="dn-stack">
      <TextField label={text.search} value={search} onChange={setSearch} type="search" autoComplete="off" enterKeyHint="search" />
      {shown.length === 0 && <p className="dn-note">{text.none}</p>}
      {shown.map((species) => (
        <Slot key={species.id} selected={draft.species === species.id} onClick={() => onChoose(species.id)}>
          <PokemonIcon num={species.num} />
          <span className="dn-slot__main dn-text-shadow">{species.name[language]}</span>
          <span className="dn-slot__side">
            {species.types.map((type) => (
              <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[language] ?? type} />
            ))}
          </span>
        </Slot>
      ))}
    </div>
  )
}
