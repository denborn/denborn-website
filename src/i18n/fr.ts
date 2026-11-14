import type { Messages } from './en'

export const fr: Messages = {
  app: {
    name: 'Denborn',
    tagline: 'Un compagnon de JDR sur table Pokémon',
    notice:
      'Projet de fans non officiel et non commercial. Pokémon et ses illustrations appartiennent à Nintendo, Creatures Inc. et GAME FREAK inc.',
  },
  language: {
    label: 'Langue',
    en: 'English',
    fr: 'Français',
  },
  system: {
    title: 'Vérification du système',
    appVersion: "Version de l'application",
    engineVersion: 'Moteur de combat',
    offline: 'Utilisation hors ligne',
    offlinePreparing: 'Préparation…',
    offlineReady: 'Prête',
    offlineUnsupported: 'Indisponible dans ce navigateur',
    updateAvailable: 'Une nouvelle version est prête.',
    updateNow: 'Mettre à jour',
    relay: 'Relais en direct',
    relayCheck: 'Vérifier le relais',
    relayChecking: 'Vérification…',
    relayOk: (ms: number) => `Joignable (${ms} ms)`,
    relayFailed: 'Injoignable',
    engine: 'Moteur de combat (appareil du MJ)',
    engineCheck: 'Vérifier le moteur',
    engineChecking: 'Chargement…',
    engineOk: (rounds: number, ms: number) => `Fonctionne (${rounds} tours en ${ms} ms)`,
    engineFailed: 'Ne fonctionne pas',
  },
}
