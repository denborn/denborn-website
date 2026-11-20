import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import type { CSSProperties } from 'react'
import type { DataPack, StatId } from '../../data/types'
import type { AttributeId } from '../../game-rules/attributes'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { ItemIconImage, PokemonSprite, ScrollingText, TypeLabel } from '../../ui'
import { Flap, type ProfileCorner, ProfileGraph } from '../../ui/dex'
import { DURATION, EASE } from '../../ui/motion'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { PROFILE_TOP, type Recap } from './recap'

/** The roleplay attributes in the order the owner set for their boxes (decisions 288 and 292): three of the body, three of the mind. */
export const ATTRIBUTE_ORDER: readonly AttributeId[] = ['strength', 'dexterity', 'endurance', 'intelligence', 'perception', 'charisma']

/**
 * The corners of the profile graph, clockwise from the top. The special stats
 * are on the right, where their longer names have room, and Attack and Defense
 * on the left, by the sprite (decision 302); the games' own hexagon has them
 * the other way round.
 */
const PROFILE_CORNERS: readonly StatId[] = ['hp', 'spa', 'spd', 'spe', 'def', 'atk']

/** The graph's radius, in DS pixels: what the screen leaves between the attributes and the nature. */
const PROFILE_RADIUS = 40

export interface RecapScreenProps {
  pack: DataPack
  recap: Recap
  language: Language
  messages: Messages
}

/**
 * The top screen of the Pokédex (decision 288): the character as far as it is
 * made, for the whole of its creation. What is not chosen yet reads ???; what
 * is chosen comes with a move of its own, since the screen itself stays from
 * step to step and is given none by the frame.
 */
export function RecapScreen({ pack, recap, language, messages }: RecapScreenProps) {
  const text = messages.creation
  const still = usePrefersReducedMotion()
  const unknown = text.dex.unknown
  const { species, profile, nature } = recap
  const name = recap.nickname.trim() || species?.name[language] || unknown
  const level = `${messages.battle.level} ${recap.level ?? '?'}`
  const ability = recap.ability ? (pack.abilities[recap.ability]?.name[language] ?? recap.ability) : unknown
  const held = recap.held?.item ? pack.items[recap.held.item] : undefined
  const short = text.dex.training.short

  const corners: ProfileCorner[] = PROFILE_CORNERS.map((stat) => {
    const trend = nature?.plus === stat && nature.minus !== stat ? 'up' : nature?.minus === stat && nature.plus !== stat ? 'down' : undefined
    return {
      id: stat,
      short: short[stat],
      name: pack.statNames[stat][language],
      base: profile ? profile.base[stat] / PROFILE_TOP : 0,
      trained: profile ? profile.trained[stat] / PROFILE_TOP : 0,
      value: profile ? String(profile.stats[stat]) : undefined,
      trend,
      trendLabel: trend === 'up' ? text.raised : trend === 'down' ? text.lowered : undefined,
    }
  })

  return (
    <MotionConfig reducedMotion="user">
      <div className="dn-recap">
        <div className="dn-recap__who">
          <p className="dn-recap__name">
            <ScrollingText text={name} still={still} />
          </p>
          <div className="dn-dex-slab dn-recap__stage">
            <AnimatePresence mode="wait" initial={false}>
              {species && (
                // The Pokémon comes up from the screen below, where it was chosen, and lands on its plate.
                <motion.span
                  key={`${species.id} ${recap.gender === 'F' && species.femaleSprite ? 'f' : 'm'}`}
                  className="dn-recap__sprite"
                  initial={{ y: '115%' }}
                  animate={{ y: 0, transition: { duration: DURATION.move, ease: EASE.snap, delay: DURATION.quick } }}
                  exit={{ y: '115%', transition: { duration: DURATION.quick, ease: EASE.in } }}
                >
                  <PokemonSprite species={species} name={species.name[language]} female={recap.gender === 'F'} decorative />
                </motion.span>
              )}
            </AnimatePresence>
            {!species && <span className="dn-recap__unknown">{unknown}</span>}
          </div>
          <p className="dn-recap__line">
            <Flap shown={`${level} ${species?.id ?? ''}`} block>
              <ScrollingText text={`${level} · ${species?.name[language] ?? unknown}`} still={still} />
            </Flap>
          </p>
          <p className="dn-recap__types">
            <Flap shown={species?.id ?? ''} block>
              {species ? (
                species.types.map((type) => <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[language] ?? type} />)
              ) : (
                <>
                  <span className="dn-type dn-recap__type">{unknown}</span>
                  <span className="dn-type dn-recap__type">{unknown}</span>
                </>
              )}
            </Flap>
          </p>
          <p className="dn-recap__campaign">
            <Flap shown={recap.campaign ?? ''} block>
              <span className="dn-summary__campaign dn-recap__plate">
                <ScrollingText text={recap.campaign ?? unknown} still={still} />
              </span>
            </Flap>
          </p>
        </div>

        <div className="dn-recap__facts">
          <dl className="dn-recap__rows">
            <div className="dn-recap__row">
              <dt>{text.identity.ability}</dt>
              <dd>
                <Flap shown={ability}>{ability}</Flap>
              </dd>
            </div>
            <div className="dn-recap__row">
              <dt>{text.dex.recap.item}</dt>
              <dd>
                <Flap shown={recap.held ? (recap.held.item ?? 'none') : ''} block>
                  <span className="dn-recap__held">
                    {held && <ItemIconImage icon={held.icon} scale={0.5} />}
                    <ScrollingText text={recap.held ? (held?.name[language] ?? text.dex.none) : unknown} still={still} />
                  </span>
                </Flap>
              </dd>
            </div>
            <div className="dn-recap__row">
              <dt>{text.dex.recap.exp}</dt>
              <dd>
                <Flap shown={String(recap.exp)}>{recap.exp ?? unknown}</Flap>
              </dd>
            </div>
          </dl>

          <dl className="dn-recap__attributes" aria-label={text.attributes.title}>
            {ATTRIBUTE_ORDER.map((attribute) => {
              const score = recap.attributes?.[attribute]
              const tone = { '--dn-recap-fill': `var(--dn-attr-${attribute})`, '--dn-recap-shade': `var(--dn-attr-${attribute}-shade)` } as CSSProperties
              return (
                <div key={attribute} className="dn-recap__attribute" style={tone}>
                  <dt aria-label={text.attributes.names[attribute]}>{text.dex.attributes.short[attribute]}</dt>
                  {/* A number that changes hops: the same thing drawn anew, so that its move plays again. */}
                  <dd key={score ?? 'unknown'}>{score ?? '??'}</dd>
                </div>
              )
            })}
          </dl>

          <div className="dn-recap__profile">
            <ProfileGraph label={text.dex.recap.stats} corners={corners} empty={!profile} radius={PROFILE_RADIUS} />
          </div>

          <p className="dn-recap__nature">
            <Flap shown={nature?.id ?? ''} block>
              {/* A nature that moves two stats says so in the room its name leaves: the word "nature" gives way to it. */}
              {!(nature?.plus && nature.minus && nature.plus !== nature.minus) && <span className="dn-recap__nature-name">{text.identity.nature} </span>}
              {nature ? (
                <>
                  {nature.name[language]}
                  {nature.plus && nature.minus && nature.plus !== nature.minus && (
                    <>
                      {' '}
                      <span className="dn-recap__up">
                        {short[nature.plus]}
                        <span className="dn-trend dn-trend--up" role="img" aria-label={text.raised} />
                      </span>{' '}
                      <span className="dn-recap__down">
                        {short[nature.minus]}
                        <span className="dn-trend dn-trend--down" role="img" aria-label={text.lowered} />
                      </span>
                    </>
                  )}
                </>
              ) : recap.neutral ? (
                text.review.neutral
              ) : (
                unknown
              )}
            </Flap>
          </p>
        </div>
      </div>
    </MotionConfig>
  )
}
