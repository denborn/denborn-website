export const en = {
  app: {
    name: 'Denborn',
    tagline: 'A Pokémon tabletop RPG companion',
    notice:
      'Unofficial, non-commercial fan project. Pokémon and its artwork belong to Nintendo, Creatures Inc. and GAME FREAK inc.',
  },
  language: {
    label: 'Language',
    en: 'English',
    fr: 'Français',
  },
  system: {
    title: 'System check',
    appVersion: 'App version',
    engineVersion: 'Battle engine',
    offline: 'Offline use',
    offlinePreparing: 'Preparing…',
    offlineReady: 'Ready',
    offlineUnsupported: 'Not available in this browser',
    updateAvailable: 'A new version is ready.',
    updateNow: 'Update now',
    relay: 'Live relay',
    relayCheck: 'Check the relay',
    relayChecking: 'Checking…',
    relayOk: (ms: number) => `Reachable (${ms} ms)`,
    relayFailed: 'Not reachable',
    engine: 'Battle engine (GM device)',
    engineCheck: 'Check the engine',
    engineChecking: 'Loading…',
    engineOk: (rounds: number, ms: number) => `Working (${rounds} rounds in ${ms} ms)`,
    engineFailed: 'Not working',
  },
}

export type Messages = typeof en
