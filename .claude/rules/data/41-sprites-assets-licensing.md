---
paths:
  - "src/assets/**/*"
  - "public/sprites/**/*"
  - "scripts/assets/**/*"
  - "src/components/PokemonSprite*.tsx"
---
# Pokémon Gen 5 sprites, icon packs and license discipline

- Sprite priority for battle: **exact Gen 5 animation** `gen5ani` (+ back where available); if absent, **Showdown `ani`** animated 3D-rendered-looking sprite (+ back). These are not GLB/FBX or interactive 3D models.
- Use authentic Showdown Pokémon icons, item sprites (`itemicons`), type/category and status visual assets where permitted; favor a cohesive Gen 5 UI, never generic icon substitution when these exist.
- Resolve by normalized `species/form/gender/shiny/view` -> explicit manifest map; do not assume every suffix or form filename exists. Check asset existence at build and runtime, log known fallback mapping only.
- Bundle and version approved assets for offline use; never hotlink each battle from Showdown CDN. Include `width`/`height`, loading states and alt text strategy; avoid layout shift and enormous decoded GIF memory.
- Keep build manifest output including source location, upstream commit/ref, modification, author/attribution and rights status. **Pokémon artwork is copyrighted**; Showdown code's MIT license does not grant all sprite art rights.
- **No automatic publication of unreviewed/community sprites** when rights are unclear. Seek separate permission or owner-approved replacements. Refer to the upstream sprite repo readme for caveats.
- Test missing assets (all generations/forms), 404s, high-DPI scaling, iOS Safari animation, reduced-motion static fallback and low-memory devices.

Sources: https://github.com/smogon/sprites ; https://play.pokemonshowdown.com/sprites/
