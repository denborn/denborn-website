/**
 * What the board's "To decide" page puts to the owner, in both languages.
 * Everything here is a PROPOSAL: it lives on the board until the owner rules
 * on it, and only then moves to the app's own dictionaries or into the kit.
 */
import type { Locale } from './board'

/** The heroic-fantasy looks proposed for the name on the title screen; `today` is the name as it is now, for comparison. */
export const TITLE_LOOKS = ['gilded', 'steel', 'blood', 'today'] as const
export type TitleLook = (typeof TITLE_LOOKS)[number]

export const TITLE_LOOK_NAMES: Record<TitleLook, string> = {
  gilded: 'A. Gilded: gold in bands, ink outline, deep-red shadow',
  steel: 'B. Forged steel: steel in bands, ink outline, crimson shadow',
  blood: 'C. Blood: red in bands, a gold edge, then the ink outline',
  today: 'As today: white, ink outline, FIGHT-red shadow',
}

export interface TitleWording {
  /** The words on the black bottom screen. The French has two proposals. */
  touchToStart: readonly string[]
  /** The Options' line, its hint and its two choices (decision 206). The English line is the one the owner chose it by. */
  titleAnimation: string
  titleAnimationHint: string
  titleAnimationChoices: { on: string; off: string }
  /** The credit for the plain (decision 204). */
  backdrop: { who: string; theirs: string }
}

export const titleWording: Record<Locale, TitleWording> = {
  en: {
    touchToStart: ['TOUCH TO START'],
    titleAnimation: 'Title screen animation',
    titleAnimationHint: 'The rain and the lightning of the first screen. Off, the scene stays still.',
    titleAnimationChoices: { on: 'ON', off: 'OFF' },
    backdrop: { who: 'Kyle Dove', theirs: 'The meadow of the first screen, where the den stands: one of Pokémon Showdown’s battle backdrops.' },
  },
  fr: {
    touchToStart: ['TOUCHEZ POUR COMMENCER', 'TOUCHEZ L’ÉCRAN'],
    titleAnimation: 'Animation de l’écran titre',
    titleAnimationHint: 'La pluie et les éclairs du premier écran. Sur NON, la scène reste immobile.',
    titleAnimationChoices: { on: 'OUI', off: 'NON' },
    backdrop: { who: 'Kyle Dove', theirs: 'La prairie du premier écran : l’un des décors de combat de Pokémon Showdown.' },
  },
}
