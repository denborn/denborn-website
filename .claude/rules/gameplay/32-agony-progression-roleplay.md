---
paths:
  - "src/features/characters/**/*.{ts,tsx}"
  - "src/features/progress/**/*.{ts,tsx}"
  - "src/battle/**/*.ts"
---
# Characters, progress and agony

- Roleplay D100 only; six chosen attributes: Strength, Dexterity, Endurance, Perception, Charisma, Intelligence. Starting budget 265 points across six (decision 307; 300 before, and characters made with 300 stay as made), each 5–75; points may be kept at creation and placed later, still no higher than 75 (`src/game-rules/attributes.ts`); +1 roleplay point per level, up to 95. No roleplay stats affect combat formulas.
- Combat levels 1–100; all species use shared Medium Fast EXP progression. At eligible level, evolution is player-initiated. Ability and move reconfiguration only at character creation or a Pokémon Center rest.
- IVs and EVs are placed as one resource, Training Value (decision 286, `src/game-rules/training.ts`): 1 TV = 1 IV = 4 EVs, 0 to 94 per stat, and by level L a budget of `floor(186*L/100) + floor(floor(510*L/100)/4)`; same for players and GM. A Pokémon still keeps IVs and EVs for the engine. This is **project-specific**, not the factual Emerald Exceeded mechanic. Points are never respecced: only newly gained points are placed (decided 2026-11-14).
- Standard in-app Gen 9 stats/move and Ability formulas apply. Inventories and Pokédollars via Pokéshops; prices/common extra moves/starting pack contents require owner approval.
- Agony follows the ten rules the owner set on 2026-11-14, quoted in `DECISIONS.md` 1.1 ("Agony"), plus the later rulings in 1.2 (spread moves, redirection, random targets, allies' hits, Wide Guard and Quick Guard, sitting out the next encounter). Implement exactly those; anything they do not cover is an owner decision.
- For missing mechanics, display GM-managed/TBD resolution rather than inventing features. Keep stage-specific, owner-approved game-rule changes out of utility modules and UI.
