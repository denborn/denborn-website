import type { Meta, StoryObj } from '@storybook/react-vite'
import { Screen } from '../Screen'
import { OptionButton } from '../controls'
import { TitleScene } from '../title-scene'
import { Note, Phone, Section } from './board'
import type { TitleLook } from './proposals'
import { TITLE_LOOKS, TITLE_LOOK_NAMES, titleWording } from './proposals'

/** The name, in one of the proposed looks. */
function Name({ look }: { look: TitleLook }) {
  return <div className={`dn-title${look === 'today' ? '' : ` sb-title--${look}`}`}>Denborn</div>
}

function Looks() {
  return (
    <Phone>
      <Section title="1. The name on the title screen">
        <Note>
          “Denborn is in the font of the repo but have a new heroic fantasy vibe.” Three looks in VT323, each filled with bands of colour like
          a struck metal, each with the ink outline of the app’s text; the name as it is today, last, to compare. Shown over the storm, where it
          stays. Pick one, or ask for another; the Playing story under Screens/Title screen can show any of them in motion.
        </Note>
      </Section>
      {TITLE_LOOKS.map((look) => (
        <Section key={look} title={TITLE_LOOK_NAMES[look]}>
          <Screen kind="scene" label={TITLE_LOOK_NAMES[look]}>
            <TitleScene intro={false} still>
              <Name look={look} />
            </TitleScene>
          </Screen>
        </Section>
      ))}
    </Phone>
  )
}

function Words() {
  const { en, fr } = titleWording
  const starts = [
    { language: 'English', words: en.touchToStart[0] ?? '' },
    ...fr.touchToStart.map((words, index) => ({ language: `French, proposal ${index + 1}`, words })),
  ]
  return (
    <Phone>
      <Section title="2. The words on the black bottom screen">
        <Note>The English is the request’s own. Two French proposals: the first says the same; the second is shorter, as the DS itself says.</Note>
        {starts.map(({ language, words }) => (
          <Section key={language} title={language}>
            <Screen kind="blank" label={language}>
              <button type="button" className="dn-start dn-start--shown dn-start--still">
                <span className="dn-start__words dn-text-outline">{words}</span>
              </button>
            </Screen>
          </Section>
        ))}
      </Section>
      <Section title="3. The switch in the Options (decision 206)">
        <Note>
          The English is the line you chose it by (“Title screen animation: on / off”). In French, OUI / NON, as the games’ own options say.
          Off, the title screen stays still: the rain hangs, no lightning flashes, TOUCH TO START does not blink. Under the text speed.
        </Note>
        {[en, fr].map((text) => (
          <Screen key={text.titleAnimation} kind="menu" label={text.titleAnimation} tall>
            <div className="dn-stack sb-pad">
              <div role="radiogroup" aria-label={text.titleAnimation} className="dn-entry">
                <span className="dn-label">{text.titleAnimation}</span>
                <p className="dn-note">{text.titleAnimationHint}</p>
                <div className="dn-row">
                  <OptionButton role="radio" aria-checked>
                    {text.titleAnimationChoices.on}
                  </OptionButton>
                  <OptionButton role="radio" aria-checked={false}>
                    {text.titleAnimationChoices.off}
                  </OptionButton>
                </div>
              </div>
            </div>
          </Screen>
        ))}
      </Section>
      <Section title="4. The credit for the meadow (decision 204)">
        <Note>
          On the credits screen, after the Pokémon Showdown team, with a link to Showdown’s credits page, where Kyle Dove is named for the
          battle backdrops.
        </Note>
        {[en, fr].map((text) => (
          <Screen key={text.backdrop.theirs} kind="menu" label={text.backdrop.who} tall>
            <ul className="dn-credits sb-pad">
              <li className="dn-credit">
                <span className="dn-credit__who">{text.backdrop.who}</span>
                <span className="dn-note">{text.backdrop.theirs}</span>
                <span className="dn-credit__links">
                  <a className="dn-anchor" href="https://pokemonshowdown.com/credits" target="_blank" rel="noreferrer">
                    Pokémon Showdown credits
                  </a>
                </span>
              </li>
            </ul>
          </Screen>
        ))}
      </Section>
    </Phone>
  )
}

const meta = { title: 'To decide/Title screen' } satisfies Meta
export default meta

export const TheName: StoryObj = { render: () => <Looks /> }
export const TheWords: StoryObj = { render: () => <Words /> }
