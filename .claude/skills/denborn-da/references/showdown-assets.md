# Graphics shown in the app

Downloaded when the app is built by `scripts/assets/sync-sprites.ts` into `public/sprites/` (git-ignored), each file pinned by SHA-256 in `data-sources/sprites.lock.json`. Never committed; credited in `CREDITS.md`.

| Served at | From | Shape |
|---|---|---|
| `/sprites/gen5ani/<id>.gif`, `/sprites/gen5ani-back/<id>.gif` | play.pokemonshowdown.com/sprites | Animated GIF, size varies by species (up to 96 × 96). `<id>-f.gif` for the 22 species with a female sprite. |
| `/sprites/ani/…`, `/sprites/ani-back/…` | same | Fallback set for a species without a Gen 5 sprite. |
| `/sprites/pokemonicons-sheet.png` | same | 480 px wide; cells 40 × 30, 12 a row, cell number = Pokédex number. |
| `/sprites/itemicons-sheet.png` | same | 384 px wide; cells 24 × 24, 16 a row, cell number from the data pack (`icon.index`). |
| `/sprites/categories/<Category>.png` | same | 32 × 14: a symbol in the middle of a coloured band, no words. The middle 16 pixels are the symbol alone. |
| `/sprites/pokeapi/sprites/items/<file>.png` | PokéAPI's sprite repository | For the items Showdown lacks. 30 × 30, except the Linking Cord (128 × 128, drawn at 30 × 30). |

A form (a Mega, an Unown that is not A) has no Pokédex number to be found by: its cell comes after every species, in an order of Showdown's, and its number is the one Showdown's client gives it (`BattlePokemonIconIndexes`, play.pokemonshowdown.com/src/battle-dex-data.ts). The few the app shows are in `MENU_POKEMON` (`src/data/sprites.ts`), each with the box its drawing takes in its cell; look at each cell, and read each box again, whenever the sheet is pinned anew.

Every address is built by `src/data/sprites.ts` from the data pack (`species.sprite`, `species.femaleSprite`, `item.icon`). Do not interpolate a name yourself: forms, genders and missing sprites are exactly where guessing fails.

Drawing: pass a `scale` (DS pixels per sprite pixel) to the component; it snaps to whole device pixels. The one exception is the main menu's Pokémon (`MenuPokemonIcon`), drawn at an exact size so that the menu is the same on every screen (decision 232): do not copy it elsewhere without the owner's word. Sprites animate on their own; they stop for a downed Pokémon and for anyone who prefers reduced motion.

Showdown's type labels (`types/<Type>.png`) are **not** used: they are images with English words, and the owner ruled that the app draws its own in both languages (decision 85). Use `TypeLabel`.
