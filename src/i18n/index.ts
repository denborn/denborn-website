import { useSyncExternalStore } from 'react'
import { createDeviceChoice } from '../storage/device-choice'
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

const choice = createDeviceChoice(STORAGE_KEY, (stored) => pickInitialLanguage(stored, navigator.languages))

export function setLanguage(language: Language): void {
  // The page says which language it is in before the screens are told to change.
  document.documentElement.lang = language
  choice.set(language)
}

export function useLanguage(): Language {
  return useSyncExternalStore(choice.subscribe, choice.get)
}

export function useMessages(): Messages {
  return DICTIONARIES[useLanguage()]
}

document.documentElement.lang = choice.get()
