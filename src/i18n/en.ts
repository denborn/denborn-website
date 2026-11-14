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
    dataPack: 'Game data',
    dataPackLoading: 'Loading…',
    dataPackOk: (version: string, species: number, moves: number) => `${species} Pokémon, ${moves} moves (${version})`,
    dataPackFailed: 'Not available',
    engine: 'Battle engine (GM device)',
    engineCheck: 'Check the engine',
    engineChecking: 'Loading…',
    engineOk: (rounds: number, ms: number) => `Working (${rounds} rounds in ${ms} ms)`,
    engineFailed: 'Not working',
  },
  home: {
    characters: 'CHARACTERS',
    charactersHint: 'Create a Pokémon, see its sheet',
    campaigns: 'CAMPAIGNS',
    campaignsHint: 'For the game master',
    options: 'OPTIONS',
    optionsHint: 'Language, system check',
  },
  /** Creating a character, step by step. */
  creation: {
    title: 'New character',
    campaign: (name: string, level: number) => `${name} · starts at Lv. ${level}`,
    step: (current: number, of: number) => `Step ${current} of ${of}`,
    back: 'BACK',
    next: 'NEXT',
    preview: 'Your Pokémon so far',
    previewEmpty: 'Choose a Pokémon to see it here.',
    baseStats: 'Base stats',
    raised: 'raised by its nature',
    lowered: 'lowered by its nature',
    species: {
      title: 'Choose a Pokémon',
      search: 'Search by name',
      none: 'No Pokémon of this campaign has that name.',
    },
    identity: {
      title: 'Who is it?',
      nickname: 'Nickname',
      nicknameHint: "Up to 24 characters: letters, digits, space, ' - .",
      nicknameProblem: {
        empty: 'Give it a name.',
        'too-long': 'A name has 24 characters at most.',
        characters: "Only letters, digits, the space and ' - . can be used.",
      },
      gender: 'Gender',
      genders: { M: 'Male', F: 'Female', N: 'No gender' },
      share: (percent: number) => `${percent}%`,
      nature: 'Nature',
      natureHint: 'Rows raise a stat by a tenth, columns lower one. On the diagonal, nothing changes.',
      natureNeutral: 'In this campaign every Pokémon has a neutral nature.',
      raises: 'Raises',
      lowers: 'Lowers',
      natureLabel: (name: string, raised: string, lowered: string) => `${name}: raises ${raised}, lowers ${lowered}`,
      natureLabelNeutral: (name: string) => `${name}: changes nothing`,
      ability: 'Ability',
      hidden: 'Hidden Ability',
    },
  },
  /*
   * Battle wording. The command names come from the rules; the status letters
   * are the games'; Denborn's own messages were approved by the owner
   * (decision 86). The spoken labels and BACK / Next are plain interface
   * wording, listed as unconfirmed in DECISIONS.md.
   */
  battle: {
    commands: { fight: 'FIGHT', bag: 'BAG', run: 'RUN', switch: 'SWITCH' },
    back: 'BACK',
    next: 'Next',
    level: 'Lv.',
    hp: 'HP',
    pp: 'PP',
    hpLabel: (hp: number, max: number) => `HP ${hp} of ${max}`,
    gender: { M: 'male', F: 'female' },
    /** The letters on the badge, then the condition's name for assistive technology. */
    status: {
      psn: { badge: 'PSN', name: 'Poisoned' },
      tox: { badge: 'PSN', name: 'Badly poisoned' },
      brn: { badge: 'BRN', name: 'Burned' },
      par: { badge: 'PAR', name: 'Paralyzed' },
      slp: { badge: 'SLP', name: 'Asleep' },
      frz: { badge: 'FRZ', name: 'Frozen' },
    },
    category: { Physical: 'Physical', Special: 'Special', Status: 'Status' },
    /** The battle view: walking along a line, and the battlefield plan (decisions 87 to 91). */
    field: {
      battlefield: 'BATTLEFIELD',
      foes: 'FOES',
      party: 'PARTY',
      ability: 'Ability',
      item: 'Item',
      previous: (letter: string) => `Previous Pokémon: ${letter}`,
      next: (letter: string) => `Next Pokémon: ${letter}`,
      slot: (letter: string, name: string) => `${letter}: ${name}`,
      yours: 'your Pokémon',
      outOfReach: 'out of reach',
      /** The button on the plan that lists everything in effect, and that list. */
      more: 'MORE',
      effects: 'In effect',
      noEffects: 'Nothing is in effect.',
      turnsLeft: (turns: number) => (turns === 1 ? '1 turn left' : `${turns} turns left`),
      /** Whom an effect touches. */
      scope: { field: 'Whole field', foes: "Foes' side", party: 'Your side' },
      /** Said of a Pokémon that carries stat changes or effects of its own. */
      changed: 'under effects',
      /** The games' names for the weather. */
      weather: { rain: 'Rain', sun: 'Harsh sunlight', sand: 'Sandstorm', snow: 'Snow' },
    },
    agony: 'AGONY',
    agonyLabel: (stacks: number, of: number) => `Agonizing, ${stacks} of ${of} left`,
    messages: {
      prompt: (name: string) => `What will ${name} do?`,
      downed: (name: string) => `${name} is down!`,
      agonizing: (name: string) => `${name} is agonizing…`,
      hitWhileDown: (name: string) => `${name} was hit while down!`,
      died: (name: string) => `${name} died.`,
      revived: (name: string) => `${name} is back on its feet!`,
      bagUsed: (user: string, item: string, target: string) => `${user} used the ${item} on ${target}.`,
      bagBlocked: (user: string, item: string) => `${user} couldn't use the ${item}!`,
      bagNoEffect: (target: string) => `It won't have any effect on ${target}.`,
      switched: (a: string, b: string) => `${a} and ${b} switch their turns.`,
      ran: (a: string, b: string) => `${a} and ${b} swap places.`,
      timeout: (name: string) => `Time's up! ${name} has no choice but to struggle.`,
    },
  },
}

export type Messages = typeof en
