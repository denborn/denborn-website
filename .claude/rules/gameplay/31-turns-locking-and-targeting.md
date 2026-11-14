---
paths:
  - "src/features/battle/**/*.{ts,tsx}"
  - "src/battle/**/*.ts"
---
# Battle flow — submitted actions and slots

- Show two **opposing lines**, each with as many positions as members on that team; enemies prepositioned by GM. Slots are `A`, `B`, `C`, `D`, ... as needed; no grid, geometric distance or arbitrary radius system.
- Each player sees their own initiative information; do not publish all initiative orders if UI spec says hide other positions. Actions are **simultaneously locked**, then resolved by Gen 9 move priority and Speed.
- **Moves and Bag lock the action**. **Run is free repositioning** until everyone has locked; they can unlock if others are still unlocked. **Switch is free mutual-consent Speed exchange** for this round, without negating move priority.
- Each choice is a typed intent; validate actor, phase, legal targets/moves, inventory/PP, lock state and revision in GM engine. Never accept an unlock after full-lock resolution has started.
- Start and continue rounds with explicit phase state. Do not let animation change the logical phase.
- Reach on lines of any length was decided on 2026-11-14 (`DECISIONS.md` 1.1, "Lines and reach"): lines are centred, `x = position − (length − 1) / 2`, foes are adjacent when `|x₁ − x₂| ≤ 1`, single-target and spread moves reach adjacent foes only, "any" moves reach anyone. Anything that section does not cover is still an owner decision.
- Escape is DM/player adjudication outside `Run`, not an automated simulator run calculation.
- Six moves selectable, up to six, each restricted to valid learnsets and the approved universal additions (unapproved list stays TBD). No PP consumption during narrative play.
- The timer applies **to the whole round**, is optional and GM-pausable, and its length is set by the GM (default 60 seconds). It binds players only. On expiry an uncommitted player uses Struggle on a random valid foe; the round resolves once the GM has locked every enemy. Disconnect pauses the timer; the GM may force Struggle or choose for an absent player (`DECISIONS.md` 1.2).
- Boss extras in V0 are manually provided by GM only; advanced balancing deferred to V2.
