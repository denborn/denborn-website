import type { Meta, StoryObj } from '@storybook/react-vite'
import tokensCss from '../tokens.css?raw'
import { Note, Section } from './board'

interface Swatch {
  name: string
  value: string
  note: string
}

interface Group {
  title: string
  swatches: Swatch[]
}

/** Reads the colour tokens straight from tokens.css, so the board cannot drift from the file. */
function readGroups(css: string): Group[] {
  const groups: Group[] = []
  for (const line of css.split('\n')) {
    const heading = /^\s*\/\* --- (.+?) -+ ?\*\/\s*$/.exec(line)
    if (heading?.[1]) {
      groups.push({ title: heading[1].trim(), swatches: [] })
      continue
    }
    const token = /^\s*(--dn-[\w-]+):\s*(#[0-9a-f]{3,8}|rgb\([^)]*\));\s*(?:\/\*\s*(.*?)\s*\*\/)?/i.exec(line)
    const group = groups.at(-1)
    if (token?.[1] && token[2] && group) group.swatches.push({ name: token[1], value: token[2], note: token[3] ?? '' })
  }
  return groups.filter((group) => group.swatches.length > 0)
}

function Palette() {
  return (
    <>
      <Section title="Palette">
        <Note>
          Every colour of the kit, read from <strong>src/ui/tokens.css</strong>. A heading that says “measured” gives the reference sheet the
          values were read from; the others are Denborn’s own, in the same spirit.
        </Note>
      </Section>
      {readGroups(tokensCss).map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="sb-swatches">
            {group.swatches.map((swatch) => (
              <div key={swatch.name} className="sb-swatch">
                <span className="sb-swatch__chip" style={{ background: swatch.value }} />
                <span>
                  {swatch.name}
                  <br />
                  {swatch.value}
                  {swatch.note && (
                    <>
                      <br />
                      <span className="sb-swatch__note">{swatch.note}</span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </>
  )
}

const meta = { title: 'Foundations/Palette', component: Palette } satisfies Meta<typeof Palette>
export default meta

export const Colours: StoryObj<typeof meta> = {}
