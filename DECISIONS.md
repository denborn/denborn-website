# Denborn — decisions

The owner alone decides game rules and product scope. This file is the record.

- **Section 1** holds what the owner decided, with the date. Nothing else is a rule.
- **Section 2** holds interpretations nobody has confirmed. They are not rules.
- **Section 3** holds engineering choices, which are mine: what I chose and why.
- **Section 4** lists the rulings still to ask, under the milestone that needs each.
- **Section 5** records what the battle engine was found to do, with the options put to the owner.

Precedence: the owner's latest decision > the kickoff prompt > `tasks/V0_SPEC.md` > `docs/` and `.claude/rules/`.

---

## 1. Owner decisions

### 1.1 Kickoff prompt — 2026-11-14

Quoted as written. These complete the spec and override it where they differ.

**Working rules**

> - Never invent a game rule. When neither the spec nor this prompt settles a rule, stop and ask the owner. A TBD in the spec is not permission to decide.
> - Ask before any product or rules decision, even a small one. Engineering choices that don't change gameplay are yours, but say what you chose and why.
> - Keep a DECISIONS.md in the repo. Record every owner decision with its date, and list unconfirmed interpretations separately.
> - Prove every rule with automated tests against the real battle engine, never by assumption. Re-run every suite after each change. And test only what's variable we don't want dumb tests.
> - When the engine can't do something as specified, report what you found and propose options. Never work around it silently.

**Scope, engine and data**

> - Build everything the spec defines as V0, with the architecture and stack it describes, as a real deployable app.
> - Battle engine: Pokémon Showdown's simulator through @pkmn/sim, with data from @pkmn/dex and @pkmn/data, all three at version 0.10.12.
> - If you upgrade, keep the three in lockstep, never use a release less than 14 days old, and re-run the data cross-check (see Tests).
> - Generate the game data pack at build time from those same versions, and store its version id in every saved file.
> - THE MOST IMPORTANT CONSTRAINTS IS THAT THE APP SHOULD BE DEPLOYABLE ON CLOUDFLARE FOR FREE
> - Only the GM's device runs battles. Load the engine as its own chunk so player screens never wait for it, and precache it for offline play.
> - Showdown has no Bag, so Bag items (healing, PP recovery, revival, status cures, X items) come from PokéAPI. Its item data stops at Gen 8, so it has no Gen 9 availability flag.

The prompt's "(see Tests)" pointed at a section that was not part of it; the cross-check was proposed and approved instead (decision 41). The stack in the prompt (Vite, React, TypeScript, Swup, bundled engine, Worker + Durable Object relay, JSON saves, Vitest, Playwright) was "only a proposition"; the choices actually made are in 1.2 and section 3.

**Roster, moves and numbers**

> All 151 Gen 1 species are playable with Gen 9 mechanics. Species and moves that aren't in Gen 9 are allowed, as in Showdown's National Dex.
>
> - Base forms only for now; forms are still open.
> - Moves that aren't in Gen 9 are allowed when a species' learnset includes them, and in the common-move supplement. Keep any move a used learnset references, even one Showdown flags otherwise (Cut, for Farfetch'd, is flagged Unobtainable).
> - Level-up moves count at or below the Pokémon's level; moves learned on evolution count as level 0. TM, tutor and egg moves count only when the campaign ruling allows them.
> - Hidden Power is one move, as in the games; its type comes from IVs in battle. Showdown's 16 typed variants share the id hiddenpower, so keep only the base move.
> - No Max moves or Z-moves. Stellar is not listed as a type.
> - Stats use the Gen 3+ formula (unchanged in Gen 9), with the nature multiplier.
> - Pokémon levels run from 1 to 100. "Level 0" is only the label for the 300-point roleplay baseline; no Pokémon is ever level 0.
> - EXP follows the Medium Fast curve for everyone: level 1 is 0 EXP, every other level n is n³ (PokéAPI growth rate "medium").
> - Each species' possible genders and gender ratio come from Showdown's data; 25 Gen 1 species have a single gender or none.
> - Held items and Berries come from Showdown's data, without Poké Balls or nonstandard items.

**Campaign rules**

> The GM sets each campaign's rules. Players build characters from those rules, and every limit is enforced at creation.
>
> - Playable species: the GM picks; all 151 by default, can set them using filters like base species, certain Base Stat, ect...
> - Starting level: 1 to 100.
> - Starting Pokédollars: 0 to 9,999,999.
> - Natures ruling, with no default: each player chooses a nature, or every Pokémon is neutral. This stays a per-campaign choice.
> - Move-access ruling, with no default: level-up moves up to the Pokémon's level, or those plus its TM, tutor and egg moves. Also per campaign.
> - Common-move supplement: any moves the GM picks, available to everyone.
> - Item packs: at least one, each with a name and items (quantity 1 to 999). A player picks one pack at creation. we will create defaults later.
> - Changing any rule creates a new rules version. Characters keep the version they were made under, and the campaign keeps the rules history.

**Character creation**

> - Six roleplay attributes (Strength, Dexterity, Endurance, Perception, Charisma, Intelligence) share 300 points, 5 to 75 each. A check is a D100 roll at or below the attribute.
> - Nickname (1 to 24 characters) and gender. The player chooses among the genders the species can have, with the ratio shown; single-gender and genderless species are filled in.
> - Ability: any the species can have, Hidden Ability included. Nature: per the campaign ruling.
> - IV budget: floor(186 × level / 100), up to 31 per stat. EV budget: floor(510 × level / 100), up to 252 per stat and 510 total. Unspent points are allowed.
> - Up to six moves from the eligible list.
> - The chosen item pack and the starting Pokédollars. The character starts at full HP, with EXP matching its level.

**Encounters**

> - Enemies use the same training budgets and move rules as players.
> - The GM chooses each enemy's gender within its species' ratio.
> - The order of enemies sets their starting positions on the enemy line.
> - Each enemy has an "Agony instead of fainting" switch, off by default. Off means it faints as in the games.

**Lines and reach**

> Two lines face each other, centered, each as long as its own team. Actions target Pokémon, not positions, and Bag actions run at priority +1.
>
> - Both lines are labelled A, B, C… from left to right as seen at the table. Each Pokémon has one position, so each line is only as long as its own team.
> - Lines of different lengths are centered on each other: a Pokémon sits at x = position − (line length − 1) / 2.
> - Allies are adjacent when they stand next to each other. Foes are adjacent when |x₁ − x₂| ≤ 1, which is Triples adjacency extended along the line.
> - Single-target moves reach adjacent foes only, and spread moves hit adjacent foes only. Moves that can target anyone, such as Aerial Ace or Aura Sphere, reach anyone.
> - Triples' automatic centering of the last Pokémon does not apply.
> - Against a lone boss, the players who can reach it are A, B and C with 3 players; B and C with 4; and C and D with 6.

**Actions**

> - Targets follow the Pokémon. After any swap, a locked action (player or enemy) whose target is no longer in reach unlocks, and its owner chooses again.
> - Run is free and happens during action selection, any distance along the player's own line. A swap with a living ally needs that ally to accept, like Switch. A dead ally's slot can be taken without asking.
> - Nobody swaps with a downed ally, and a downed Pokémon can't Run. A player who has locked an action can still Run, and anyone can swap with a locked ally; the unlock rule above applies.
> - Switch exchanges Speed for turn order only, for one round. Moves that use Speed, like Gyro Ball, still use the Pokémon's own Speed, and priority still applies. It needs the ally's agreement, and a Pokémon may make several exchanges in a round.
> - Using the Bag is the round's action. It happens at priority +1, in Speed order inside that bracket: after +2 moves like Extreme Speed, before every normal-priority move.
> - Revival items use their game values: Revive heals half HP, Max Revive and Revival Herb heal fully, and Sacred Ash fully revives every downed ally. Revival items only work on downed Pokémon, and only revival items heal a downed Pokémon.
> - If the target can't take the item by the time the Bag action comes, the item isn't used and stays in the bag.
> - On timeout, the Pokémon uses Struggle against a random valid foe.

**Agony**

> Players' Pokémon go through Agony at 0 HP. Enemies faint as in the games unless the GM switches Agony on for that enemy.
>
> 1. At 0 HP the Pokémon is downed with 3 stacks. The hit that downed it removes none.
> 2. A downed Pokémon can do nothing: no moves, Bag, Run or Switch. It loses its status, stat changes and other battle effects as if it had fainted, and its Ability and held item stop working until it is revived.
> 3. From the round after it went down, its turn comes at its Speed, in the normal-priority bracket. The battle shows "<name> is agonizing…" and it loses 1 stack. In the round it went down, its turn is skipped and nothing is shown.
> 4. Damaging moves that hit it remove at most 1 extra stack per round, spread moves included. A move hits when it passes the engine's type-immunity and accuracy checks; misses, immunities and status moves remove nothing.
> 5. Only revival items heal it. Once above 0 HP, Agony ends; if it is downed again, it starts over at 3 stacks.
> 6. A Pokémon revived mid-round sits out the rest of that round.
> 7. On revival, its Ability simply resumes. Switch-in Abilities such as Intimidate, Trace or Imposter don't trigger again.
> 8. At 0 stacks it dies, permanently. Nothing else kills a downed Pokémon, Perish Song included.
> 9. A side loses when all its Pokémon are downed or dead. If both sides reach that point at once, the battle is a tie.
> 10. After a battle, a downed Pokémon stays downed with its stacks frozen until it is revived or rested at a Pokémon Center.

**Art direction and purpose**

> For the UI look as much as you can for Pokemon Gen 5 (black and white) UI and vibe, to try and replicate it, fetch references and create a skill named Denborn DA with references and such and a DESIGN.md (using [the Spriters Resource BW and B2W2 pages] as references to build higher resolutions ui and stuff, pokemons sprites and assets should come from showdown tho). […] this will not be sold, and is purely for my own private circle of friends to paly a Pokemon TTRPG.

### 1.2 Planning session — 2026-11-14

Each row is the owner's answer to a question asked that day.

| # | Topic | Decision |
|---|---|---|
| 1 | Language | English and French, switchable. |
| 2 | Terastallization | "Not for now." |
| 3 | PP | Base PP. PP Up and PP Max can raise each move's PP "like real games". |
| 4 | Rewards | The GM awards EXP and Pokédollars manually; the app calculates the Gen 9 formula, full to each participant, as the default when an encounter is created. |
| 5 | Shops | No shop screen in V0. The GM adds or removes items and Pokédollars by hand. |
| 6 | Held item | Swappable with an inventory item any time outside battle. |
| 7 | Evolution | Level evolutions, stones, and the Linking Cord ("cable link") item for trade evolutions. |
| 8 | IV/EV respec | Never. |
| 9 | Roleplay attribute cap | 75 at creation only. Afterwards up to 95, "because 96 97 98 99 100 are critical failures". |
| 10 | Roleplay criticals | 1 to 5 is a critical success, 96 to 100 a critical failure. "Those are for roleplay only, nothing else, combat stays same as real pokémon." |
| 11 | Pokémon Center rest | Started by the GM, per character. |
| 12 | Bag items outside battle | Usable on anyone in the party. |
| 13 | Changing a joined character | Only inside the GM's live session; offline the sheet is read-only. If the copies differ at join, the GM is shown both and picks one. |
| 14 | Timer and enemies | The timer binds players only; the round resolves once the GM has locked every enemy. |
| 15 | Timer length | Set by the GM, default 60 seconds. |
| 16 | Absent player | The GM may force Struggle or choose the action for them. |
| 17 | Enemy information | Players see everything (the enemy's full sheet). |
| 18 | Turn-order information | Players see the hypothetical initiative order of their own party only. |
| 19 | Bag targets in battle | Any Pokémon on the field. |
| 20 | Enemy Bag | Yes, from an encounter bag the GM prepares. |
| 21 | Bag and the user's condition | Blocked like a move: whatever would stop the Pokémon's move that turn (sleep, freeze, full paralysis, flinch, confusion, recharge) also stops its Bag action, and the item is not used. |
| 22 | Sound | None in V0. |
| 23 | Tests | Cross-check proposal approved (section 3). "Let's not test fixed data, or anything non-variable, things that aren't ours […] NO USELESS TESTING." |
| 24 | Repository layout | Build at the root; the specs stay in `tasks/`. |
| 25 | Joining a session | Room code, then GM approval. |
| 26 | PP Ups on a replaced move | Lost, as in the games. |
| 27 | Level-up level across generations | The newest generation in which the species learns the move by level-up. |
| 28 | Earlier stages' moves | Eligible: own learnset plus earlier stages. |
| 29 | Bag item values | Current game values. The full table is shown to the owner before it ships. |
| 30 | Extra enemy actions | Extra moves in the same round, each placed by its own priority and the enemy's Speed. End-of-round effects happen once. |
| 31 | Animation library | Motion for React. No Swup. |
| 32 | Router | React Router 8. |
| 33 | State management | Zustand with pure reducers. |
| 34 | Deployment layout | One Worker: static assets plus the relay Durable Object. |
| 35 | Orientation | Portrait first, like a DS. "The preferred device for players is their phone." |
| 36 | Look and feel | "The app should be responsive, and motion and graphics should really emphasize an excellent UI and UX while giving a real Video Game vibe." |
| 37 | QR libraries | lean-qr to draw, barcode-detector to read. |
| 38 | Offline cache | Precache everything; a new version is applied only when the user accepts. |
| 39 | Design references | The sheets the owner placed in `tmp/`, plus sources that can be fetched. "Everything you can fetch from showdown, fetch from showdown." |
| 40 | Artwork and git | Out of git. "Do not forget sources […] those are not mine and should not be assumed to be mine." |
| 41 | Data cross-check | Approved as proposed (section 3). |
| 42 | Site access | "Open and listed, the goal is for people to enjoy this fan ttrpg." |
| 43 | Female sprites | Used. |
| 44 | Spread moves and downed foes | A downed foe in reach counts as a target for the 75% reduction. |
| 45 | Target downed earlier in the round | The move redirects to a random standing foe in reach; it goes at the downed target only if no standing foe is in reach. |
| 46 | Random-target effects | A standing foe in reach first; a downed foe only as a fallback. |
| 47 | Imposter | Copies the foe exactly opposite, or nothing. |
| 48 | Ally Switch (the move) | The user picks any two Pokémon of its own party (itself or not); they swap positions mid-round, without consent. |
| 49 | Git | One commit per milestone, on `main`. |
| 50 | Screens without a reference sheet | Derived from screenshots (official manuals, Serebii). |
| 51 | Downed when an encounter starts | The character sits out: not on the line, stacks frozen. |
| 52 | Allies' moves on a downed teammate | A hit removes a stack, friend or foe. |
| 53 | Wide Guard and Quick Guard | They protect a downed teammate from losing a stack. |
| 54 | Third-party skill files | Commit `skills-lock.json` only; `.agents/` and its symlink stay out of git. |
| 55 | How deploys happen | Through Cloudflare's Git integration (Workers Builds) on the GitHub repo, project name `denborn-website`, build command `npm run build`, deploy command `npx wrangler deploy`. "I prefer it that way it's easier for me." A push to `main` is therefore a production deploy. |

---

## 2. Unconfirmed interpretations

### 2.1 From the kickoff prompt

The prompt says: "These follow from the decisions or the spec but were never explicitly decided. Keep them unless the owner changes them, and list them as unconfirmed in DECISIONS.md."

> - Switch chaining: each exchange swaps the two Pokémon's current turn-order Speed. If A (100) exchanges with B (50), A acts at 50 and B at 100; if A then exchanges with C (80), A acts at 80 and C at 50.
> - A failed Bag action still uses up the user's turn.
> - Taking a dead ally's slot needs no agreement, since no one can answer.
> - Exactly 300 roleplay points must be spent at creation.
> - Every Pokémon needs at least one move, because the engine rejects a Pokémon with none.
> - Up to 6 Pokémon per side, the engine's team limit.
> - Enemies follow the campaign's move-access ruling and common moves, like players.
> - Event-only and transfer-only learnset sources don't count.
> - Vitamins and nature mints are left out of Bag items, since they clash with the custom EV allocation and the nature ruling. Items with no English effect text in PokéAPI are skipped.
> - Battle lines run on the engine's Doubles base, so no Triples-only rule (shift, centering) is active.
> - A character file includes the campaign rules it was made under. A character code or QR carries the whole character but only references its campaign and rules version, to keep the QR readable.
> - Codes are versioned, deflate-compressed and base64url-encoded, with the species list sent as a 151-bit mask.
> - The only decided battle text is "<name> is agonizing…". Downing, a stack lost to an attack, revival and Bag uses are reported as structured events until their wording is decided.

Changed since: PP Up and PP Max are no longer left out (decision 3).

### 2.2 Raised while planning — to be asked, not kept silently

Each of these is in section 4 under the milestone that first needs it.

- Line length includes dead and fainted slots.
- Happiness stays at the engine's default (255).
- A move deliberately locked on a foe that is already downed stays on it; redirection (decision 45) only applies when the target was standing when the move was locked.
- HP, PP and status conditions carry over between encounters as in the games.
- Baby species from later generations (Pichu, Cleffa and so on) count as "earlier stages" for learnsets.
- Dream World learnset sources do not count.
- Berries are held items only, not Bag actions.
- Enemy builds include a held item.
- The party's hypothetical order is computed by the GM's engine from the priority of locked actions and current turn-order Speeds.
- A character that starts above level 1 still gets exactly 300 roleplay points.

---

## 3. Engineering choices

Mine to make; none changes gameplay. Dates are when the choice was made.

| Date | Choice | Why |
|---|---|---|
| 2026-11-14 | **pnpm** instead of npm, with `minimumReleaseAge: 20160` in `pnpm-workspace.yaml`. | npm 10.9.8's resolver crashes on this dependency set ("Cannot read properties of null (reading 'edgesOut')" while resolving Vitest's peers). pnpm also enforces the 14-day rule on every dependency, transitive ones included, which npm cannot. |
| 2026-11-14 | The 14-day rule applies to **every** dependency, not only the three engine packages. | Same supply-chain reasoning as the owner's rule for the engine. |
| 2026-11-14 | Exact versions only; the engine trio is pinned at 0.10.12 and a test fails if the three ever differ. | Owner rule: lockstep upgrades. |
| 2026-11-14 | **TypeScript 6.0**, not 7.0. | typescript-eslint supports TypeScript below 6.1 only. |
| 2026-11-14 | **Vitest 5.0** with `@cloudflare/vitest-plugin`. | `@cloudflare/vitest-pool-workers` is deprecated and renamed to `@cloudflare/vitest-plugin`, which supports Vitest 4.1 and 5. This supersedes the plan's "Vitest 4.1". |
| 2026-11-14 | `@cloudflare/vite-plugin` 1.66.0, Wrangler 4.154.0 and `@cloudflare/vitest-plugin` 1.4.9 are chosen as a set. | Cloudflare releases them together; this set shares one Wrangler and one local runtime. |
| 2026-11-14 | Durable Object declared with `migrations` / `new_sqlite_classes`, not the newer `exports` block. | Moving to `exports` later is possible; the reverse is not. |
| 2026-11-14 | Room codes are 5 random symbols plus a check symbol, verified in the Worker before any Durable Object is addressed. | A mistyped or made-up code never creates an object or spends Durable Object quota. |
| 2026-11-14 | i18n is a typed dictionary (`src/i18n/en.ts`, `fr.ts`), no library. | The compiler enforces that both languages have the same keys; nothing to load at runtime. |
| 2026-11-14 | Zod for validating untrusted input; fflate for compression. | Zod: every QR, file, link and frame is untrusted. fflate: synchronous and identical in browsers and in tests. |
| 2026-11-14 | Generated files are not committed: Worker types (`wrangler types`), the data pack, downloaded sprites. | They are derived from pinned sources; committing them invites drift. Artwork is also not ours to publish (decision 40). |
| 2026-11-14 | The Worker is named `denborn-website` and the `build` script calls no package manager itself. | Workers Builds fails when the Worker name differs from the dashboard's project name, and its build command is `npm run build` (decision 55). Cloudflare installs with the pnpm version in `packageManager`. |
| 2026-11-14 | `.nvmrc` pins Node 22 for Cloudflare's builds. | Same major version as local development; the build image's default is Node 24. |

**Data cross-check (approved, decision 41).** It runs when the data pack is generated, not as a unit-test suite:

1. Integrity checks that stop the build: every referenced move, Ability, item and evolution target exists; every species has at least one eligible move at every level under both move-access rulings; every species and item has its sprite; English and French names exist; every Bag item has an effect handler.
2. A comparison of what both Showdown and PokéAPI state for the included species and moves, reporting only disagreements, for the owner's ruling.
3. On an upgrade, a list of what changed since the previous pack.

**Testing (decision 23).** Rules are tested with synthetic fixtures and against the real engine. Real data is checked by the generator. No test asserts a fact that belongs to the games.

---

## 4. Rulings to ask, by milestone

- **Milestone 1 (engine proof)**: user-side effects when a move's only target is downed (recoil, recharge, crash damage, Life Orb); Future Sight landing on a downed Pokémon; which Speed orders the Agony turn; extra enemy actions and per-action counters (sleep, confusion, Protect, flinch); what resumes on revival for Abilities the engine had switched off; whether Switch also reorders end-of-round effects and Ability triggers; Ally Switch details (a downed or dead ally; a locked move whose target leaves reach mid-round); Doubles-base behaviour in a one-on-one (screens, Follow Me, After You, Quash); and from 2.2: line length, happiness, deliberate targeting of a downed foe, carry-over between encounters.
- **Milestone 2 (data pack)**: which nonstandard moves the supplement may include; the full Bag effect table, Dire Hit included; where the Linking Cord's name and icon come from; cross-check disagreements; and from 2.2: baby stages, Dream World sources, Berries.
- **Milestone 3 (art direction)**: font; wording of custom battle messages in both languages.
- **Milestone 4 (offline flows)**: nickname character set; QR size cap; what the printed sheet shows; and from 2.2: roleplay points above level 1.
- **Milestone 6 (battle)**: the reward default (which enemies and recipients count; Lucky Egg and the formula's other optional terms); and from 2.2: the party order computation, enemy held items; what "end encounter" keeps; what happens to a battle saved under an older engine or adapter version.
- **Milestone 7 (progression)**: whether the campaign's species filter limits evolution; rest and dead characters.

---

## 5. Engine findings

Filled in from milestone 1 onward: what `@pkmn/sim` 0.10.12 was observed to do, the options offered, and the owner's ruling (which then moves to section 1).

Known before any adapter code, from reading the 0.10.12 source (2026-11-14):

- The engine starts every move at maximum PP and every Pokémon at full HP with no status. Decisions 3 and the carry-over interpretation need the adapter to set these.
- The engine cuts a Pokémon's name at 20 characters; nicknames go up to 24. The adapter passes stable ids as engine names and keeps nicknames in the UI.
- Choice strings accept target numbers 1 to 3 only. The adapter calls the engine's `chooseMove` directly, which has no such limit and keeps the engine's own validation.
- The engine mirrors the two sides' slot numbers and has one shared line size. Unequal, table-ordered lines need the reach functions replaced.
- A Pokémon at 0 HP is filtered out of targeting in about ten places. Hitting a downed Pokémon needs those replaced and the hit pipeline wrapped.
- The engine's input log does not record custom actions, so save and resume uses the engine's state snapshot (`toJSON` / `fromJSON`), which restores silently to a plain format if the custom one is not registered. Every restore therefore asserts the format.
