import type { ReactNode } from 'react'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { Screen } from '../../ui/Screen'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { TitleScene } from '../../ui/title-scene'
import { useTitleAnimation } from '../options/title-animation'

/**
 * The den's name as a screen. Every page that shows it gives it this key, so
 * that it is one and the same screen from page to page: the rain goes on
 * falling while the other screen changes (decision 218).
 */
export const DEN = 'den'

export interface DenScreenProps {
  /** What the page is, for assistive technology. */
  label: string
  /** The home's title: the intro plays from the den in daylight (decision 205). */
  intro?: boolean
  /** The storm's bolts and flashes, which are the home's alone. */
  lightning?: boolean
  /** Whether the scene moves, for a page that is told so: without it, the Options' switch says (decision 206). */
  animated?: boolean | undefined
  /** Called once, when the intro reaches the storm. */
  onStorm?: (() => void) | undefined
  /** The app's name, on the scene: the home's. */
  title?: ReactNode
  /** What else the screen holds, over the scene. */
  children?: ReactNode
}

/**
 * The den as a top screen. On the home it is the title screen (decisions 203
 * and 205): its intro, the storm with its lightning, the app's name. On a page
 * that has nothing of its own to show there it is the den at night, in the
 * rain, without the name, a bolt or a flash (decision 217). The rain hangs
 * with reduced motion, and with the Options' switch off (decision 206).
 */
export function DenScreen({ label, intro = false, lightning = false, animated, onStorm, title, children }: DenScreenProps) {
  const reduced = usePrefersReducedMotion()
  const chosen = useTitleAnimation() === 'on'
  return (
    <Screen kind="scene" label={label}>
      <TitleScene intro={intro} still={reduced || !(animated ?? chosen)} lightning={lightning} {...(onStorm ? { onStorm } : {})}>
        {title}
      </TitleScene>
      {children}
    </Screen>
  )
}
