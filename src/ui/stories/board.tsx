/** Helpers shared by the stories. Nothing here is part of the app. */
import { type ReactNode, createContext, use, useContext } from 'react'
import { loadDataPack } from '../../data/pack'
import type { DataPack } from '../../data/types'
import { type BoardText, boardText } from './proposals'

export type Locale = 'en' | 'fr'

/** Set from Storybook's toolbar (see .storybook/preview.tsx). */
export const LocaleContext = createContext<Locale>('en')

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useBoardText(): BoardText {
  return boardText[useLocale()]
}

/** The real data pack, as the app loads it. Run `pnpm data` first. */
export function usePack(): DataPack {
  return use(loadDataPack())
}

/**
 * The fonts the owner chooses among. `scale` evens out their letter heights,
 * so that each is judged at the size it would really be used at.
 */
export const FONT_CANDIDATES = {
  dotgothic16: { name: 'DotGothic16', family: "'DotGothic16', system-ui, sans-serif", scale: 1 },
  pixelify: { name: 'Pixelify Sans', family: "'Pixelify Sans', system-ui, sans-serif", scale: 1.25 },
  vt323: { name: 'VT323', family: "'VT323', ui-monospace, monospace", scale: 1.4 },
  tiny5: { name: 'Tiny5', family: "'Tiny5', system-ui, sans-serif", scale: 1.3 },
} as const

export type FontId = keyof typeof FONT_CANDIDATES

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
