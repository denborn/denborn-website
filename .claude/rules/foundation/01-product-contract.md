# Product contract — never invent rules

- Before a game-related code change, inspect the corresponding V0/V1/V2 spec. Refer to the exact clause in review notes.
- Confirmed V0: first 151 species only, Gen 9 battle rules, six equipped moves, Pokémon characters (not trainers), independent D100 roleplay, two opposing slotted lines, GM-launched battle, manual enemy choices, manual extra boss actions, free Switch/Run as approved, local/file saves and GM authority.
- V1: enable species introduced in Gen 2–9, without silently enabling every alternate form if its scope is TBD. V2: boss balancing and guidance, not a promise of arbitrary new boss mechanics.
- A technical library limitation **must not silently change a game rule**. Surface mismatch and gate behind a failing test/owner decision.
- Unresolved design items stay `OWNER_DECISION_REQUIRED`. `DECISIONS.md` is the record: section 1 holds what the owner has decided (Agony, reach on lines of any length, IV/EV respec, rewards and much else were settled on 2026-11-14), section 4 the rulings still to ask before each milestone. Check it before treating anything in a spec as open or as settled.
- Do not reinterpret "Run" as fleeing (it means repositioning) or "Switch" as bringing out another Pokémon (it swaps two allies' Speed for the round with consent, retaining move priority).
- Character move and Ability changes occur only during character creation or a Pokécenter rest, not simply because the player leveled up. Combat PP only; narrative use consumes no PP.
- Do not add trainer battles, tactical grids, account systems, databases, microtransactions or AI-driven enemy actions unless the owner approves.
