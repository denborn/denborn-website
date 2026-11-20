import { useMemo, useState } from 'react'
import type { DataPack } from '../../data/types'
import { NO_FILTER, type SpeciesFilter, abilitiesOffered, generationsOffered, movesLearnable, speciesOffered } from '../../domain/species-search'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { PokemonIcon, PokemonSprite, TextField, TypeLabel } from '../../ui'
import { DexIcon, DexKey, DexLamp, DexPage, Tray, Wheel, type WheelSize } from '../../ui/dex'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import type { StepChrome } from './Creation'
import { ANY, type About, FilterWheel } from './FilterWheel'
import { MovePicker } from './MovePicker'
import { MOVES_MAX } from './draft'
import type { CreationDraft } from './draft'

export interface SpeciesStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  rules: CampaignRules
  draft: CreationDraft
  /** The Pokémon is chosen: the one in the middle of the wheel when the player goes on. */
  onChoose: (species: string) => void
}

const WHEEL: WheelSize = { height: 142, row: 26 }

/** What is over the screen: the name to search for, the filters, or one filter being set. */
type Over = 'search' | 'filters' | 'type' | 'generation' | 'stage' | 'move' | 'ability'

/** The stages of evolution a filter can keep: any is the filter off. */
const STAGES = ['any', 'first', 'final'] as const

/** Things of the game data by their names in a language, in the alphabet's order. */
function byName(names: Readonly<Record<string, { name: Record<Language, string> }>>, ids: readonly string[], language: Language): { id: string; name: string }[] {
  return ids.map((id) => ({ id, name: names[id]?.name[language] ?? id })).sort((a, b) => a.name.localeCompare(b.name, language))
}

/**
 * The Pokémon the character is (decision 290): the campaign's species on a
 * wheel in National Pokédex order, the one in the middle shown beside it. The
 * wheel only looks: the Pokémon is chosen by going on, since another Pokémon
 * has other moves and a turn of the wheel must not lose those chosen.
 */
export function SpeciesStep({ pack, language, messages, chrome, rules, draft, onChoose }: SpeciesStepProps) {
  const text = messages.creation
  const words = text.dex.species
  // The game master's words for the stages of evolution (decision 112): the same filter, on the player's side.
  const stageWords = messages.campaigns.species
  const still = usePrefersReducedMotion()
  const [filter, setFilter] = useState<SpeciesFilter>(NO_FILTER)
  const [looked, setLooked] = useState(draft.species)
  // The one whose picture is shown: the one the wheel last rested on, so that a turn of the wheel does not fetch a picture a row.
  const [rested, setRested] = useState(draft.species)
  const [over, setOver] = useState<Over>()
  const shown = speciesOffered(pack, rules, filter, language)
  const rows = shown.map((species) => ({ id: species.id, name: species.name[language], num: species.num }))
  const at = shown.find((species) => species.id === looked) ?? shown[0]
  const pictured = shown.find((species) => species.id === rested) ?? at

  // What the filters have to offer, by name: worked out once for a campaign's rules and a language.
  const learnable = useMemo(() => movesLearnable(pack, rules), [pack, rules])
  const abilities = useMemo(() => byName(pack.abilities, abilitiesOffered(pack, rules), language), [pack, rules, language])
  const generations = useMemo(() => generationsOffered(pack, rules), [pack, rules])
  const types = Object.values(pack.types)

  const typeName = (id: string): string => pack.types[id.toLowerCase()]?.name[language] ?? id
  const filtered = filter.type !== undefined || filter.generation !== undefined || filter.stage !== 'any' || filter.moves.length > 0 || filter.ability !== undefined
  const goOn = (id: string): void => {
    onChoose(id)
    chrome.onNext()
  }
  // What the Ability in the middle of its filter's wheel does (decision 301).
  const aboutAbility = (id: string): About | undefined => {
    const ability = pack.abilities[id]
    return ability && { text: ability.description[language] }
  }
  const set = (change: Partial<SpeciesFilter>): void => {
    setFilter({ ...filter, ...change })
    setOver('filters')
  }
  // Several moves, every one of which the Pokémon can choose, as many as it has places (decision 301).
  const kept = (move: string): boolean => filter.moves.includes(move)
  const toggle = (move: string): void => {
    if (kept(move)) setFilter({ ...filter, moves: filter.moves.filter((one) => one !== move) })
    else if (filter.moves.length < MOVES_MAX) setFilter({ ...filter, moves: [...filter.moves, move] })
  }
  const moveName = (id: string): string => pack.moves[id]?.name[language] ?? id
  const movesValue = filter.moves.length === 0 ? undefined : filter.moves.length === 1 && filter.moves[0] ? moveName(filter.moves[0]) : words.movesKept(filter.moves.length)
  const abilityValue = filter.ability === undefined ? undefined : (pack.abilities[filter.ability]?.name[language] ?? filter.ability)

  return (
    <>
      <DexPage
        title={text.species.title}
        steps={chrome.steps}
        covered={over !== undefined}
        foot={
          <>
            <DexKey on={filter.search.trim() !== '' || undefined} onClick={() => setOver('search')}>
              {words.searchKey}
            </DexKey>
            {/* A plain rectangle, beside SEARCH's point (decision 300). */}
            <DexKey shape="square" on={filtered || undefined} onClick={() => setOver('filters')}>
              {words.filterKey}
            </DexKey>
            <span className="dn-dex-foot__end">
              <DexKey shape="go" disabled={!at} onClick={() => at && goOn(at.id)}>
                {text.next}
              </DexKey>
            </span>
          </>
        }
      >
        <div className="dn-dex-showcase">
          <p className="dn-dex-showcase__name">{at ? `${words.number(at.num)} ${at.name[language]}` : text.dex.unknown}</p>
          <div className="dn-dex-slab dn-dex-showcase__stage">
            {/* Drawn anew for each Pokémon, so that it hops in: the one before is gone at once, as the games' Pokédex swaps its picture. */}
            {pictured && (
              <span key={pictured.id} className="dn-dex-showcase__sprite">
                <PokemonSprite species={pictured} name={pictured.name[language]} decorative />
              </span>
            )}
          </div>
          <p className="dn-dex-showcase__types">{at?.types.map((type) => <TypeLabel key={type} type={type} text={typeName(type)} />)}</p>
        </div>
        <div className="dn-dex-species">
          <Wheel
            label={words.list}
            items={rows}
            centred={at?.id}
            onCentre={setLooked}
            onRest={setRested}
            onPick={goOn}
            size={WHEEL}
            rail
            empty={filter.search.trim() !== '' && !filtered ? text.species.none : words.noneLeft}
            row={(species, lit) => (
              <span className={`dn-dex-bar dn-dex-row${lit ? ' dn-dex-bar--lit' : ''}`}>
                <DexIcon>
                  <PokemonIcon num={species.num} scale={0.75} />
                </DexIcon>
                <DexLamp on={species.id === draft.species} />
                <span className="dn-dex-bar__number">{String(species.num).padStart(3, '0')}</span>
                <span className="dn-dex-bar__name">{species.name}</span>
              </span>
            )}
          />
        </div>
      </DexPage>

      <Tray open={over === 'search'} title={text.species.search} closeLabel={text.dex.close} onClose={() => setOver(undefined)}>
        <form
          className="dn-tray__form"
          onSubmit={(event) => {
            event.preventDefault()
            setOver(undefined)
          }}
        >
          <TextField label={text.species.search} value={filter.search} onChange={(search) => setFilter({ ...filter, search })} hint={words.found(shown.length)} type="search" autoComplete="off" enterKeyHint="search" data-tray-first />
          <DexKey shape="go" onClick={() => setOver(undefined)}>
            {text.dex.ok}
          </DexKey>
        </form>
      </Tray>

      <Tray
        open={over !== undefined && over !== 'search'}
        title={over === 'type' ? words.type : over === 'generation' ? words.generation : over === 'stage' ? stageWords.stage : over === 'move' ? words.movesOf(filter.moves.length, MOVES_MAX) : over === 'ability' ? words.ability : words.filters}
        closeLabel={text.dex.close}
        onClose={() => setOver(over === 'filters' ? undefined : 'filters')}
        foot={
          over === 'filters' ? (
            <>
              <DexKey disabled={!filtered} onClick={() => setFilter({ ...NO_FILTER, search: filter.search })}>
                {words.clear}
              </DexKey>
              <p className="dn-dex-foot__said" role="status">
                {words.found(shown.length)}
              </p>
              <DexKey shape="go" onClick={() => setOver(undefined)}>
                {text.dex.ok}
              </DexKey>
            </>
          ) : undefined
        }
      >
        {over === 'filters' && (
          <div className="dn-dex-filters">
            {(
              [
                { view: 'type', label: words.type, value: filter.type === undefined ? undefined : typeName(filter.type) },
                { view: 'generation', label: words.generation, value: filter.generation === undefined ? undefined : words.generationOf(filter.generation) },
                { view: 'stage', label: stageWords.stage, value: filter.stage === 'any' ? undefined : stageWords.stages[filter.stage] },
                { view: 'move', label: words.move, value: movesValue },
                { view: 'ability', label: words.ability, value: abilityValue },
              ] as const
            ).map(({ view, label, value }) => (
              <button key={view} type="button" className={`dn-dex-bar${value === undefined ? '' : ' dn-dex-bar--lit'}`} onClick={() => setOver(view)}>
                <span className="dn-dex-bar__name">{label}</span>
                <span className="dn-dex-bar__end">{value ?? words.any}</span>
              </button>
            ))}
          </div>
        )}
        {over === 'type' && (
          <div className="dn-dex-types" role="group" aria-label={words.type}>
            <button type="button" className="dn-dex-chip" aria-pressed={filter.type === undefined} onClick={() => set({ type: undefined })}>
              {words.any}
            </button>
            {types.map((type) => (
              <button key={type.id} type="button" className="dn-dex-chip" aria-pressed={filter.type === type.id} aria-label={type.name[language]} onClick={() => set({ type: type.id })}>
                <TypeLabel type={type.id} text={type.name[language]} />
              </button>
            ))}
          </div>
        )}
        {over === 'generation' && (
          <div className="dn-dex-picks" role="group" aria-label={words.generation}>
            <button type="button" className="dn-dex-chip" aria-pressed={filter.generation === undefined} onClick={() => set({ generation: undefined })}>
              {words.any}
            </button>
            {generations.map((generation) => (
              <button key={generation} type="button" className="dn-dex-chip" aria-pressed={filter.generation === generation} onClick={() => set({ generation })}>
                {words.generationOf(generation)}
              </button>
            ))}
          </div>
        )}
        {over === 'stage' && (
          <div className="dn-dex-picks" role="group" aria-label={stageWords.stage}>
            {STAGES.map((stage) => (
              <button key={stage} type="button" className="dn-dex-chip" aria-pressed={filter.stage === stage} onClick={() => set({ stage })}>
                {stage === 'any' ? words.any : stageWords.stages[stage]}
              </button>
            ))}
          </div>
        )}
        {over === 'move' && (
          <MovePicker
            pack={pack}
            language={language}
            messages={messages}
            label={words.move}
            moves={learnable}
            start={filter.moves[0]}
            isMarked={kept}
            still={still}
            onPress={toggle}
            keys={(id) => (
              <>
                <span className="dn-dex-filter-wheel__pair">
                  {/* + adds the move in the middle, − takes it off. */}
                  <DexKey shape="square" disabled={id === undefined || (!kept(id) && filter.moves.length >= MOVES_MAX)} onClick={() => id !== undefined && toggle(id)}>
                    <span aria-hidden="true">{id !== undefined && kept(id) ? '−' : '+'}</span>
                    <span className="dn-visually-hidden">{id !== undefined && kept(id) ? words.dropMove(moveName(id)) : words.addMove(id === undefined ? '' : moveName(id))}</span>
                  </DexKey>
                  {/* NONE takes every move kept off (decision 303). */}
                  <DexKey shape="square" disabled={filter.moves.length === 0} onClick={() => setFilter({ ...filter, moves: [] })}>
                    {words.noMoves}
                    <span className="dn-visually-hidden"> ({words.noMovesSaid})</span>
                  </DexKey>
                </span>
                {/* The last key: the way back to the filters, its point at its right end (decision 303). */}
                <DexKey shape="go" onClick={() => setOver('filters')}>
                  {text.dex.ok}
                </DexKey>
              </>
            )}
          />
        )}
        {over === 'ability' && (
          <FilterWheel
            label={words.ability}
            none={words.noneLeft}
            options={[{ id: ANY, name: words.any }, ...abilities]}
            start={filter.ability ?? ANY}
            isKept={(id) => id === (filter.ability ?? ANY)}
            about={aboutAbility}
            still={still}
            onPress={(id) => set({ ability: id === ANY ? undefined : id })}
            keys={(id) => (
              // The only key, at the right end: a point there (decision 308).
              <DexKey shape="go" onClick={() => set({ ability: id === undefined || id === ANY ? undefined : id })}>
                {text.dex.ok}
              </DexKey>
            )}
          />
        )}
      </Tray>
    </>
  )
}
