import { useSyncExternalStore } from 'react'
import { en, type Messages } from './en'
import { fr } from './fr'

export type Language = 'en' | 'fr'

export const LANGUAGES: readonly Language[] = ['en', 'fr']

const DICTIONARIES: Record<Language, Messages> = { en, fr }
const STORAGE_KEY = 'denborn/language'

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'fr'
}

/** A stored choice wins; otherwise French for French browsers, English for everyone else. */
export function pickInitialLanguage(stored: string | null, browserLanguages: readonly string[]): Language {
  if (isLanguage(stored)) return stored
  const first = browserLanguages[0]?.toLowerCase() ?? ''
  return first.startsWith('fr') ? 'fr' : 'en'
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked (private mode, site data disabled); the choice then lasts for the visit.
    return null
  }
}

let current: Language = pickInitialLanguage(readStored(), navigator.languages)
const listeners = new Set<() => void>()

export function setLanguage(language: Language): void {
  if (language === current) return
  current = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // See readStored.
  }
  document.documentElement.lang = language
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, () => current)
}

export function useMessages(): Messages {
  return DICTIONARIES[useLanguage()]
}

document.documentElement.lang = current
