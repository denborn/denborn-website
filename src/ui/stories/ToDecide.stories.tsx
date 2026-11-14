import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import {
  type AgonyLook,
  CommandMenu,
  HudBox,
  MessageBox,
  MoveButton,
  OptionButton,
  Screen,
  Slot,
  StatusBadge,
  type StatusId,
  TypeIcon,
  TypeLabel,
} from '..'
import { FONT_CANDIDATES, Note, Phone, Section, useBoardText, useLocale, usePack } from './board'
import { boardText } from './proposals'

const SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 éèêë àâ ç ùûü îï ôœ ÉÈÀÇŒ « » ! ? … ’'

/** The same pieces in each candidate font, with French names and sentences: accents are where pixel fonts fail. */
function Fonts() {
  const pack = usePack()
  const text = boardText.fr
  const name = (id: string): string => pack.species[id]?.name.fr ?? id
  const move = pack.moves.flamethrower
  return (
    <Phone>
      <Section title="1. The font">
        <Note>
          Four candidates, all free to bundle (SIL Open Font License). Each is shown at the size that gives its capitals the height of
          the games’ letters, in French, because accents are where pixel fonts fail. The “Font” switch in the toolbar puts any of them on
          every other page of the board.
        </Note>
      </Section>
      {Object.entries(FONT_CANDIDATES).map(([id, font]) => (
        <Section key={id} title={font.name}>
          <div className="dn-root" style={{ '--dn-font': font.family, '--dn-font-scale': font.scale } as CSSProperties}>
            <Screen label={font.name}>
              <div className="sb-hud-stack" style={{ left: 'calc(4 * var(--dn-u))', top: 'calc(6 * var(--dn-u))' }}>
                <HudBox side="foe" name={name('gyarados')} level={49} gender="M" hp={87} maxHp={120} text={text} />
              </div>
              <div className="sb-hud-stack" style={{ right: 'calc(4 * var(--dn-u))', top: 'calc(60 * var(--dn-u))' }}>
                <HudBox side="player" name={name('clefairy')} level={7} gender="F" hp={21} maxHp={120} text={text} showNumbers>
                  <StatusBadge status="brn" text={text.status.brn[0]} label={text.status.brn[1]} />
                </HudBox>
              </div>
              <div className="sb-message">
                <MessageBox text={`${text.messages.agonizing(name('charmander'))} ${text.messages.bagNoEffect(name('gyarados'))}`} />
              </div>
            </Screen>
            <Screen kind="menu" label={`${font.name}, menus`}>
              <div className="sb-stack sb-pad">
                <Slot>
                  <span className="dn-text-shadow">{name('farfetchd')}</span>
                </Slot>
                <div className="sb-row">
                  <div style={{ width: 'calc(120 * var(--dn-u))' }}>
                    {move && (
                      <MoveButton
                        name={move.name.fr}
                        type={move.type}
                        typeLabel={move.type}
                        category={move.category}
                        categoryLabel={move.category}
                        pp={15}
                        maxPp={15}
                        ppText={text.pp}
                        onSelect={() => undefined}
                      />
                    )}
                  </div>
                  <OptionButton selected>{text.back}</OptionButton>
                </div>
                <span style={{ fontSize: 'calc(9 * var(--dn-t))', lineHeight: 1.25 }}>{SAMPLE}</span>
              </div>
            </Screen>
          </div>
        </Section>
      ))}
    </Phone>
  )
}

const STATUSES: StatusId[] = ['psn', 'tox', 'brn', 'par', 'slp', 'frz']

function Words() {
  const pack = usePack()
  const types = Object.values(pack.types)
  return (
    <Phone>
      <Section title="2. The words on the buttons and badges">
        <Note>
          English uses the four action names of the rules. The French ones are proposals: ATTAQUE, SAC and FUITE are the games’ own
          words; ÉCHANGE is new, because Denborn’s Switch (trading turn order) is not the games’ “POKéMON” button. The status letters and
          “N.” / “PV” are the French games’ own.
        </Note>
      </Section>
      <Section title="Type labels">
        <Note>
          Showdown’s type labels are images, and exist in English only (first block). The app can draw its own in the same colours, with
          the French names in French (second block). Which should the French interface show?
        </Note>
        <Screen kind="menu" label="Type labels">
          <div className="sb-stack sb-pad">
            <div className="sb-row" style={{ gap: 2 }}>
              {types.map((type) => (
                <TypeIcon key={type.id} type={type.name.en} label={type.name.en} />
              ))}
            </div>
            <div className="sb-row" style={{ gap: 2 }}>
              {types.map((type) => (
                <TypeLabel key={type.id} type={type.name.en} text={type.name.fr} />
              ))}
            </div>
          </div>
        </Screen>
      </Section>
      {(['en', 'fr'] as const).map((locale) => {
        const text = boardText[locale]
        return (
          <Section key={locale} title={locale === 'en' ? 'English' : 'Français'}>
            <Screen kind="touch" label={locale}>
              <CommandMenu labels={text.commands} onCommand={() => undefined} />
            </Screen>
            <Screen kind="menu" label={`${locale} badges`}>
              <div className="sb-stack sb-pad">
                <div className="sb-row">
                  {STATUSES.map((status) => (
                    <StatusBadge key={status} status={status} text={text.status[status][0]} label={text.status[status][1]} />
                  ))}
                </div>
                <HudBox side="player" name={locale === 'en' ? 'Charizard' : 'Dracaufeu'} level={41} gender="M" hp={64} maxHp={133} text={text} showNumbers />
              </div>
            </Screen>
          </Section>
        )
      })}
    </Phone>
  )
}

const LOOKS: { look: AgonyLook; title: string; note: string }[] = [
  { look: 'below', title: 'A. A tag under the plate', note: 'The word and the stacks left, on a line of their own. Clearest, but each downed Pokémon takes one more line.' },
  { look: 'plate', title: 'B. Pips on the plate', note: 'Only the stacks, where status badges go. Smallest; the empty HP bar stays.' },
  { look: 'bar', title: 'C. In place of the HP bar', note: 'A downed Pokémon has no HP to show, so the word and the stacks take the bar’s place.' },
]

function Agony() {
  const text = useBoardText()
  const locale = useLocale()
  const pack = usePack()
  const name = pack.species.snorlax?.name[locale] ?? ''
  return (
    <Phone>
      <Section title="3. How Agony shows">
        <Note>
          Agony has no counterpart in the games, so its look is Denborn’s to choose. In each, the diamonds are the stacks left: full ones
          remain, hollow ones are lost, so the count never rests on colour alone. Three ways to place it:
        </Note>
      </Section>
      {LOOKS.map(({ look, title, note }) => (
        <Section key={look} title={title}>
          <Note>{note}</Note>
          <Screen label={title}>
            <div className="sb-row sb-pad" style={{ alignItems: 'start' }}>
              {[3, 1].map((stacks) => (
                <HudBox
                  key={stacks}
                  side="player"
                  name={name}
                  level={40}
                  gender="M"
                  hp={0}
                  maxHp={210}
                  text={text}
                  agony={{ stacks, text: text.agony, label: text.agonyLabel(stacks, 3) }}
                  agonyLook={look}
                />
              ))}
            </div>
          </Screen>
        </Section>
      ))}
    </Phone>
  )
}

function Messages() {
  const pack = usePack()
  const sample = (locale: 'en' | 'fr'): string[] => {
    const text = boardText[locale].messages
    const a = pack.species.gengar?.name[locale] ?? 'A'
    const b = pack.species.snorlax?.name[locale] ?? 'B'
    const item = pack.items.revive?.name[locale] ?? ''
    return [
      text.prompt(a),
      text.downed(b),
      text.agonizing(b),
      text.hitWhileDown(b),
      text.died(b),
      text.revived(b),
      text.bagUsed(a, item, b),
      text.bagBlocked(a, item),
      text.bagNoEffect(b),
      text.switched(a, b),
      text.ran(a, b),
      text.timeout(a),
    ]
  }
  const events = [
    'Asking for an action',
    'A Pokémon falls to 0 HP',
    'Its Agony turn (decided: “is agonizing…”)',
    'It is hit while downed',
    'Its last stack is lost',
    'It is revived',
    'A Bag item is used',
    'The Bag action is blocked (asleep, flinched…)',
    'The item cannot work on the target',
    'Switch: two allies trade turn order',
    'Run: two allies trade places',
    'The timer runs out',
  ]
  const english = sample('en')
  const french = sample('fr')
  return (
    <>
      <Section title="4. Denborn’s own battle messages">
        <Note>
          The engine’s ordinary messages (moves, damage, status) follow the games. These are the lines Denborn adds. Only “is agonizing…”
          is decided; every other line here, and every French line, is a proposal.
        </Note>
        <table className="sb-table">
          <thead>
            <tr>
              <th>When</th>
              <th>English</th>
              <th>Français</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event}>
                <td>{event}</td>
                <td>{english[index]}</td>
                <td>{french[index]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Phone>
        <Screen label="Message band">
          <div className="sb-message">
            <MessageBox text={`${french[2] ?? ''} ${french[8] ?? ''}`} />
          </div>
        </Screen>
      </Phone>
    </>
  )
}

const meta = { title: 'To decide/Rulings' } satisfies Meta
export default meta

export const Font: StoryObj = { name: '1. Font', render: () => <Fonts /> }
export const ButtonAndBadgeWords: StoryObj = { name: '2. Words on buttons and badges', render: () => <Words /> }
export const AgonyBadge: StoryObj = { name: '3. How Agony shows', render: () => <Agony /> }
export const BattleMessages: StoryObj = { name: '4. Battle messages', render: () => <Messages /> }
