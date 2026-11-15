# Credits and sources

Denborn is an **unofficial, non-commercial fan project**. It is not affiliated with, endorsed by or sponsored by Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company. It is not sold and carries no advertising.

Pokémon, the Pokémon character names, and all Pokémon artwork, sprites and interface designs are the property of **Nintendo, Creatures Inc. and GAME FREAK inc.** None of it is ours, and nothing here should be read as a claim to it.

This file lists where everything that is not ours comes from. It is updated whenever a source is added.

## Battle engine and game data

| What | Source | Licence |
|---|---|---|
| Battle simulator | [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) by Smogon and its contributors, through [`@pkmn/sim`](https://github.com/pkmn/ps) | MIT (code) |
| Species, moves, Abilities, items, learnsets | Pokémon Showdown's data, through `@pkmn/dex` and `@pkmn/data` | MIT (code); the game facts belong to the games |
| Bag item list, French names, base EXP | [PokéAPI](https://pokeapi.co/)'s data tables ([PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi), commit `f841170`) | BSD 3-Clause (the repository); the game facts belong to the games |
| French descriptions of moves, Abilities and items, and both descriptions of items Showdown lacks | The games' own texts, as collected by PokéAPI | © Nintendo, Creatures Inc., GAME FREAK inc. Downloaded when the app is built; never stored in this repository |
| The ordinary battle messages, in English and French ("X used Y!", "It's super effective!") | The text of Pokémon Scarlet and Violet (© Nintendo, Creatures Inc., GAME FREAK inc.), as kept line by line in every language by [Poké Corpus](https://github.com/abcboy101/poke-corpus) (abcboy101 and contributors; the tool is GPL-3.0). Read at build time from a pinned version; only the ids of the lines used are in this repository (`data-sources/battle-messages.json`) | The games' text belongs to its owners |
| What each Bag item does | The project's own table (`data-sources/bag-effects.json`), with values checked against [Serebii](https://www.serebii.net/itemdex/) and [PokémonDB](https://pokemondb.net/item) | Ours; the values are the games' |

## Artwork shown in the app

Not stored in this repository. `scripts/assets/sync-sprites.ts` downloads it at build time, and `data-sources/sprites.lock.json` records each file's source and checksum.

| What | Source | Rights |
|---|---|---|
| Pokémon battle sprites (Gen 5 animated, with the `ani` set as fallback), Pokémon icons, item icons, move-category icons | [Pokémon Showdown's sprite collection](https://play.pokemonshowdown.com/sprites/), maintained in [smogon/sprites](https://github.com/smogon/sprites) | "The sprites themselves are property of Nintendo / Game Freak / The Pokémon Company" (smogon/sprites README) |
| Icons of the 45 items Showdown does not have (Potion, Revive, Linking Cord…) | [PokéAPI sprites](https://github.com/PokeAPI/sprites), commit `1dd55c0` | "All image contents within are Copyright The Pokémon Company" (PokéAPI sprites licence file) |

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

The art direction (milestone 3) was measured on four of them: Battle HUD, HP Bars, Party Screen and the Black 2 / White 2 Options Screen. The other sheets in the folder were not used.

Other references, consulted and not redistributed: the official Pokémon White and White 2 instruction manuals (Nintendo), and screenshots published by [Serebii.net](https://www.serebii.net/).

## Fonts

| Font | By | Licence |
|---|---|---|
| [VT323](https://fonts.google.com/specimen/VT323), the interface's font | Copyright 2011, The VT323 Project Authors (Peter Hull), packaged by [Fontsource](https://fontsource.org/) | SIL Open Font License 1.1 |

DotGothic16, Pixelify Sans and Tiny5 (all SIL Open Font License) were shown beside it on the design board when the owner chose; they are not used.

## Software

The libraries the app is built with are listed in `package.json`, each under its own licence.

One of them ships a compiled engine inside the app: QR codes are read, in browsers that have no reader of their own, by [ZXing-C++](https://github.com/zxing-cpp/zxing-cpp) (Apache-2.0) compiled to WebAssembly by [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (MIT), through [barcode-detector](https://github.com/Sec-ant/barcode-detector) (MIT).
