# Pokémon Mystery Dungeon–style TTRPG Companion — V0 Specification

**Status:** Requirements baseline / implementation-ready where marked **CONFIRMED**  
**Date:** 2026-11-14  
**Scope:** First-generation Pokémon species, Generation 9 combat mechanics, a Gen 5 visual identity.  
**Authority:** The user's decisions in this conversation supersede implementation suggestions. A **TBD** is *not* permission to invent a rule.

## 0. Interpretation convention

- **CONFIRMED** = specifically approved by the project owner.
- **ENGINEERING CONSEQUENCE** = a necessary implication/constraint, not an additional gameplay rule.
- **TBD / OWNER DECISION** = cannot be unambiguously derived from the approved requirements.
- **OUT OF V0** = explicitly scheduled later or left unapproved; do not silently implement it.

**Core objective:** Pokémon-only, trainer-free cooperative TTRPG. Play and roleplay at the table; when the GM launches an encounter, a PWA handles the actual Pokémon combat. No bespoke combat system and no unnecessary arithmetic for players.

## 1. V0 scope and exclusions

### Included — CONFIRMED

- All app modes, campaign creation, GM encounter preparation, player character creation, join links/codes, QR character import, local/file saves, real-time battle synchronization, session reloading, and the combat loop below.
- **Playable species limited to the original Generation 1 species**. **Combat rules are Generation 9**, not Generation 1; a Gen 1 Pokémon uses eligible moves, Abilities, type interactions, and battle behavior according to the chosen Gen 9 rules/data.
- Gen 5-inspired interface, including Pokémon, item, type, and status art where available.
- GM may manually add additional enemy/boss action opportunities. No boss balance algorithm or balancing guide in V0.

### Explicitly not assumed

- Later-generation species are **not** playable in V0. Their regional forms and special transformations are **TBD**, not automatically included just because their base species debuted in Gen 1.
- No trainer characters, tactical grid, database, autonomous enemy AI, or automatic narrative/combat transition.
- No invented combat stats, custom damage formulas, new Ability system, or custom co-op mechanics.

## 2. Tabletop / out-of-combat layer — CONFIRMED

The **D100 is exclusively for roleplay**, never for calculating in-app combat. Six independent roleplay attributes: **Strength, Dexterity, Endurance, Perception, Charisma, Intelligence**.

- At the stated **“level 0” creation baseline**, assign **300 total points** across the six attributes; minimum **5**, maximum **75** per attribute. *(Changed by the owner on 2026-11-20, decision 307 in `DECISIONS.md`: 265 points, which may be kept and placed later up to 75; characters made with 300 stay as made.)*
- Gain **one roleplay attribute point per gained level**; allocation is player-controlled.
- For narrative checks, roll **D100 at or below the relevant attribute** (the previously agreed roll-under interpretation). Criticals, opposed rolls, and difficulty modifiers are **TBD**; do not add an unapproved critical table.
- Players roleplay as their chosen Pokémon; moves and innate type capabilities are freely available narratively outside combat, with **no PP consumption outside combat**. E.g., Fire-types can produce fire, Flying-types can fly when appropriate. GM adjudicates narrative limits.
- A printed/exported character sheet acts as a roleplay reference; the companion app is the calculated version.

**TBD:** Whether 75 remains a hard attribute cap after the starting pool, whether “level 0” is only an allocation baseline or a legal combat level (official Gen 9 combat levels normally begin at 1), and whether characters starting above level 1 receive accumulated roleplay points automatically.

## 3. Character creation, progression and rest — CONFIRMED

1. The GM creates a campaign, configures permitted species/levels/rulings, and generates a **character-creation link that works with the GM offline**.
2. The player opens the PWA, chooses one eligible Pokémon species and the **starting level specified by the GM**, distributes roleplay and combat-allocation points, chooses an available Pokémon Ability (normal or hidden where valid), chooses **up to six** moves from its permitted learnset, and selects an item pack.
3. Characters persist in browser **localStorage** and may be fully imported through a character-sheet QR code; character export/import files are part of the persistence design.
4. The player may later connect to the GM's active campaign using their locally stored character or QR-imported character.
5. **Ability and equipped move selection/reselection are allowed only during character creation or a rest at a Pokémon Center.** Leveling up may make new moves eligible but does not by itself authorize mid-adventure move/Ability swaps.
6. Pokémon Center rests restore combat resources (HP, PP and recoverable conditions), and permit move/Ability reselection. Permanent death is not presumed reversible.
7. Level cap: **100**. Every Pokémon uses a shared **Medium Fast** EXP progression, rather than its original species' growth category. Normal Pokémon combat stats/formulas and Gen 9 EXP calculations otherwise remain the reference, subject to the noted party-distribution TBD.
8. On an eligible level-up, evolution is **player-initiated with a button**, not forced automatically. Valid methods/eligibility for non-level evolutions remain **TBD**.
9. Players allocate their own IV/EV-equivalent points each level instead of random IVs or battle-earned EVs; the same scheme applies to GM-controlled Pokémon.

### IV/EV allocation — agreed fallback, with arithmetic stated explicitly

> Since decision 286 (2026-11-18) a player places neither by name: both are counted and placed as Training Value (1 TV = 1 IV = 4 EVs, 0 to 94 per stat), and a level's TV is its IV budget below plus a quarter of its EV budget. The two budgets are no longer checked apart. See `DECISIONS.md`.

Use Gen 9 stat formulas but a **level-scaled allocation budget**. For a Pokémon at level `L` (0–100, subject to legal-combat-level TBD):

- Total available **IV points** = `floor(186 × L / 100)`; **maximum 31 in each of six combat stats**.
- Total available **EV points** = `floor(510 × L / 100)`; **maximum 252 in any one combat stat** and 510 across all stats.
- Players distribute points as permitted by their current level budget; GM-created Pokémon follow the same budgets and limits.
- Reference checks: at L1 = 1 IV / 5 EV; at L50 = 93 IV / 255 EV; at L100 = 186 IV / 510 EV.
- This is **the project's custom allocation model**, not a verified description of Pokémon Emerald Exceeded's own system.

**TBD:** Whether allocations are permanent, whether previously distributed IV/EV points may be reassigned (and when), how the owner wants level-0 handled for combat, and which evolutions/forms are enabled.

### Move learnsets and items

- The six active moves must be eligible for the Pokémon's learnset at its current level, **plus a small campaign-approved common-move supplement** to support different play archetypes. The actual extra moves are **TBD**.
- PP works as in Pokémon **in combat only**; the app tracks it.
- Pokédollars and Pokéshops handle obtaining items; existing Pokémon item effects are the default reference. **Exact prices**, campaign shop inventories, starting item pack contents, rewards, and GM overrides are **TBD** (do not silently select a specific game's price list).

## 4. Campaigns and session structure — CONFIRMED

### GM functions

- Create/manage a campaign, configure rulings and character-creation restrictions, produce an independent character-creation link, and generate a **separate live session join code/link/QR**.
- Keep local copies of the campaign and **every joined character**, in addition to each player's local copy.
- Prepare combat encounters ahead of time: select enemy Pokémon, their builds and their initial slots; save an encounter preset; launch it when desired.
- Manually control enemy actions and targets; manually add extra boss/enemy action opportunities. No automatic AI requirement.
- Start/end encounters and save, close, export, import, resume the campaign **including an unfinished battle**.
- Enable/disable/pause the round timer.

### Player functions

- Create a character offline from the GM's static rules/creation link; retain it locally, import a complete character via QR, or rejoin with an existing locally stored one.
- View a computed character sheet, inventory, Pokémon stats, Ability and six moves.
- See the enemy formation and the player's own action information when a battle starts.

**ENGINEERING CONSEQUENCE:** An offline character-creation link cannot rely on a live WebSocket room. With no database, a self-contained encoded campaign-rules link or a locally importable rules file is needed; **encoding, URL length limit, and versioning are implementation details to test**. Offline-created characters only reach the GM's saved campaign after a later explicit connection or import.

## 5. Combat engine and phases — CONFIRMED

Use **Gen 9 Pokémon** as the battle calculation reference: combat stats, types, damage, accuracy, status, move priority, move-specific targeting/effects, Abilities, items and PP; deviations listed here take precedence. The app performs combat calculations, **not a D100 roll**.

### Teams and positions

- Two opposing **horizontal battle lines**, labeled **A, B, C, ...**, not a grid.
- **One position per team member/player** (the exact enemy-line capacity when enemy count differs from the number of players is TBD).
- The GM chooses and exposes **enemy starting positions before player placement**.
- Players select and rearrange their positions **freely during action selection** until every eligible combatant has locked an action.
- A player may **unlock/change** a chosen action while the global lock has not been reached.
- Area and adjacency targeting follow Pokémon Doubles/Triples concepts and actual move target categories: a single target, allies, adjacent Pokémon, all opposing Pokémon, or all affected combatants as appropriate.

**ENGINEERING CONSEQUENCE / IMPORTANT DEVIATION:** Official **Gen 9 does not have a four-or-more-active-Pokémon Triple Battle format**. A variable-length line requires a custom adjacency/targeting adapter even if the individual move effects come from the existing engine. No unapproved distance or grid rules should be added.

### Round and action submission

1. The GM activates a prepared encounter; enemy positions are shown.
2. Players freely adjust their own positions and request/approve Switch exchanges during preparation.
3. Each player selects **Move** or **Bag** to **lock in** their round action and any required target(s). Other teammates and GM enemies submit their choices before resolution.
4. Until *everybody* is locked, a submitted player action can be unlocked and changed, with the positioning/allowed free controls available again.
5. Once all actions are locked (or the timer auto-fills omissions), the app resolves them using **move priority first, then effective Speed and the other applicable Gen 9 ordering rules**. Do not expose the full initiative queue to players; show each player's own relevant order/information only.
6. Resolve effects, PP, HP, status, Agony, EXP and victory/defeat state according to existing Pokémon logic **plus the approved overrides**.

### Four player controls — Pokémon vocabulary repurposed

| Control | Behavior | Consumes/locks action? |
|---|---|---|
| **Moves** | Select one of **six** equipped moves, with legal target(s). | **Yes** |
| **Bag** | Use an owned item on an allowed target (the desired UX supports selecting **anyone**, subject to the item's valid effect). | **Yes** |
| **Run** | **Reposition** on the team's line while action selection is open. **Not** the battle-flee button. | **No** |
| **Switch** | Request a **consensual exchange of the two Pokémon's Speed for this round**. Existing move priority is not exchanged. **Not** replacing Pokémon/trainer switching. | **No** |

- The other involved player must explicitly accept a Switch request.
- **Fleeing an encounter is handled by DM/player roleplay**, not by the Run control.
- No trainers and no Pokémon replacement roster are required.
- **TBD:** Can the same Pokémon perform multiple Switch exchanges in one round? Does exchanged Speed affect only initiative sorting or also speed-sensitive move calculations? Exact order of GM enemy-locking, where relevant, is also TBD.

### Timer and disconnects

- Timer is **GM-optional**, default **60 seconds for the entire round's action-selection window**, not 60 seconds per Pokémon.
- The GM may pause it.
- If time expires, every uncommitted eligible player uses **Struggle (Lutte)** as their default action. This is **a custom timeout rule**, independent of Struggle's normal no-PP trigger.
- If a player disconnects while a timer is in use, the timer/battle is paused pending reconnection; state is preserved by the authoritative GM session and snapshots.
- **TBD:** Struggle's target selection when more than one valid target exists; disconnection behavior when no timer is active; timeout and rejoin handling for GM-side enemy choices.

### Agony and death — custom override

- When a Pokémon falls to **0 HP**, it is **downed** and enters **Agony**, rather than being removed immediately as in standard Pokémon.
- Agony has **three remaining opportunities/stacks**. Each of the Pokémon's own subsequent action opportunities removes one stack.
- Attacks against the downed Pokémon may remove **one additional stack, at most once per turn**. Consequently it can lose **two stacks within one turn** (its own opportunity plus a qualifying attack).
- At zero remaining stacks, the Pokémon dies.
- Healing a downed Pokémon is possible.
- **TBD (wording in source was ambiguous):** precise removal rule on healing above 0 HP (the source stated “agony is immediately removed by agony”), meaning of “turn” for the once-per-turn attack cap, whether damage received in the downing action counts, and when the first opportunity decrement occurs. These need owner confirmation rather than an invented mechanic.

### Existing cooperation, not a new system

- Existing Pokémon combinations, move priorities, redirection/protection, terrain, type synergies and Abilities apply wherever Gen 9 rules support them.
- The earlier idea of **unlockable/equippable team techniques** remains **unresolved**: no cost, unlock, or new-effect mechanics were approved after the explicit direction to stay close to the original combat system. **Do not invent a cooperative skill tree** in V0.

## 6. V0 visual specification — CONFIRMED

- **Gen 5 / Pokémon Black & White feel** throughout: battle scenes, pixel UI, menus, item packs, bag, shops, Pokémon status, HP/PP, types, move categories, and character portraits.
- For battle Pokémon, prefer Showdown **`gen5ani` / `gen5ani-back`** animation when the exact species/form asset exists.
- **Fallback:** Showdown **`ani` / `ani-back`** 3D-*rendered-looking animated sprites* when Gen 5 assets are missing. The `ani` files are not specified as interactive 3D model files (GLB/FBX).
- Use Showdown Pokémon icons and **actual item sprites** (`itemicons`) and type/category assets. **Do not substitute generic application iconography** when a Pokémon-style icon is applicable; if an asset is unavailable, preserve a readable fallback without inventing art.
- Bundle/version chosen sprite assets with the PWA where feasible rather than hotlinking on each encounter; handle missing entries deterministically.
- Copyright/licensing: simulator **code** licensing and sprite **artwork** permissions are separate. Smogon's sprite repository states that Pokémon sprite art belongs to its respective rights holders and certain community Gen 5-style sprites have additional unsettled permissions. Distribution needs rights review.

## 7. Platform, storage, networking — CONFIRMED + constraints

**Product:** Installable **Progressive Web App (PWA)**, responsive on iOS/iPhone and Android, served on **Cloudflare**, also usable in a desktop browser.

**Persistence:** **No application database.** Campaign and character data live in **versioned JSON save files** plus **localStorage copies**. Player and GM each hold a character copy; the GM holds copies of the whole campaign and every joined character. A campaign export must include enough data to reopen an *unfinished* combat.

**Live play:** Cloudflare-hosted WebSocket relay (e.g., Worker + Durable Object) links the GM and players; the **GM's running session is authoritative** over battle state, commands, locked actions, results and saves. The relay must not become an alternative canonical campaign database.

**Reliability constraints that cannot be wished away:**

- Cloudflare Durable Objects can hibernate and **lose in-memory state**. A state snapshot must be reconstructable from GM-held canonical data after connection or actor loss. A WebSocket relay alone is **not** a permanent save.
- Browser `localStorage` can be cleared/evicted; a downloaded file is not kept continuously synchronized by a browser automatically. Use explicit save/export and recovery workflow; **do not promise zero data loss without a recovery strategy**.
- A complete character QR must store an entire versioned payload (not merely a server record ID), but **QR capacity is finite**. Validate payload sizes; if it does not fit, the full character must remain recoverable from a save file or an equivalent approved mechanism. No truncated QR payloads.
- A code that joins a **live** room is distinct from a **self-contained character-creation** link usable while the GM is absent.
- Whether the Showdown simulator can run unchanged in the chosen Cloudflare/browser runtime, or needs an adapter/build step, must be **tested**, not assumed. In particular **six simultaneous move choices**, nonstandard **free Run/Switch**, arbitrary team size and **GM-added action opportunities** are deviations from standard battle formats and cannot be promised as turnkey Showdown support.

### Suggested technical reference, not a committed implementation stack

- [Pokémon Showdown simulator](https://github.com/smogon/pokemon-showdown) for original mechanics and [battle simulator interface](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md).
- [PokéAPI static JSON repository](https://github.com/PokeAPI/api-data) / [PokéAPI CSV source](https://github.com/PokeAPI/pokeapi) as an **import/build-time** data reference. Import, normalize, patch, and bundle data once instead of requiring clients to query PokéAPI for every battle. Distinguish PokéAPI data from the simulator's executable mechanics.
- [Showdown sprite index](https://play.pokemonshowdown.com/sprites/) and [Smogon sprite repository/licensing](https://github.com/smogon/sprites).
- [Cloudflare Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

## 8. Minimum persisted data (data-shape requirements, not exact schema)

**Character:** schema version, persistent character identifier, campaign identity/rules version, Pokémon species/form, nickname, combat level/EXP, roleplay attributes/unspent pool, six combat stats & allocations (IV/EV-equivalent), equipped moves + PP state, selected Ability, item inventory/held item as applicable, Pokédollars, current HP/status/Agony and progression/evolution eligibility.

**Campaign:** schema version, campaign identifier and creation rulings, GM's registered characters, configured item/shop and common-move allowances, prepared encounters, current campaign/encounter state, active battle snapshot, positions, current and locked actions, consented Speed exchanges, timer state, and sufficient deterministic combat data to resume safely.

**ENGINEERING CONSEQUENCE:** Include version identifiers and immutable Pokémon move/species IDs. Do not let a changed later data pack silently rewrite an unfinished battle.

## 9. V0 acceptance checklist

- [ ] GM creates a campaign with rules, exports and reimports it; offline character-creation link works without the GM online.
- [ ] Player creates a Gen 1 species character at GM-set level with 300 roleplay start points (5–75 each), six move slots, valid Ability, IV/EV budgets and an item pack; character persists locally.
- [ ] Full character exports/reimports from a file and, within tested QR capacity, a complete character-sheet QR; reconnecting reconciles with GM-held copy without silently overwriting it.
- [ ] GM prepares an encounter with preselected enemy Pokémon/positions, saves it, and launches it when desired.
- [ ] Both lines show A/B/C/... slots; players can freely reposition and undo submitted choices until all are locked.
- [ ] Switch requires both players' consent, changes only the approved round Speed ordering while retaining move priorities; every selected combat effect still follows the Gen 9 reference where not overridden.
- [ ] Exactly one Move or Bag action per ordinary player combat round; six moves visible, PP consumed in combat only, valid targets selected.
- [ ] GM manually submits enemy actions and may add a manual extra action opportunity.
- [ ] Optional 60-second **whole-round** timer, GM pause, Struggle fallback for uncommitted actions, and disconnect/reconnect behavior are tested.
- [ ] Downed/Agony/death outcomes implement the *owner-confirmed* remaining ambiguities.
- [ ] Save, close and reload a battle mid-encounter; canonical GM snapshot restores players' combat state.
- [ ] Gen 5 animations/icons/item assets render; exact missing sprite uses Showdown `ani` fallback; no generic icon library is used as visual substitute.
- [ ] Same saved battle state cannot be corrupted by duplicate/replayed WebSocket actions.

## 10. Unresolved owner decisions — hold, do not guess

1. Clarify the Agony healing sentence and decrement timing/meaning of “turn”.
2. Decide Switch repeatability and whether its exchanged Speed affects speed-dependent attacks or initiative comparison only.
3. Specify rule for targeting **more than three active allies/opponents**, and enemy slot count when it differs from the players' count.
4. Define universal bonus moves, GM rulings format, starting item pack, shop configuration, experience split, and currency reward process.
5. Define special/regional forms and non-level evolutions permitted in the Gen 1 *species* subset.
6. Confirm whether “level 0” is only a roleplay budget label; resolve cap/retroactive points and IV/EV respec.
7. Define Struggle timeout targeting, timer-vs-enemy-lock semantics, QR oversize fallback and offline-creation link size/versioning.
8. Decide whether/how the earlier unlockable/equippable **team ability** idea survives the later instruction to avoid new systems.

---

**Scope guard:** Do not add species Gen 2–9 or bespoke boss balancing to V0. See `V1_SPEC.md` and `V2_SPEC.md`.
