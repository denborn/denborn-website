/**
 * The wording shown on the style board, in both languages.
 *
 * Only "<name> is agonizing…" and the four English command names come from the
 * owner. Everything else here is a PROPOSAL: it lives on the board until the
 * owner rules on it, and only then moves to the app's own dictionaries.
 */
import type { CommandId, StatusId } from '..'

export interface BoardText {
  commands: Record<CommandId, string>
  back: string
  level: string
  hp: string
  pp: string
  hpLabel: (hp: number, max: number) => string
  gender: { M: string; F: string }
  /** Letters on the badge, then the condition's full name. */
  status: Record<StatusId, readonly [string, string]>
  agony: string
  agonyLabel: (stacks: number, of: number) => string
  next: string
  messages: {
    prompt: (name: string) => string
    used: (user: string, move: string) => string
    downed: (name: string) => string
    agonizing: (name: string) => string
    hitWhileDown: (name: string) => string
    died: (name: string) => string
    revived: (name: string) => string
    bagUsed: (user: string, item: string, target: string) => string
    bagBlocked: (user: string, item: string) => string
    bagNoEffect: (target: string) => string
    switched: (a: string, b: string) => string
    ran: (a: string, b: string) => string
    timeout: (name: string) => string
  }
}

export const boardText: Record<'en' | 'fr', BoardText> = {
  en: {
    commands: { fight: 'FIGHT', bag: 'BAG', run: 'RUN', switch: 'SWITCH' },
    back: 'BACK',
    level: 'Lv.',
    hp: 'HP',
    pp: 'PP',
    hpLabel: (hp, max) => `HP ${hp} of ${max}`,
    gender: { M: 'male', F: 'female' },
    status: {
      psn: ['PSN', 'Poisoned'],
      tox: ['PSN', 'Badly poisoned'],
      brn: ['BRN', 'Burned'],
      par: ['PAR', 'Paralyzed'],
      slp: ['SLP', 'Asleep'],
      frz: ['FRZ', 'Frozen'],
    },
    agony: 'AGONY',
    agonyLabel: (stacks, of) => `Agonizing, ${stacks} of ${of} left`,
    next: 'Next',
    messages: {
      prompt: (name) => `What will ${name} do?`,
      used: (user, move) => `${user} used ${move}!`,
      downed: (name) => `${name} is down!`,
      agonizing: (name) => `${name} is agonizing…`,
      hitWhileDown: (name) => `${name} was hit while down!`,
      died: (name) => `${name} died.`,
      revived: (name) => `${name} is back on its feet!`,
      bagUsed: (user, item, target) => `${user} used the ${item} on ${target}.`,
      bagBlocked: (user, item) => `${user} couldn't use the ${item}!`,
      bagNoEffect: (target) => `It won't have any effect on ${target}.`,
      switched: (a, b) => `${a} and ${b} switch their turns.`,
      ran: (a, b) => `${a} and ${b} swap places.`,
      timeout: (name) => `Time's up! ${name} has no choice but to struggle.`,
    },
  },
  fr: {
    commands: { fight: 'ATTAQUE', bag: 'SAC', run: 'FUITE', switch: 'ÉCHANGE' },
    back: 'RETOUR',
    level: 'N.',
    hp: 'PV',
    pp: 'PP',
    hpLabel: (hp, max) => `PV ${hp} sur ${max}`,
    gender: { M: 'mâle', F: 'femelle' },
    status: {
      psn: ['PSN', 'Empoisonné'],
      tox: ['PSN', 'Gravement empoisonné'],
      brn: ['BRÛ', 'Brûlé'],
      par: ['PAR', 'Paralysé'],
      slp: ['SOM', 'Endormi'],
      frz: ['GEL', 'Gelé'],
    },
    agony: 'AGONIE',
    agonyLabel: (stacks, of) => `Agonise, ${stacks} sur ${of} restants`,
    next: 'Suite',
    messages: {
      prompt: (name) => `Que doit faire ${name} ?`,
      used: (user, move) => `${user} utilise ${move} !`,
      downed: (name) => `${name} est à terre !`,
      agonizing: (name) => `${name} agonise…`,
      hitWhileDown: (name) => `${name} est frappé à terre !`,
      died: (name) => `${name} est mort.`,
      revived: (name) => `${name} se relève !`,
      bagUsed: (user, item, target) => `${user} utilise ${item} sur ${target}.`,
      bagBlocked: (user, item) => `${user} ne peut pas utiliser ${item} !`,
      bagNoEffect: (target) => `Ça n'aura aucun effet sur ${target}.`,
      switched: (a, b) => `${a} et ${b} échangent leur tour.`,
      ran: (a, b) => `${a} et ${b} échangent leur place.`,
      timeout: (name) => `Temps écoulé ! ${name} n'a d'autre choix que Lutte.`,
    },
  },
}
