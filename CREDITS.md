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
| Which message each line of the battle engine gets (a start, an end, damage, a block… of which effect) | The way Pokémon Showdown reads its own log: `battle-text-parser.ts` of [its client](https://github.com/smogon/pokemon-showdown-client) (Guangcong Luo and contributors), followed in `src/features/battle/round-script.ts`; and Showdown's English message templates, shipped with `@pkmn/sim`, used while preparing `data-sources/battle-messages.json` to find the games' line for each | MIT (that file and the templates) |
| How Pokémon Showdown lays a fight's scene, read to lay ours (`src/ui/scene-camera.ts`; `DECISIONS.md` 271, 281 and 283) | [Its client](https://github.com/smogon/pokemon-showdown-client) at commit `1cf9b38`: `BattleScene.pos` in `play.pokemonshowdown.com/src/battle-animations.ts` and `.backdrop` in `style/battle.css`. Its two points for the Pokémon are no longer followed (decision 283); one thing of it is kept: the near size of its later set of sprites is three quarters of the Gen 5 set's. No code of the client is in the app. | `battle-animations.ts` is MIT (Guangcong Luo; its header), `battle.css` GPLv2 (its header), the client as a whole AGPL-3.0. |
| The battle messages, in English and French ("X used Y!", "It's super effective!", what moves, Abilities and held items do) | The text of Pokémon Scarlet and Violet (© Nintendo, Creatures Inc., GAME FREAK inc.), as kept line by line in every language by [Poké Corpus](https://github.com/abcboy101/poke-corpus) (abcboy101 and contributors; the tool is GPL-3.0). Read at build time from a pinned version; only the ids of the lines used are in this repository (`data-sources/battle-messages.json`) | The games' text belongs to its owners |
| What each Bag item does | The project's own table (`data-sources/bag-effects.json`), with values checked against [Serebii](https://www.serebii.net/itemdex/) and [PokémonDB](https://pokemondb.net/item) | Ours; the values are the games' |

## Artwork shown in the app

Not stored in this repository, with three exceptions the owner made (MissingNo., the battle bases and the pieces of a fight's two screens, last rows). `scripts/assets/sync-sprites.ts` downloads the rest at build time, and `data-sources/sprites.lock.json` records each file's source and checksum (`data-sources/backdrops.lock.json` for the meadow and the damp cave, `data-sources/battle-backdrops.lock.json` for the backgrounds of a fight).

| What | Source | Rights |
|---|---|---|
| Pokémon battle sprites (Gen 5 animated, with the `ani` set as fallback), Pokémon icons, item icons, move-category icons | [Pokémon Showdown's sprite collection](https://play.pokemonshowdown.com/sprites/), maintained in [smogon/sprites](https://github.com/smogon/sprites) | "The sprites themselves are property of Nintendo / Game Freak / The Pokémon Company" (smogon/sprites README) |
| Icons of the 45 items Showdown does not have (Potion, Revive, Linking Cord…) | [PokéAPI sprites](https://github.com/PokeAPI/sprites), commit `1dd55c0` | "All image contents within are Copyright The Pokémon Company" (PokéAPI sprites licence file) |
| The inside of the den, behind the list of characters (`fx/bg-dampcave.png`, recoloured by the app in the den's own colours) | Another of [Pokémon Showdown](https://play.pokemonshowdown.com/)'s battle backdrops, the damp cave, fetched at build time and pinned in `data-sources/backdrops.lock.json`; Showdown's [credits page](https://pokemonshowdown.com/credits) names Kyle Dove for the battle backdrops | Kyle Dove's, as the meadow (owner's decisions, `DECISIONS.md` 244 and 253). |
| The backgrounds of a fight, one picked by the game master in each encounter (`fx/bg-*.png`, fifteen: forest, earthy cave, desert, deep sea, damp cave, city, beach, beach shore, meadow, ice cave, mountain, volcano cave, thunder plains, route, river) | Fifteen of the battle backdrops of [Pokémon Showdown](https://play.pokemonshowdown.com/), drawn by Kyle Dove ("Kyle Dove – Art (battle backdrops)" on [Showdown's credits page](https://pokemonshowdown.com/credits)), fetched at build time and pinned in `data-sources/backdrops.lock.json`. The app draws each on its own pixels, enlarged to cover the screen. | Kyle Dove's. The credits page shows no licence to reuse them; used by the owner's decision (`DECISIONS.md` 268), as the meadow is (`DECISIONS.md` 204). |
| The meadow of the title screen, where the den stands (`fx/bg-meadow.png`) | One of the battle backdrops of [Pokémon Showdown](https://play.pokemonshowdown.com/), drawn by Kyle Dove: "Kyle Dove – Art (battle backdrops)" on [Showdown's credits page](https://pokemonshowdown.com/credits), read on 16 November 2026 | Kyle Dove's. The credits page shows no licence to reuse it; used by the owner's decision (`DECISIONS.md` 204). |
| MissingNo., shown in the place of a Pokémon whose sprite is not there (`public/missingno.gif`, the one piece of artwork stored in this repository) | ["MissingNo. GIF"](https://www.deviantart.com/pokemon-ranger-sumi/art/MissingNo-GIF-667189987) by [Pokemon-Ranger-Sumi](https://www.deviantart.com/pokemon-ranger-sumi) on DeviantArt, published 5 March 2017, supplied by the project's owner. Changed for the app: brought back from 1100 × 1100 to its own pixels (45 × 50), the white around it made see-through, its colours brought down to 31, frames that repeat merged into longer ones (same animation). | "© 2017 - 2026 Pokemon-Ranger-Sumi" (the picture's page, which shows no licence to reuse it; used by the owner's decision, `DECISIONS.md` 187). MissingNo. itself is from Pokémon Red and Blue, © Nintendo, Creatures Inc., GAME FREAK inc. |
| The grounds the characters stand on in the list of characters (`public/battle-bases.png`, eighteen ovals; stored in this repository by the owner's decision, `DECISIONS.md` 242) | The "Battle Bases" sheet of [Pokémon HeartGold / SoulSilver on The Spriters Resource](https://www.spriters-resource.com/ds_dsi/pokemonheartgoldsoulsilver), "Ripped by Tsuka" as the sheet says, supplied by the project's owner. Changed for the app: the eighteen whole ovals cut out, the flat ground around each made see-through, set one above the other. | The bases are from Pokémon HeartGold and SoulSilver, © Nintendo, Creatures Inc., GAME FREAK inc.; the rip is Tsuka's, credit asked on the sheet ("Credits are appreciated!"). |
| The pieces a fight's two screens are drawn with: the two halves of the touch screen's ball (`public/battle-touch.png`), its three tiles, the two HP plates and the battery marks (`public/battle-hud.png`); stored in this repository by the owner's decision (`DECISIONS.md` 255) | The "Battle HUD" sheet of [Pokémon Black / White on The Spriters Resource](https://www.spriters-resource.com/ds_dsi/pokemonblackwhite/), "Ripped by Ploaj" as the sheet says, supplied by the project's owner. Changed for the app by `scripts/assets/cut-battle-hud.ts`: the pieces cut out, the sheet's ground around them made see-through, the ball cut into its two halves without the ground between them (`DECISIONS.md` 259), and the words the games drew into them painted over (BAG, RUN and POKéMON on the tiles, "HP" on the plates, the stroke between the two HP numbers), since the app writes its own in both languages (`DECISIONS.md` 256). | The pieces are from Pokémon Black and White, © 2010 Nintendo, Creatures Inc., GAME FREAK inc.; the rip is Ploaj's. |

## The app's icon

| What | Source | Rights |
|---|---|---|
| The pink grid ball (`public/icon-32.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, and its rocking poses in `public/emblem-frames.png`) | Drawn by the project as pixel art, seen from the front, after a picture supplied by the project's owner (`DECISIONS.md` 209 and 212); its colours are read on that picture. The ground behind it is the project's own redrawing of the ground of the Pokémon Black game icon (see "Design references"). | The project's own. |

## The den of the title screen

| What | Source | Rights |
|---|---|---|
| The ring of rocks and its light (`public/den-*.svg`) | Drawn by the project as rectangles, by `scripts/assets/draw-den.ts`, after a screenshot of a den of Pokémon Sword / Shield supplied by the project's owner (`DECISIONS.md` 210): the screenshot gave the idea, the arrangement of the rocks and their colours; no pixel of it is copied, and it is not kept in the repository. | The drawing is the project's own. Dens are a creation of Pokémon Sword / Shield (© 2019 Pokémon, Nintendo, Creatures Inc., GAME FREAK inc.). |

## Design references

Used only to study the look of Pokémon Black / White and Black 2 / White 2 (Nintendo DS, © 2010–2012 Nintendo, Creatures Inc., GAME FREAK inc.). They are kept in a git-ignored folder and are **not redistributed**. The app's interface is redrawn from scratch and copies no pixels from them, with two exceptions the owner made, both listed under "Artwork shown in the app": the battle bases, and the pieces of a fight's two screens, cut from the Battle HUD sheet (`DECISIONS.md` 242 and 255).

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
| Game Icons | Black / White | lavistardust |

The art direction (milestone 3) was measured on four of them: Battle HUD, HP Bars, Party Screen and the Black 2 / White 2 Options Screen. The ground of the app's icon was measured on a fifth, Game Icons (the Pokémon Black icon: black, with a chequer of small blocks that fades downwards) and redrawn; its ball is not used. The other sheets in the folder were not used.

Other references, consulted and not redistributed: the official Pokémon White and White 2 instruction manuals (Nintendo), and screenshots published by [Serebii.net](https://www.serebii.net/).

## Fonts

| Font | By | Licence |
|---|---|---|
| [VT323](https://fonts.google.com/specimen/VT323), the interface's font | Copyright 2011, The VT323 Project Authors (Peter Hull), packaged by [Fontsource](https://fontsource.org/) | SIL Open Font License 1.1 |

DotGothic16, Pixelify Sans and Tiny5 (all SIL Open Font License) were shown beside it on the design board when the owner chose; they are not used.

## Software

The libraries the app is built with are listed in `package.json`, each under its own licence.

One of them ships a compiled engine inside the app: QR codes are read, in browsers that have no reader of their own, by [ZXing-C++](https://github.com/zxing-cpp/zxing-cpp) (Apache-2.0) compiled to WebAssembly by [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (MIT), through [barcode-detector](https://github.com/Sec-ant/barcode-detector) (MIT).
