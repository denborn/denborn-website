# Graphics shown in the app

Downloaded when the app is built by `scripts/assets/sync-sprites.ts` into `public/sprites/` (git-ignored), each file pinned by SHA-256 in `data-sources/sprites.lock.json`. Never committed; credited in `CREDITS.md`.

| Served at | From | Shape |
|---|---|---|
| `/sprites/gen5ani/<id>.gif`, `/sprites/gen5ani-back/<id>.gif` | play.pokemonshowdown.com/sprites | Animated GIF, size varies by species (up to 96 × 96). `<id>-f.gif` for the 22 species with a female sprite. |
| `/sprites/ani/…`, `/sprites/ani-back/…` | same | Fallback set for a species without a Gen 5 sprite. |
| `/sprites/pokemonicons-sheet.png` | same | 480 px wide; cells 40 × 30, 12 a row, cell number = Pokédex number. |
| `/sprites/itemicons-sheet.png` | same | 384 px wide; cells 24 × 24, 16 a row, cell number from the data pack (`icon.index`). |
| `/sprites/types/<Type>.png`, `/sprites/categories/<Category>.png` | same | 32 × 14, English words drawn in the image. |
| `/sprites/pokeapi/sprites/items/<file>.png` | PokéAPI's sprite repository | For the items Showdown lacks. 30 × 30, except the Linking Cord (128 × 128, drawn at 30 × 30). |

Every address is built by `src/data/sprites.ts` from the data pack (`species.sprite`, `species.femaleSprite`, `item.icon`). Do not interpolate a name yourself: forms, genders and missing sprites are exactly where guessing fails.

Drawing: pass a `scale` (DS pixels per sprite pixel) to the component; it snaps to whole device pixels. Sprites animate on their own; they stop for a downed Pokémon and for anyone who prefers reduced motion.
