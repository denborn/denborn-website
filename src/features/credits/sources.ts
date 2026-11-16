/**
 * Whose work the app shows or runs on, as the app's credits screen thanks
 * them (decisions 184 and 195): people and teams, not a list of packages.
 * Their pages are here; who they are and what is theirs are in the
 * dictionaries, in both languages. `CREDITS.md` at the root of the repository
 * is the fuller record, with licences and libraries: a test keeps every
 * address shown here among those it names.
 */

/** A page to visit: its name as its owner writes it, and its address. */
export interface CreditLink {
  name: string
  url: string
}

/** Those credited, in the order they are read. */
export const CREDIT_IDS = ['pokemon', 'showdown', 'pokeapi', 'corpus', 'checked', 'missingno', 'sheets', 'font'] as const
export type CreditId = (typeof CREDIT_IDS)[number]

export const CREDIT_LINKS: Readonly<Record<CreditId, readonly CreditLink[]>> = {
  pokemon: [],
  showdown: [
    { name: 'Pokémon Showdown', url: 'https://github.com/smogon/pokemon-showdown' },
    { name: 'smogon/sprites', url: 'https://github.com/smogon/sprites' },
    { name: '@pkmn', url: 'https://github.com/pkmn/ps' },
  ],
  pokeapi: [{ name: 'PokéAPI', url: 'https://pokeapi.co/' }],
  corpus: [{ name: 'Poké Corpus', url: 'https://github.com/abcboy101/poke-corpus' }],
  checked: [
    { name: 'Serebii.net', url: 'https://www.serebii.net/' },
    { name: 'PokémonDB', url: 'https://pokemondb.net/item' },
  ],
  missingno: [
    { name: 'MissingNo. GIF', url: 'https://www.deviantart.com/pokemon-ranger-sumi/art/MissingNo-GIF-667189987' },
    { name: 'Pokemon-Ranger-Sumi', url: 'https://www.deviantart.com/pokemon-ranger-sumi' },
  ],
  sheets: [{ name: 'The Spriters Resource', url: 'https://www.spriters-resource.com/' }],
  font: [{ name: 'VT323', url: 'https://fonts.google.com/specimen/VT323' }],
}

/** Who ripped the sprite sheets the look was studied on, as each sheet credits them. */
export const SHEET_RIPPERS = ['Ploaj', 'Floofy Panthar', 'MarioSMentor', 'DeepBlue PacificWaves', 'GameMaster12', 'PikachuMazzinga', 'Ikard', 'redblueyellow', 'lavistardust'] as const
