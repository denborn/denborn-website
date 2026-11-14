# Pokémon Mystery Dungeon–style TTRPG Companion — V1 Specification

**Status:** Cumulative specification / inherits V0.  
**Date:** 2026-11-14  
**Predecessor:** [`V0_SPEC.md`](V0_SPEC.md). Every confirmed V0 requirement remains in force unless this document explicitly changes it.

## 0. V1 goal — CONFIRMED

**Expand the supported Pokémon roster from the original Gen 1 species to all Pokémon species introduced through Generation 9**, using **Generation 9 battle rules** and retaining the entire V0 gameplay and infrastructure design.

This is a **content and compatibility scale-up**, **not** authorization to invent a new combat system, leveling system, co-op skill tree, or GM workflow.

## 1. Confirmed V0 systems retained unchanged

- Pokémon-only, trainer-free cooperative roleplay; D100 outside combat with Strength, Dexterity, Endurance, Perception, Charisma and Intelligence.
- Roleplay allocation at “level 0”: 300 total; min 5, max 75; gain one roleplay stat point per level, pending V0 level/cap clarifications.
- Gen 9 battle calculations, six equipped moves, Pokémon learnsets (plus the as-yet-unconfirmed common-move supplement), one selected eligible normal/hidden Ability, PP only during battle, Pokémon-type and move freedom outside combat.
- Pokémon Centers restore recoverable resources and are the only place after creation where moves/Ability may be reselected.
- Shared Medium Fast EXP curve, 100-level maximum, voluntary eligible evolution on level-up, player-allocated IV/EV-equivalent budgets (`floor(186L/100)` and `floor(510L/100)` with ordinary stat caps), including GM Pokémon.
- Two horizontal teams with slots A/B/C/...; enemy placement visible before player choices; player positions remain freely adjustable until universal action lock.
- All choices lock together; move priority then Speed orders resolution. Players do not see the entire initiative queue.
- **Move** and **Bag** lock an action; **Run** freely repositions; **Switch** is a consensual, free, one-round Speed exchange while preserving move priority; flee by player/GM narrative decision.
- GM manually chooses enemy moves and may manually assign additional boss/enemy action opportunities; **no balancing guide yet**.
- 60-second timer is optional and covers the whole selection round; DM may pause it; uncommitted actions default to Struggle; an active timer pauses on participant disconnection.
- 0 HP causes Agony, three personal action opportunities before death, at most one added decrement from attack in the relevant turn, healing is possible; exact disputed timing/removal wording remains TBD.
- GM-created campaigns, offline character-creation links, player local character creation, complete QR character-sheet import (subject to payload size), live room join code/link, GM-run WebSocket state, player+GM local copies, JSON file exports, session reload including an in-progress fight; no application database.
- PWA on Cloudflare, supports iPhone/Android/desktop, uses Gen 5 visual style and Pokémon-specific sprites/items/icons, with missing Gen 5 Pokémon sprites falling back to Showdown `ani`/`ani-back` 3D-style animated assets.

## 2. V1 data coverage — CONFIRMED / engineering tests

1. Include **every Pokémon species introduced in Generations 1–9** as an available character and GM combat species, subject to the GM's campaign species restrictions.
2. Continue to use **Gen 9 versions of the applicable species, move, stat, Ability and type data**. The generation a species debuted in does not switch the app to that generation's mechanics.
3. Both GM and player character constructors use the **same supported species and move database**, including the same manual IV/EV allocation rules.
4. Maintain the same fixed six-move UI and the same item and Ability rules across the larger roster.
5. A build-time data import/snapshot is preferred over uncontrolled client requests to PokéAPI. Import and reconcile identifiers, species/forms, evolutions, learnsets, moves, Abilities, items and types. The simulator defines executable battle effects; the PokéAPI snapshot alone is not a battle engine.
6. Every included species/form requiring a sprite must resolve **deterministically**: prefer Gen 5 `gen5ani` art, then Showdown `ani` fallback; record missing assets. Use Pokémon-style item and type icons across the interface. A successful fallback must not be mislabeled a raw interactive 3D model.

### Explicit compatibility issue

**Gen 9 does not natively supply 4+ active Pokémon battles.** The variable-length-line targeting adapter from V0 must be verified against the entire expanded move/Ability dataset. Existing source data may say “adjacent”, “all foes”, “all adjacent”, “user and allies”, etc.; the adapter must evaluate those labels against the current A/B/C/... formation. **Do not invent new range rules for moves whose target semantics are ambiguous.** Flag them for review.

### Generation and form boundary — TBD

“All Pokémon through Gen 9” establishes **species coverage**, but it does **not automatically settle inclusion of every variant** (regional forms, Mega Evolution, Gigantamax, Terastallization, battle-only forms, event-only forms). This is an owner decision. Keep the Gen 9 baseline and explicitly list what the chosen dataset supports before implementation.

## 3. V1 player and GM experience

**No new gameplay UX is authorized.** Existing V0 screens must continue working when the roster grows:

- GM campaign rules/creation link; offline player creation; local character copy and full-sheet QR import.
- Pokémon and valid move/Ability selection at creation and Pokémon Center rest.
- Shop/bag using real Pokémon sprites; preset encounter selection and one-click encounter start.
- Two-line combat, all players lock, free rearrangements / consensual Speed trades, Gen 9 move-priority calculations, optional shared round timer, custom Agony and save/resume.

**ENGINEERING CONSEQUENCE:** Character export files need schema versioning and immutable Pokémon identifiers so a V0 character can migrate to V1 without losing its species, stats, moves, inventory or current battle; importing an invalid/unsupported form should produce an intelligible error, not silently substitute another Pokémon.

## 4. V1 acceptance checklist

- [ ] All Generation 1–9 **species** appear in GM and player selectors, and can be campaign-restricted.
- [ ] For each supported species, valid learnsets/Abilities/level and evolution links are available from a version-pinned data snapshot; missing/contradictory source records are reported.
- [ ] Gen 9 type and move effects are tested with representative teams spanning all included generations; six-move UX and action-lock rules remain unchanged.
- [ ] Adjacent and multi-target moves correctly address the current A/B/C/... positions or are explicitly blocked pending rule mapping; no arbitrary target guessing.
- [ ] Each supported sprite has a Gen 5 art resolution or the Showdown 3D-style animation fallback; Pokémon-themed item/type/status visuals persist.
- [ ] V0 campaign files and character files open under V1 through a tested migration; GM and player copies synchronize after reconnection.
- [ ] V0 scenario round-trip passes unchanged: GM prepares/launches, players lock, existing Pokémon cooperation triggers, 60-second timer and Agony work, and unfinished combat reloads.
- [ ] No persistent database introduced; offline character creation still functions without the GM online.

## 5. Out of scope for V1

- An automatic or mathematical boss balancing guide; this is **V2**.
- Unapproved new combat mechanics, custom class systems, traditional trainer switching, new move-power formulas, or AI enemies.
- Deciding unresolved V0 rules without explicit owner approval.

## 6. Owner decisions that remain TBD

Carry forward **all** V0 TBDs, particularly Agony healing/removal semantics, Speed-exchange impact, targeting beyond Triple Battles, universal extra moves and forms. Additionally:

- Which special/alternate forms are permitted under the Gen 1–9 species promise?
- Which Gen 9 features, if any, are enabled that need special encounter mechanics (e.g., Terastallization)? Their mere existence in Gen 9 is not an explicit request to expose a new button.
- Treatment of moves unavailable in current Gen 9 learnsets when a species historically learned them.

## 7. Source-of-truth references (technical, not game-design approvals)

- Pokémon Showdown simulator: https://github.com/smogon/pokemon-showdown
- PokéAPI static data: https://github.com/PokeAPI/api-data
- Showdown sprites: https://play.pokemonshowdown.com/sprites/
- Sprites/art licensing: https://github.com/smogon/sprites
- Cloudflare WebSocket state caveat: https://developers.cloudflare.com/durable-objects/best-practices/websockets/

---

**Version definition:** V1 = **V0 + species support through Gen 9**, associated asset/data completeness, and compatibility verification. No silent additional gameplay requirements.
