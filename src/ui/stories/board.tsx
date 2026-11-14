/** Helpers shared by the stories. Nothing here is part of the app. */
import { type ReactNode, createContext, use, useContext } from 'react'
import { loadDataPack } from '../../data/pack'
import type { DataPack } from '../../data/types'
import { en } from '../../i18n/en'
import { fr } from '../../i18n/fr'

export type Locale = 'en' | 'fr'

/** Set from Storybook's toolbar (see .storybook/preview.tsx). */
export const LocaleContext = createContext<Locale>('en')

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/** The app's battle wording, in the board's language. */
export function useBattleText(): typeof en.battle {
  return useLocale() === 'fr' ? fr.battle : en.battle
}

/** The real data pack, as the app loads it. Run `pnpm data` first. */
export function usePack(): DataPack {
  return use(loadDataPack())
}

/** A column as wide as a phone, where the kit is judged first. */
export function Phone({ children }: { children: ReactNode }) {
  return <div className="sb-phone">{children}</div>
}

/** Explanations on the board, in an ordinary font. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="sb-note">{children}</p>
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sb-section">
      <h2 className="sb-heading">{title}</h2>
      {children}
    </section>
  )
}
