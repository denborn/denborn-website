import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import { encodeCreationCode, qrForm } from '../../shared/codec/codes'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { STARTING_MONEY_MAX } from '../../shared/schema/rules'
import type { WriteResult } from '../../storage/library'
import { NumberField, OptionButton, PokemonSprite, QrCode, Screen, Slot, StepHeader, TextField } from '../../ui'
import { MovesRule } from './MovesRule'
import { PacksRule } from './PacksRule'
import { SpeciesRule } from './SpeciesRule'
import { type Gap, type RulesDraft, campaignFrom, draftOf, hasChanges, newDraft, stateOf } from './rules-draft'

/** The rules of a campaign, in the order its page lists them. */
export const RULE_IDS = ['name', 'species', 'startingLevel', 'startingMoney', 'natures', 'moveAccess', 'commonMoves', 'itemPacks'] as const
export type RuleId = (typeof RULE_IDS)[number]

export interface CampaignEditorProps {
  pack: DataPack
  /** The campaign as this device keeps it; nothing for one not saved yet. */
  campaign: CampaignDocument | undefined
  /** The rule that is open; nothing for the page that lists them all. */
  rule: RuleId | undefined
  onRule: (rule: RuleId | undefined) => void
  newId: () => string
  /** Keeps the campaign on this device, or says why it cannot. */
  onSave: (campaign: CampaignDocument) => WriteResult
  /** The app's address, for the creation link. */
  origin: string
  /** Puts a text on the clipboard; false when the browser refuses. */
  onCopy: (text: string) => Promise<boolean>
  onSaveFile: (campaign: CampaignDocument) => void
  /** Asks to remove the campaign from this device: the answer is confirmed on a screen of its own. */
  onRemove: () => void
  /** Opens the screen that hosts a session of the campaign. */
  onHost: () => void
  /** The join code of the session of this campaign being hosted from this device, when there is one. */
  hosting?: string | undefined
  /** Opens the campaign's encounters (decision 143). */
  onEncounters: () => void
  onBack: () => void
  /** Told whenever the page starts or stops holding changes not saved yet. */
  onUnsaved?: (unsaved: boolean) => void
  /** Given while the game master is leaving with changes not saved: the two answers to "leave without saving?". */
  leaving?: { stay: () => void; leave: () => void } | undefined
}

const NAME_MAX = 60
const LEVEL_MAX = 100
const NATURES = ['chosen', 'neutral'] as const
const MOVE_ACCESS = ['level-up', 'level-up-tm-tutor-egg'] as const

/**
 * A campaign's page (decision 113): its rules, one row each. A tap on a row
 * opens that rule alone; SAVE THE RULES keeps the campaign, adding a version
 * of its rules when one changed. Once saved, its creation link and QR code
 * stand under the rules.
 */
export function CampaignEditor({ pack, campaign, rule, onRule, newId, onSave, origin, onCopy, onSaveFile, onRemove, onHost, hosting, onEncounters, onBack, onUnsaved, leaving }: CampaignEditorProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.campaigns
  const [draft, setDraft] = useState<RulesDraft>(() => (campaign ? draftOf(campaign, pack) : newDraft(pack)))
  const [notKept, setNotKept] = useState<Extract<WriteResult, { ok: false }>['reason']>()
  const heading = useRef<HTMLHeadingElement>(null)
  const firstDraw = useRef(true)
  const { gaps, problems } = stateOf(draft, pack)
  const changed = hasChanges(draft, campaign, pack)
  const title = rule ? text.rules[rule] : draft.name.trim() || text.newTitle
  const set = (changes: Partial<RulesDraft>): void => setDraft({ ...draft, ...changes })

  // Moving between the list of rules and one rule is a change of page: focus goes to its title, and the page starts from the top.
  useEffect(() => {
    if (firstDraw.current) {
      firstDraw.current = false
      return
    }
    heading.current?.focus()
    window.scrollTo(0, 0)
  }, [rule])

  useEffect(() => {
    onUnsaved?.(changed)
  }, [changed, onUnsaved])

  const save = (): void => {
    const made = campaignFrom(draft, campaign, pack, newId)
    if (!made) return
    const kept = onSave(made)
    setNotKept(kept.ok ? undefined : kept.reason)
  }

  /** What a row says of its rule: its value, or that it is still to choose, to add or to fix. */
  const valueOf = (id: RuleId): { value: string; pending?: true } => {
    const pending = (word: string): { value: string; pending: true } => ({ value: word, pending: true })
    const isGap = (gap: Gap): boolean => gaps.includes(gap)
    switch (id) {
      case 'name':
        return isGap('name') ? pending(text.toChoose) : { value: draft.name.trim() }
      case 'species':
        if (problems.some((problem) => 'species' in problem)) return pending(text.toFix)
        return isGap('species') ? pending(text.toChoose) : { value: text.of(draft.species.length, Object.keys(pack.species).length) }
      case 'startingLevel':
        return { value: String(draft.startingLevel) }
      case 'startingMoney':
        return { value: String(draft.startingMoney) }
      case 'natures':
        return draft.natures ? { value: text.natures[draft.natures].name } : pending(text.toChoose)
      case 'moveAccess':
        return draft.moveAccess ? { value: text.moveAccess[draft.moveAccess].name } : pending(text.toChoose)
      case 'commonMoves':
        if (problems.some((problem) => 'move' in problem)) return pending(text.toFix)
        return { value: draft.commonMoves.length === 0 ? text.none : String(draft.commonMoves.length) }
      case 'itemPacks':
        if (problems.some((problem) => 'pack' in problem)) return pending(text.toFix)
        return isGap('itemPacks') ? pending(text.toAdd) : { value: String(draft.itemPacks.length) }
    }
  }

  const openRule = (id: RuleId): ReactNode => {
    switch (id) {
      case 'name':
        return (
          <div className="dn-stack">
            <TextField label={text.rules.name} value={draft.name} onChange={(name) => set({ name })} hint={text.nameHint} maxLength={NAME_MAX} autoComplete="off" enterKeyHint="done" />
          </div>
        )
      case 'species':
        return <SpeciesRule pack={pack} chosen={draft.species} onChange={(species) => set({ species })} language={language} text={text.species} />
      case 'startingLevel':
        return (
          <div className="dn-stack">
            <p className="dn-note">{text.levelHint}</p>
            <NumberField label={text.rules.startingLevel} value={draft.startingLevel} min={1} max={LEVEL_MAX} onChange={(startingLevel) => set({ startingLevel })} lowerLabel={text.lowerLevel} raiseLabel={text.raiseLevel} />
          </div>
        )
      case 'startingMoney':
        return (
          <div className="dn-stack">
            <TextField
              label={text.rules.startingMoney}
              value={String(draft.startingMoney)}
              // Digits only; what goes past the highest amount stops there.
              onChange={(typed) => set({ startingMoney: Math.min(STARTING_MONEY_MAX, Number(typed.replace(/\D/g, ''))) })}
              hint={text.moneyHint}
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="done"
            />
          </div>
        )
      case 'natures':
        return (
          <div className="dn-stack">
            {NATURES.map((natures) => (
              <Slot key={natures} selected={draft.natures === natures} state={draft.natures === natures ? 'ok' : 'normal'} onClick={() => set({ natures })}>
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{text.natures[natures].name}</span>
                  <span className="dn-note">{text.natures[natures].hint}</span>
                </span>
              </Slot>
            ))}
          </div>
        )
      case 'moveAccess':
        return (
          <div className="dn-stack">
            {MOVE_ACCESS.map((moveAccess) => (
              <Slot key={moveAccess} selected={draft.moveAccess === moveAccess} state={draft.moveAccess === moveAccess ? 'ok' : 'normal'} onClick={() => set({ moveAccess })}>
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{text.moveAccess[moveAccess].name}</span>
                  <span className="dn-note">{text.moveAccess[moveAccess].hint}</span>
                </span>
              </Slot>
            ))}
          </div>
        )
      case 'commonMoves':
        return <MovesRule pack={pack} chosen={draft.commonMoves} onChange={(commonMoves) => set({ commonMoves })} language={language} messages={messages} />
      case 'itemPacks':
        return <PacksRule pack={pack} itemPacks={draft.itemPacks} problems={problems} onChange={(itemPacks) => set({ itemPacks })} language={language} text={text} />
    }
  }

  // Three of the playable Pokémon stand for them all: the first, the middle one and the last in Pokédex order.
  const faces = [...new Set([draft.species[0], draft.species[Math.floor(draft.species.length / 2)], draft.species.at(-1)])].flatMap((id) => {
    const species = id === undefined ? undefined : pack.species[id]
    return species ? [species] : []
  })

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={title}>
          <div className="dn-lineup">
            {faces.length === 0 && <p className="dn-note dn-text-outline">{text.hint}</p>}
            {faces.map((species) => (
              <PokemonSprite key={species.id} species={species} name={species.name[language]} scale={0.6} decorative />
            ))}
          </div>
        </Screen>
      </div>
      <Screen kind="menu" label={title} tall>
        <StepHeader title={title} headingRef={heading} />
        {leaving ? (
          <>
            <div className="dn-stack">
              <p className="dn-note dn-note--error" role="alert">
                {text.leave.question}
              </p>
            </div>
            <div className="dn-foot">
              <OptionButton primary onClick={leaving.stay}>
                {text.leave.stay}
              </OptionButton>
              <OptionButton onClick={leaving.leave}>{text.leave.leave}</OptionButton>
            </div>
          </>
        ) : rule ? (
          <>
            {openRule(rule)}
            <div className="dn-foot">
              <OptionButton primary onClick={() => onRule(undefined)}>
                {text.done}
              </OptionButton>
            </div>
          </>
        ) : (
          <>
            <div className="dn-stack">
              {RULE_IDS.map((id) => {
                const { value, pending } = valueOf(id)
                return (
                  <Slot key={id} onClick={() => onRule(id)}>
                    <span className="dn-slot__main dn-text-shadow">{text.rules[id]}</span>
                    <span className={pending ? 'dn-slot__side dn-slot__tag' : 'dn-slot__side'}>{value}</span>
                  </Slot>
                )
              })}
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
              {campaign && !changed && <CampaignLink campaign={campaign} pack={pack} origin={origin} onCopy={onCopy} onSaveFile={() => onSaveFile(campaign)} onRemove={onRemove} onHost={onHost} hosting={hosting} onEncounters={onEncounters} />}
            </div>
            <div className="dn-foot">
              <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
              <OptionButton primary disabled={!changed || gaps.length > 0 || problems.length > 0} onClick={save}>
                {text.save}
              </OptionButton>
            </div>
          </>
        )}
      </Screen>
    </div>
  )
}

interface CampaignLinkProps {
  campaign: CampaignDocument
  pack: DataPack
  origin: string
  onCopy: (text: string) => Promise<boolean>
  onSaveFile: () => void
  onRemove: () => void
  onHost: () => void
  hosting: string | undefined
  onEncounters: () => void
}

/** Under the rules of a saved campaign: the way to host a session (decision 127) and to its encounters (decision 143), the link players make their characters from, as a QR code and as text, the campaign's file, and last the way to remove it. */
function CampaignLink({ campaign, pack, origin, onCopy, onSaveFile, onRemove, onHost, hosting, onEncounters }: CampaignLinkProps) {
  const messages = useMessages()
  const text = messages.campaigns
  const [copied, setCopied] = useState<boolean>()
  const rules = campaign.rulesHistory.at(-1)
  if (!rules) return null
  const code = encodeCreationCode({ campaign: { id: campaign.id, name: campaign.name }, dataPackVersion: campaign.dataPackVersion, rules }, pack.species)
  const link = `${origin}/#${code}`
  return (
    <>
      <p className="dn-note">{hosting ? messages.session.host.running : messages.session.host.startHint}</p>
      <div className="dn-row">
        <OptionButton primary onClick={onHost}>
          {hosting ? messages.session.host.resume(hosting) : messages.session.host.start}
        </OptionButton>
      </div>
      <p className="dn-note">{messages.encounters.entryHint(campaign.encounters.length)}</p>
      <div className="dn-row">
        <OptionButton onClick={onEncounters}>{messages.encounters.entry}</OptionButton>
      </div>
      <span className="dn-label">
        {text.link} · {text.version(rules.version)}
      </span>
      <p className="dn-note">{text.linkHint}</p>
      <QrCode text={qrForm(code, origin)} label={text.link} tooLong={text.tooLarge} />
      <div className="dn-row">
        <OptionButton onClick={() => void onCopy(link).then(setCopied)}>{text.copy}</OptionButton>
      </div>
      {copied !== undefined && (
        <p className={copied ? 'dn-note' : 'dn-note dn-note--error'} role="status">
          {copied ? text.copied : text.notCopied}
        </p>
      )}
      <p className="dn-note dn-link">{link}</p>
      <p className="dn-note">{text.fileHint}</p>
      <div className="dn-row">
        <OptionButton onClick={onSaveFile}>{text.saveFile}</OptionButton>
      </div>
      <p className="dn-note">{text.removeHint}</p>
      <div className="dn-row">
        <OptionButton onClick={onRemove}>{text.remove}</OptionButton>
      </div>
    </>
  )
}
