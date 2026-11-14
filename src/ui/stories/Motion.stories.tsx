import type { Meta, StoryObj } from '@storybook/react-vite'
import { motion } from 'motion/react'
import { useState } from 'react'
import { DURATION, EASE, HudBox, MessageBox, Screen, StatusBadge } from '..'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

const SPEEDS = Object.entries(DURATION)
const CURVES = Object.entries(EASE)

function MotionBoard() {
  const text = useBattleText()
  const locale = useLocale()
  const pack = usePack()
  const [run, setRun] = useState(0)
  const [hp, setHp] = useState(120)
  const [badge, setBadge] = useState(false)
  const name = pack.species.arcanine?.name[locale] ?? ''
  return (
    <Phone>
      <Section title="Durations and easings">
        <Note>
          Four durations and three easings carry every movement of the interface. They are tokens (<strong>--dn-press</strong>,{' '}
          <strong>--dn-quick</strong>, <strong>--dn-move</strong>, <strong>--dn-slow</strong>) and Denborn’s own choice: the games’ timings
          are not documented. Press “Play” to compare them.
        </Note>
        <Screen kind="menu" label="Durations and easings">
          <div className="sb-stack sb-pad">
            {SPEEDS.map(([key, seconds]) => (
              <div key={key} className="sb-row">
                <span style={{ width: 'calc(70 * var(--dn-u))' }}>
                  {key} {Math.round(seconds * 1000)}ms
                </span>
                <motion.span
                  key={run}
                  className="dn-agony__pip"
                  initial={{ x: 0 }}
                  animate={{ x: run === 0 ? 0 : 'calc(120 * var(--dn-u))' }}
                  transition={{ duration: seconds, ease: EASE.out }}
                />
              </div>
            ))}
            {CURVES.map(([key, curve]) => (
              <div key={key} className="sb-row">
                <span style={{ width: 'calc(70 * var(--dn-u))' }}>ease-{key}</span>
                <motion.span
                  key={run}
                  className="dn-agony__pip"
                  initial={{ x: 0 }}
                  animate={{ x: run === 0 ? 0 : 'calc(120 * var(--dn-u))' }}
                  transition={{ duration: DURATION.slow, ease: [...curve] }}
                />
              </div>
            ))}
          </div>
        </Screen>
        <div className="sb-tools">
          <button type="button" onClick={() => setRun(run + 1)}>
            Play
          </button>
        </div>
      </Section>
      <Section title="HP, badges and text">
        <Note>
          The HP bar moves at one steady pace, so a big hit is seen to be big. A badge arrives with a small overshoot. Text is typed out,
          and one tap completes it. With “reduce motion” set on the device, all of it happens at once.
        </Note>
        <Screen label="HP, badges and text">
          <div className="sb-pad">
            <HudBox side="foe" name={name} level={40} gender="F" hp={hp} maxHp={120} text={text} showNumbers>
              {badge && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: DURATION.quick, ease: [...EASE.snap] }}>
                  <StatusBadge status="brn" text={text.status.brn.badge} label={text.status.brn.name} />
                </motion.span>
              )}
            </HudBox>
          </div>
          <div className="sb-message">
            <MessageBox key={hp} text={hp === 0 ? text.messages.downed(name) : text.messages.prompt(name)} />
          </div>
        </Screen>
        <div className="sb-tools">
          <button type="button" onClick={() => setHp(Math.max(0, hp - 45))}>
            Hit
          </button>
          <button type="button" onClick={() => setHp(120)}>
            Heal
          </button>
          <button type="button" onClick={() => setBadge(!badge)}>
            Burn
          </button>
        </div>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Foundations/Motion', component: MotionBoard } satisfies Meta<typeof MotionBoard>
export default meta

export const Vocabulary: StoryObj<typeof meta> = {}
