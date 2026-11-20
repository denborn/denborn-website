import { useEffect, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { ArrowButton, ScrollingBlock } from '../../ui'
import { DexKey, DexPage, Tray } from '../../ui/dex'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import type { StepChrome } from './Creation'
import type { CreationDraft, DraftChoice } from './draft'

export interface CombatStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  draft: CreationDraft
  onChoose: (choice: DraftChoice) => void
}

/**
 * How the Pokémon fights (decisions 302 and 306): its Ability, two at a time
 * on a strip that slides when the species has more, with what the one chosen
 * does under them. Its nature is chosen with its TV.
 */
export function CombatStep({ pack, language, messages, chrome, draft, onChoose }: CombatStepProps) {
  const text = messages.creation
  const words = text.identity
  const still = usePrefersReducedMotion()
  const [about, setAbout] = useState(false)
  const species = draft.species ? pack.species[draft.species] : undefined
  if (!species) return null
  const ability = draft.ability ? pack.abilities[draft.ability] : undefined

  return (
    <>
      <DexPage
        title={text.dex.combat.title}
        steps={chrome.steps}
        covered={about}
        foot={
          <>
            <DexKey shape="square" aria-label={text.dex.about} onClick={() => setAbout(true)}>
              {text.dex.aboutKey}
            </DexKey>
            <span className="dn-dex-foot__said" />
            {chrome.next}
          </>
        }
      >
        <div className="dn-dex-combat">
          <AbilityStrip
            // Another species is another strip, measured anew.
            key={species.id}
            label={words.ability}
            previous={text.dex.combat.previousAbilities}
            next={text.dex.combat.nextAbilities}
            chosen={draft.ability}
            still={still}
            abilities={species.abilities.map((id) => ({ id, name: pack.abilities[id]?.name[language] ?? id, hidden: id === species.hiddenAbility }))}
            hiddenLabel={words.hidden}
            onChoose={(id) => onChoose({ choose: 'ability', ability: id })}
          />
          <ScrollingBlock className={`dn-dex-ability-text${ability ? '' : ' dn-dex-ability-text--none'}`} text={ability?.description[language] ?? ''} still={still} />
        </div>
      </DexPage>

      <Tray open={about} title={text.dex.stepNames.combat} closeLabel={text.dex.close} onClose={() => setAbout(false)}>
        <p className="dn-tray__text">{text.dex.combat.aboutAbility}</p>
        {ability && (
          <p className="dn-tray__text">
            {ability.name[language]}: {ability.description[language]}
          </p>
        )}
      </Tray>
    </>
  )
}

interface AbilityStripProps {
  label: string
  /** What the two arrows do, read out. */
  previous: string
  next: string
  abilities: readonly { id: string; name: string; hidden: boolean }[]
  chosen: string | undefined
  hiddenLabel: string
  still: boolean
  onChoose: (id: string) => void
}

/**
 * The Abilities, two at a time, each a plain key half as wide as the screen
 * (decisions 302 and 303). With more, the strip slides under a finger or by
 * its arrows, which stand over its ends where there are others to see.
 */
function AbilityStrip({ label, previous, next, abilities, chosen, hiddenLabel, still, onChoose }: AbilityStripProps) {
  const strip = useRef<HTMLDivElement>(null)
  const [ends, setEnds] = useState({ before: false, after: false })
  useEffect(() => {
    const element = strip.current
    if (!element) return
    const measure = (): void => setEnds({ before: element.scrollLeft > 1, after: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [])
  // The one chosen is brought into sight when it is chosen, and when the strip comes: no further than it takes to show it whole.
  // Only then: a strip slid by its arrows stays where it was slid.
  const place = abilities.findIndex((one) => one.id === chosen)
  useEffect(() => {
    const element = strip.current
    const button = element?.children[place]
    if (!element || !(button instanceof HTMLElement)) return
    if (button.offsetLeft < element.scrollLeft) element.scrollLeft = button.offsetLeft
    else if (button.offsetLeft + button.offsetWidth > element.scrollLeft + element.clientWidth) element.scrollLeft = button.offsetLeft + button.offsetWidth - element.clientWidth
  }, [place])
  const slide = (way: 1 | -1): void => {
    const element = strip.current
    const first = element?.firstElementChild
    if (!element || !(first instanceof HTMLElement)) return
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0
    element.scrollBy({ left: way * (first.offsetWidth + gap), behavior: still ? 'auto' : 'smooth' })
  }
  return (
    <div className="dn-dex-ability-strip">
      <ArrowButton way="previous" label={previous} disabled={!ends.before} onClick={() => slide(-1)} />
      <div ref={strip} className={`dn-dex-abilities${abilities.length === 1 ? ' dn-dex-abilities--one' : ''}`} role="group" aria-label={label}>
        {abilities.map(({ id, name, hidden }) => (
          <button key={id} type="button" className="dn-dex-ability" aria-pressed={chosen === id} onClick={() => onChoose(id)}>
            {hidden && <span className="dn-dex-hidden-mark" role="img" aria-label={hiddenLabel} />}
            <span className="dn-dex-ability__name">{name}</span>
          </button>
        ))}
      </div>
      <ArrowButton way="next" label={next} disabled={!ends.after} onClick={() => slide(1)} />
    </div>
  )
}
