---
paths:
  - "scripts/data/**/*.{ts,mjs,js}"
  - "src/data/**/*.{ts,json}"
  - "src/generated/**/*.{ts,json}"
---
# Pokémon data pack sourcing and normalization

- Generate data **at build time** from a pinned compatible Pokémon Showdown `@pkmn/dex`/`@pkmn/data` pair and optionally a pinned PokéAPI static-items export (e.g. `PokeAPI/api-data`), not live runtime API calls.
- `@pkmn/sim`, `@pkmn/dex` and `@pkmn/data` are pinned together at 0.10.12 (all three verified installed on 2026-11-14). On an upgrade, move all three to the same version, never to a release less than 14 days old, and re-run the data cross-check.
- The canonical normalized schema should use stable species/form/move/Ability/item IDs, Gen 9 rule version, source provenance/hash and schema version. Build deterministic ordering, stable JSON output and consistency tests.
- V0 filters **species debuting in Gen 1 (151)** while using allowed Gen 9 moves/Abilities/data; V1 expands through Gen 9. Alternate forms, transformations and supplementary universal learnset moves remain TBD unless explicitly approved.
- Precompute eligible learnsets by Pokémon/level/method as feasible, but don't claim every form/move is eligible without testing mechanics and restrictions.
- Account for names with punctuation, regional suffixes, genders, missing sprite variants, duplicate IDs, items absent from one source and conflicting item mappings; fail the build with a useful report, never drop silently.
- Display names/localized strings are presentation; IDs used by battle/save schemas must be stable. Avoid modification of upstream source packages at runtime.
- Supply attribution and provenance to support rights/security review. Do not confuse an upstream code MIT license with copyright clearance for the sprite art.

Sources: https://www.npmjs.com/package/@pkmn/dex ; https://www.npmjs.com/package/@pkmn/data ; https://github.com/PokeAPI/api-data
