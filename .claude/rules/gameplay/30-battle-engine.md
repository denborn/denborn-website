---
paths:
  - "src/battle/**/*.{ts,tsx}"
  - "src/engine/**/*.ts"
  - "src/sim/**/*.ts"
---
# Pokémon Showdown-derived combat engine

- Gen 9 Pokémon battle mechanics are the baseline: types, original move logic, damage, accuracy, priority, PP, statuses, and Abilities must run through `@pkmn/sim` (or a proven compatible fork/adapter), not parallel handwritten formulas.
- Browser-bundle locally with Vite. Simulator is client-side, and only the **GM client** commits authoritative state. Players may load code offline for character data/preview; cannot locally claim a live battle result.
- Keep modifications explicit and localized: six equipped moves, variable-width 2 lines of A/B/C/... slots, custom free Switch (mutual Speed exchange for round preserving move priority), free Run (reposition before lock), Agony at 0 HP and GM-created extra enemy turns.
- Simulator default four move slots, 1v1/2v2/3v3 targeting and move submission/turn internals may not support overrides. Prove each in `docs/INTEGRATION_SPIKES.md`; never remove a spec feature to silence incompatibility.
- Do not change `speed` stat data as a shortcut without testing speed-dependent moves and effects; isolate initiative order from move calculations if owner's pending decision requires it.
- Use seeded RNG and record inputs/results so reload/reconnect does not reroll the same command. Preserve engine/version boundary in save snapshots.
- Compare adapter results against canonical simulator fixtures for regular interactions, including priorities, type effectiveness, hazards and move target flags.
- Any truly unsupported mechanic must produce an explicit engineering blocker, not a silent fallback to an invented implementation.

Sources: https://www.npmjs.com/package/@pkmn/sim ; https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
