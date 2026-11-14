# Credits and sources

Denborn is an **unofficial, non-commercial fan project**. It is not affiliated with, endorsed by or sponsored by Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company. It is not sold and carries no advertising.

Pokémon, the Pokémon character names, and all Pokémon artwork, sprites and interface designs are the property of **Nintendo, Creatures Inc. and GAME FREAK inc.** None of it is ours, and nothing here should be read as a claim to it.

This file lists where everything that is not ours comes from. It is updated whenever a source is added.

## Battle engine and game data

| What | Source | Licence |
|---|---|---|
| Battle simulator | [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) by Smogon and its contributors, through [`@pkmn/sim`](https://github.com/pkmn/ps) | MIT (code) |
| Species, moves, Abilities, items, learnsets | Pokémon Showdown's data, through `@pkmn/dex` and `@pkmn/data` | MIT (code); the game facts belong to the games |
| Bag items, French names and descriptions, base EXP | [PokéAPI](https://pokeapi.co/) ([api-data](https://github.com/PokeAPI/api-data), [pokeapi](https://github.com/PokeAPI/pokeapi)) | Recorded with the pinned snapshot in milestone 2 |

## Artwork shown in the app

Not stored in this repository. A script downloads it at build time, and a manifest records each file's source URL and checksum (from milestone 2).

| What | Source | Rights |
|---|---|---|
| Pokémon battle sprites (Gen 5 animated, with the `ani` set as fallback), Pokémon icons, item icons, type and category icons | [Pokémon Showdown's sprite collection](https://play.pokemonshowdown.com/sprites/), maintained in [smogon/sprites](https://github.com/smogon/sprites) | "The sprites themselves are property of Nintendo / Game Freak / The Pokémon Company" (smogon/sprites README) |
| Item icons Showdown does not have | [PokéAPI sprites](https://github.com/PokeAPI/sprites) | "All image contents within are Copyright The Pokémon Company" (PokéAPI sprites licence file) |

## Design references

Used only to study the look of Pokémon Black / White and Black 2 / White 2 (Nintendo DS, © 2010–2012 Nintendo, Creatures Inc., GAME FREAK inc.). They are kept in a git-ignored folder and are **not redistributed**. The app's interface is redrawn from scratch; it copies no pixels from them.

Sprite sheets from [The Spriters Resource](https://www.spriters-resource.com/) ([Black / White](https://www.spriters-resource.com/ds_dsi/pokemonblackwhite/), [Black 2 / White 2](https://www.spriters-resource.com/ds_dsi/pokemonblack2white2/)), with the rippers credited on each sheet:

| Sheet | Game | Ripped by |
|---|---|---|
| Battle HUD | Black / White | Ploaj |
| Party Screen | Black / White | Floofy Panthar |
| Trainer Card | Black / White | MarioSMentor |
| Miscellaneous Icons | Black / White | credited on the sheet to Smogon's sprite project and KleinStudio's Pokémon Essentials BW |
| Pokemart Screen Rip | Black / White, Black 2 / White 2 | DeepBlue PacificWaves |
| HP Bars | Black 2 / White 2 | GameMaster12 |
| Bags | Black 2 / White 2 | Ploaj |
| Options Screen | Black 2 / White 2 | PikachuMazzinga |
| Save Menu | Black 2 / White 2 | Ikard |
| VS Backgrounds | Black 2 / White 2 | redblueyellow |

The remaining sheets in the folder are credited here when they are studied for the art direction (milestone 3).

Other references, consulted and not redistributed: the official Pokémon White and White 2 instruction manuals (Nintendo), and screenshots published by [Serebii.net](https://www.serebii.net/).

## Fonts

None bundled yet. The font is chosen with the owner in milestone 3 and credited here with its licence.

## Software

The libraries the app is built with are listed in `package.json`, each under its own licence.
