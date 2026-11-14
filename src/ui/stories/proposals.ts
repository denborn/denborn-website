/**
 * Wording shown on the board that the owner has not ruled on yet. It stays
 * here, used by the stories only, and moves to src/i18n when it is approved.
 */
export interface FieldWording {
  /** The button that opens the battlefield plan. */
  field: string
  foes: string
  party: string
  ability: string
  item: string
  previous: (letter: string) => string
  next: (letter: string) => string
  slot: (letter: string, name: string) => string
  yours: string
  outOfReach: string
}

export const fieldWording: Record<'en' | 'fr', FieldWording> = {
  en: {
    field: 'FIELD',
    foes: 'FOES',
    party: 'PARTY',
    ability: 'Ability',
    item: 'Item',
    previous: (letter) => `Previous Pokémon: ${letter}`,
    next: (letter) => `Next Pokémon: ${letter}`,
    slot: (letter, name) => `${letter}: ${name}`,
    yours: 'your Pokémon',
    outOfReach: 'out of reach',
  },
  fr: {
    field: 'TERRAIN',
    foes: 'ENNEMIS',
    party: 'ÉQUIPE',
    ability: 'Talent',
    item: 'Objet',
    previous: (letter) => `Pokémon précédent\u00a0: ${letter}`,
    next: (letter) => `Pokémon suivant\u00a0: ${letter}`,
    slot: (letter, name) => `${letter}\u00a0: ${name}`,
    yours: 'votre Pokémon',
    outOfReach: 'hors de portée',
  },
}
