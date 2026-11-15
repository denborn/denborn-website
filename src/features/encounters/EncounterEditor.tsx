import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import { evBudget, ivBudget, spreadTotal } from '../../game-rules/budgets'
import { LINE_MAX } from '../../game-rules/party'
import { MOB_CLASSES, MOB_CLASS_BASE, moneyFor } from '../../game-rules/rewards'
import { type Language, useLanguage, useMessages } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { Encounter } from '../../shared/schema/encounter'
import type { CampaignRules } from '../../shared/schema/rules'
import { answers } from '../../shared/text/plain'
import type { WriteResult } from '../../storage/library'
import { ItemIconImage, NumberField, OptionButton, PokemonIcon, PokemonSprite, Screen, Slot, StepHeader, TextField } from '../../ui'
import { StacksEditor } from '../campaigns/StacksEditor'
import { IdentityStep } from '../creation/IdentityStep'
import { MovesStep } from '../creation/MovesStep'
import { Preview } from '../creation/Preview'
import { SpeciesStep } from '../creation/SpeciesStep'
import { TrainingStep } from '../creation/TrainingStep'
import { type CreationDraft, type DraftChoice, choose, identityProblems } from '../creation/draft'
import { type EncounterDraft, type EnemyDraft, type EnemyState, NEW_ENCOUNTER, draftOfEncounter, encounterOf, encounterState, enemyContext, hasChanges, moved, newEnemy } from './encounter-draft'

/** What of an enemy can be opened by itself. */
export const ENEMY_FIELDS = ['species', 'level', 'identity', 'training', 'moves', 'held', 'mobClass', 'atZero'] as const
export type EnemyField = (typeof ENEMY_FIELDS)[number]

/** Where the game master is in the encounter: its page, its name, its Bag, one enemy, or one thing of one enemy. */
export type EncounterView = { at: 'hub' } | { at: 'name' } | { at: 'bag' } | { at: 'enemy'; id: string; field?: EnemyField | undefined }

export interface EncounterEditorProps {
  pack: DataPack
  /** The campaign's rules in force: enemies are built under them. */
  rules: CampaignRules
  /** The encounter as the campaign keeps it; nothing for one not saved yet. */
  encounter: Encounter | undefined
  view: EncounterView
  onView: (view: EncounterView) => void
  newId: () => string
  /** Keeps the encounter in its campaign, or says why the device cannot. */
  onSave: (encounter: Encounter) => WriteResult
  /** Takes the encounter out of its campaign. */
  onRemove: () => void
  onBack: () => void
  /** Told whenever the page starts or stops holding changes not saved yet. */
  onUnsaved?: (unsaved: boolean) => void
  /** Given while the game master is leaving with changes not saved: the two answers to "leave without saving?". */
  leaving?: { stay: () => void; leave: () => void } | undefined
}

const NAME_MAX = 60
const LEVEL_MAX = 100
/** The letters of the places on a line, from the left. */
const PLACES = 'ABCDEF'
/** How many items a search lists at once. */
const FOUND_MAX = 20

/**
 * An encounter's page, laid out like a campaign's: its name, its enemies in
 * the order they stand, their Bag; a tap opens one of them alone. An enemy
 * is built with the very screens a character is created with, at its own
 * level, plus what only an enemy has: its class and what happens to it at 0
 * HP.
 */
export function EncounterEditor({ pack, rules, encounter, view, onView, newId, onSave, onRemove, onBack, onUnsaved, leaving }: EncounterEditorProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.encounters
  const [draft, setDraft] = useState<EncounterDraft>(() => (encounter ? draftOfEncounter(encounter) : NEW_ENCOUNTER))
  const [notKept, setNotKept] = useState<Extract<WriteResult, { ok: false }>['reason']>()
  const [removing, setRemoving] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const firstDraw = useRef(true)
  const state = encounterState(draft, rules, pack)
  const changed = hasChanges(draft, encounter)
  const opened = view.at === 'enemy' ? draft.enemies.find((enemy) => enemy.id === view.id) : undefined
  const place = opened ? draft.enemies.indexOf(opened) : -1
  const where = `${view.at}/${view.at === 'enemy' ? `${view.id}/${view.field ?? ''}` : ''}`

  // Moving between the encounter's page and one of its parts is a change of page: focus goes to its title, and the page starts from the top.
  useEffect(() => {
    if (firstDraw.current) {
      firstDraw.current = false
      return
    }
    heading.current?.focus()
    window.scrollTo(0, 0)
  }, [where])

  useEffect(() => {
    onUnsaved?.(changed)
  }, [changed, onUnsaved])

  const setEnemy = (id: string, changes: Partial<EnemyDraft>): void => setDraft({ ...draft, enemies: draft.enemies.map((enemy) => (enemy.id === id ? { ...enemy, ...changes } : enemy)) })

  const save = (): void => {
    const made = encounterOf(draft, encounter?.id ?? newId(), rules)
    if (!made) return
    const kept = onSave(made)
    setNotKept(kept.ok ? undefined : kept.reason)
  }

  const nameOf = (enemy: EnemyDraft): string => enemy.build.nickname.trim() || (enemy.build.species ? (pack.species[enemy.build.species]?.name[language] ?? enemy.build.species) : text.newEnemy)
  const title = view.at === 'name' ? text.name : view.at === 'bag' ? text.bag : opened ? (view.at === 'enemy' && view.field ? fieldTitle(view.field, text) : nameOf(opened)) : draft.name.trim() || text.newTitle

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={title}>
          {opened ? (
            <Preview pack={pack} draft={opened.build} level={opened.level} view={view.at === 'enemy' && view.field === 'species' ? 'base' : 'stats'} language={language} text={messages.creation} levelText={messages.battle.level} />
          ) : (
            <div className="dn-lineup dn-lineup--party">
              {draft.enemies.length === 0 && <p className="dn-note dn-text-outline">{text.enemiesHint}</p>}
              {draft.enemies.map((enemy) => {
                const species = enemy.build.species ? pack.species[enemy.build.species] : undefined
                return species ? <PokemonSprite key={enemy.id} species={species} name={nameOf(enemy)} female={enemy.build.gender === 'F'} scale={0.5} decorative /> : null
              })}
            </div>
          )}
        </Screen>
      </div>
      <Screen kind="menu" label={title} tall>
        <StepHeader title={title} headingRef={heading} />
        {leaving ? (
          <Question text={messages.campaigns.leave.question} stay={messages.campaigns.leave.stay} go={messages.campaigns.leave.leave} onStay={leaving.stay} onGo={leaving.leave} />
        ) : view.at === 'name' ? (
          <Part done={text.done} onDone={() => onView({ at: 'hub' })}>
            <TextField label={text.name} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} hint={text.nameHint} maxLength={NAME_MAX} autoComplete="off" enterKeyHint="done" />
          </Part>
        ) : view.at === 'bag' ? (
          <Part done={text.done} onDone={() => onView({ at: 'hub' })}>
            <p className="dn-note">{text.bagHint}</p>
            <StacksEditor pack={pack} stacks={draft.bag} onChange={(bag) => setDraft({ ...draft, bag })} offered={(item) => item.bag !== undefined} most={100} language={language} text={{ ...messages.campaigns, itemSearch: text.bagSearch }} />
          </Part>
        ) : opened && view.at === 'enemy' && view.field ? (
          <Part done={text.done} onDone={() => onView({ at: 'enemy', id: opened.id })}>
            <EnemyFieldScreen field={view.field} enemy={opened} pack={pack} rules={rules} language={language} messages={messages} onChange={(changes) => setEnemy(opened.id, changes)} />
          </Part>
        ) : opened ? (
          <Part done={text.done} onDone={() => onView({ at: 'hub' })}>
            <EnemyPage enemy={opened} state={state.enemies[place]} pack={pack} rules={rules} language={language} messages={messages} onOpen={(field) => onView({ at: 'enemy', id: opened.id, field })} />
            <span className="dn-label">{text.enemy.place(PLACES.charAt(place), draft.enemies.length)}</span>
            <div className="dn-row">
              <OptionButton disabled={place === 0} onClick={() => setDraft({ ...draft, enemies: moved(draft.enemies, opened.id, -1) })}>
                {text.enemy.moveLeft}
              </OptionButton>
              <OptionButton disabled={place === draft.enemies.length - 1} onClick={() => setDraft({ ...draft, enemies: moved(draft.enemies, opened.id, 1) })}>
                {text.enemy.moveRight}
              </OptionButton>
            </div>
            <div className="dn-row">
              <OptionButton
                onClick={() => {
                  setDraft({ ...draft, enemies: draft.enemies.filter((enemy) => enemy.id !== opened.id) })
                  onView({ at: 'hub' })
                }}
              >
                {text.enemy.remove}
              </OptionButton>
            </div>
          </Part>
        ) : removing ? (
          <Question text={text.removeQuestion} stay={text.removeNo} go={text.removeYes} onStay={() => setRemoving(false)} onGo={onRemove} />
        ) : (
          <>
            <div className="dn-stack">
              <Slot onClick={() => onView({ at: 'name' })}>
                <span className="dn-slot__main dn-text-shadow">{text.name}</span>
                <span className={state.gaps.includes('name') ? 'dn-slot__side dn-slot__tag' : 'dn-slot__side'}>{state.gaps.includes('name') ? text.toChoose : draft.name.trim()}</span>
              </Slot>

              <span className="dn-label">{text.enemies(draft.enemies.length, LINE_MAX)}</span>
              <p className="dn-note">{text.enemiesHint}</p>
              {draft.enemies.map((enemy, at) => {
                const own = state.enemies[at]
                const species = enemy.build.species ? pack.species[enemy.build.species] : undefined
                const pending = own && own.gaps.length > 0 ? text.toChoose : own && own.problems.length > 0 ? text.toFix : undefined
                return (
                  <Slot key={enemy.id} onClick={() => onView({ at: 'enemy', id: enemy.id })}>
                    {species && <PokemonIcon num={species.num} />}
                    <span className="dn-slot__text">
                      <span className="dn-text-shadow">
                        {PLACES.charAt(at)} · {nameOf(enemy)}
                      </span>
                      <span className="dn-note">{text.enemyLine(species?.name[language] ?? text.toChoose, enemy.level, text.enemy.classes[enemy.class])}</span>
                    </span>
                    {pending && <span className="dn-slot__side dn-slot__tag">{pending}</span>}
                  </Slot>
                )
              })}
              <div className="dn-row">
                <OptionButton
                  primary={draft.enemies.length === 0}
                  disabled={draft.enemies.length >= LINE_MAX}
                  onClick={() => {
                    const added = newEnemy(newId(), rules)
                    setDraft({ ...draft, enemies: [...draft.enemies, added] })
                    onView({ at: 'enemy', id: added.id })
                  }}
                >
                  {text.addEnemy}
                </OptionButton>
              </div>

              <Slot onClick={() => onView({ at: 'bag' })}>
                <span className="dn-slot__main dn-text-shadow">{text.bag}</span>
                <span className={state.problems.some((problem) => 'item' in problem) ? 'dn-slot__side dn-slot__tag' : 'dn-slot__side'}>
                  {state.problems.some((problem) => 'item' in problem) ? text.toFix : text.bagCount(draft.bag.length)}
                </span>
              </Slot>

              <p className="dn-note">{text.money(moneyFor(draft.enemies))}</p>
              <p className="dn-note">{text.expNote}</p>
              {changed && (
                <p className="dn-note" role="status">
                  {text.unsaved}
                </p>
              )}
              {notKept && (
                <p className="dn-note dn-note--error" role="alert">
                  {messages.saving[notKept]}
                </p>
              )}
              {encounter && !changed && (
                <div className="dn-row">
                  <OptionButton onClick={() => setRemoving(true)}>{text.remove}</OptionButton>
                </div>
              )}
            </div>
            <div className="dn-foot">
              <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
              <OptionButton primary disabled={!changed || !state.ready} onClick={save}>
                {text.save}
              </OptionButton>
            </div>
          </>
        )}
      </Screen>
    </div>
  )
}

function fieldTitle(field: EnemyField, text: Messages['encounters']): string {
  const titles: Record<EnemyField, string> = {
    species: text.enemy.species,
    level: text.enemy.level,
    identity: text.enemy.identity,
    training: text.enemy.training,
    moves: text.enemy.moves,
    held: text.enemy.held,
    mobClass: text.enemy.mobClass,
    atZero: text.enemy.atZero,
  }
  return titles[field]
}

/** One part of the encounter, opened by itself, with the way back. */
function Part({ done, onDone, children }: { done: string; onDone: () => void; children: ReactNode }) {
  return (
    <>
      <div className="dn-stack">{children}</div>
      <div className="dn-foot">
        <OptionButton primary onClick={onDone}>
          {done}
        </OptionButton>
      </div>
    </>
  )
}

/** A question asked before something is left or removed: the safe answer is the one put forward. */
function Question({ text, stay, go, onStay, onGo }: { text: string; stay: string; go: string; onStay: () => void; onGo: () => void }) {
  return (
    <>
      <div className="dn-stack">
        <p className="dn-note dn-note--error" role="alert">
          {text}
        </p>
      </div>
      <div className="dn-foot">
        <OptionButton primary onClick={onStay}>
          {stay}
        </OptionButton>
        <OptionButton onClick={onGo}>{go}</OptionButton>
      </div>
    </>
  )
}

interface EnemyPartProps {
  enemy: EnemyDraft
  pack: DataPack
  rules: CampaignRules
  language: Language
  messages: Messages
}

/** One enemy: a row for each thing to set, each saying its value or that it is still to choose or to fix. */
function EnemyPage({ enemy, state, pack, rules, language, messages, onOpen }: EnemyPartProps & { state: EnemyState | undefined; onOpen: (field: EnemyField) => void }) {
  const text = messages.encounters
  const { build } = enemy
  const gaps = state?.gaps ?? []
  const wrong = (kinds: readonly string[]): boolean => (state?.problems ?? []).some((problem) => kinds.includes(problem.kind))
  const identityGap = gaps.includes('gender') || gaps.includes('nature') || gaps.includes('ability')
  const species = build.species ? pack.species[build.species] : undefined
  const rows: { field: EnemyField; value: string; pending?: boolean }[] = [
    { field: 'species', value: species?.name[language] ?? text.toChoose, pending: !species },
    { field: 'level', value: String(enemy.level) },
    {
      field: 'identity',
      value: identityGap ? text.toChoose : wrong(['gender', 'ability', 'nickname', 'unknown-nature']) ? text.toFix : (build.ability ? (pack.abilities[build.ability]?.name[language] ?? build.ability) : ''),
      pending: identityGap || wrong(['gender', 'ability', 'nickname', 'unknown-nature']),
    },
    {
      field: 'training',
      value: wrong(['ivs', 'evs']) ? text.toFix : `${spreadTotal(build.ivs)}/${ivBudget(enemy.level)} · ${spreadTotal(build.evs)}/${evBudget(enemy.level)}`,
      pending: wrong(['ivs', 'evs']),
    },
    {
      field: 'moves',
      value: gaps.includes('moves') ? text.toChoose : wrong(['move-not-eligible', 'unknown-move', 'repeated-move']) ? text.toFix : text.enemy.movesCount(build.moves.length),
      pending: gaps.includes('moves') || wrong(['move-not-eligible', 'unknown-move', 'repeated-move']),
    },
    { field: 'held', value: wrong(['held-item']) ? text.toFix : build.heldItem ? (pack.items[build.heldItem]?.name[language] ?? build.heldItem) : text.enemy.nothing, pending: wrong(['held-item']) },
    { field: 'mobClass', value: text.enemy.classes[enemy.class] },
    { field: 'atZero', value: enemy.agony ? text.enemy.agonizes.name : text.enemy.faints.name },
  ]
  // The rest follows from the species: nothing else can be set before it is chosen.
  const shown = species ? rows : rows.slice(0, 2)
  return (
    <>
      {shown.map((row) => (
        <Slot key={row.field} onClick={() => onOpen(row.field)}>
          <span className="dn-slot__main dn-text-shadow">{fieldTitle(row.field, text)}</span>
          <span className={row.pending ? 'dn-slot__side dn-slot__tag' : 'dn-slot__side'}>{row.value}</span>
        </Slot>
      ))}
      {rules.natures === 'neutral' && species && <p className="dn-note">{messages.creation.identity.natureNeutral}</p>}
    </>
  )
}

/** One thing of one enemy, opened by itself. What a character's creation has a screen for uses that very screen. */
function EnemyFieldScreen({ field, enemy, pack, rules, language, messages, onChange }: EnemyPartProps & { field: EnemyField; onChange: (changes: Partial<EnemyDraft>) => void }) {
  const text = messages.encounters.enemy
  const creation = messages.creation
  const context = enemyContext(rules, pack, enemy.level)
  const { build } = enemy
  const send = (choice: DraftChoice): void => onChange({ build: choose(build, choice, context) })
  const setBuild = (changes: Partial<CreationDraft>): void => onChange({ build: { ...build, ...changes } })

  switch (field) {
    case 'species':
      return <SpeciesStep pack={pack} rules={context.rules} draft={build} language={language} text={creation.species} onChoose={(species) => send({ choose: 'species', species })} />
    case 'level':
      return (
        <>
          <p className="dn-note">{text.levelHint}</p>
          <NumberField label={text.level} value={enemy.level} min={1} max={LEVEL_MAX} onChange={(level) => onChange({ level })} lowerLabel={text.lowerLevel} raiseLabel={text.raiseLevel} />
        </>
      )
    case 'identity': {
      // An enemy may go without a name of its own: an empty one is not a problem here.
      const { nickname, ...others } = identityProblems(build, context)
      return <IdentityStep pack={pack} rules={context.rules} draft={build} problems={build.nickname.trim() === '' ? others : { ...others, ...(nickname ? { nickname } : {}) }} language={language} text={creation.identity} onChoose={send} />
    }
    case 'training':
      return <TrainingStep pack={pack} draft={build} level={enemy.level} language={language} text={creation} onChoose={send} />
    case 'moves':
      return <MovesStep pack={pack} context={context} draft={build} language={language} text={creation} categoryText={messages.battle.category} onToggle={(move) => send({ choose: 'move', move })} />
    case 'held':
      return <HeldItem pack={pack} held={build.heldItem} language={language} text={text} onChange={(heldItem) => setBuild({ heldItem })} />
    case 'mobClass':
      return (
        <>
          <p className="dn-note">{text.classHint}</p>
          {MOB_CLASSES.map((mobClass) => (
            <Slot key={mobClass} selected={enemy.class === mobClass} state={enemy.class === mobClass ? 'ok' : 'normal'} onClick={() => onChange({ class: mobClass })}>
              <span className="dn-slot__text">
                <span className="dn-text-shadow">{text.classes[mobClass]}</span>
                <span className="dn-note">{text.classPays(enemy.level * MOB_CLASS_BASE[mobClass])}</span>
              </span>
            </Slot>
          ))}
        </>
      )
    case 'atZero':
      return (
        <>
          {([false, true] as const).map((agony) => {
            const choice = agony ? text.agonizes : text.faints
            return (
              <Slot key={String(agony)} selected={enemy.agony === agony} state={enemy.agony === agony ? 'ok' : 'normal'} onClick={() => onChange({ agony })}>
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{choice.name}</span>
                  <span className="dn-note">{choice.hint}</span>
                </span>
              </Slot>
            )
          })}
        </>
      )
  }
}

interface HeldItemProps {
  pack: DataPack
  held: string | undefined
  language: Language
  text: Messages['encounters']['enemy']
  onChange: (item: string | undefined) => void
}

/** The one item an enemy holds (decision 132): what it holds now, and the items a Pokémon can hold, found by name. */
function HeldItem({ pack, held, language, text, onChange }: HeldItemProps) {
  const [search, setSearch] = useState('')
  const holding = held ? pack.items[held] : undefined
  const found = search.trim() === '' ? [] : Object.values(pack.items).filter((item) => item.holdable && item.id !== held && answers(item.name[language], search))
  return (
    <>
      <Slot selected={!held} state={held ? 'normal' : 'ok'} onClick={() => onChange(undefined)}>
        <span className="dn-slot__main dn-text-shadow">{text.holdNothing}</span>
      </Slot>
      {holding && (
        <Slot selected state="ok" onClick={() => onChange(undefined)}>
          <span className="dn-slot__icon">
            <ItemIconImage icon={holding.icon} />
          </span>
          <span className="dn-slot__text">
            <span className="dn-text-shadow">{holding.name[language]}</span>
            <span className="dn-note">{holding.description[language]}</span>
          </span>
        </Slot>
      )}
      <TextField label={text.heldSearch} value={search} onChange={setSearch} type="search" autoComplete="off" enterKeyHint="search" />
      {found.slice(0, FOUND_MAX).map((item) => (
        <Slot
          key={item.id}
          onClick={() => {
            onChange(item.id)
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
    </>
  )
}
