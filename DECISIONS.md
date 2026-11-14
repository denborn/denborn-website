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
| 56 | Empty slots | When a Pokémon dies, or an enemy with Agony off faints, its slot stays: the line keeps its length and everyone's reach is unchanged. |
| 57 | Aiming at a downed foe | Allowed. A single-target move locked on a foe that is already downed stays on it. (Decision 45's redirection is for a target that was standing when the move was locked.) |
| 58 | Carry-over between encounters | HP, PP and status conditions carry over, as in the games. |
| 59 | Return and Frustration | Not available: left out of eligible moves and of the common-move supplement. |
| 60 | A damaging move whose only target is downed | Only the stack is lost. The move spends its PP; nothing else happens to the user: no recoil, no Life Orb damage, no recharge, no stat drop, no crash. |
| 61 | Order of an enemy's extra moves | Among one enemy's moves of equal priority, they happen in the order the GM entered them. |
| 62 | Extra actions and the user's conditions | Superseded by decision 68. My description of the engine was wrong on two points (recharging and rampages), so the question was asked again. |
| 63 | Future Sight and Doom Desire on a downed Pokémon | Nothing happens (engine default); no stack is removed. |
| 64 | Speed of the Agony turn | The Pokémon's plain Speed stat (no item, Ability, stat changes or Tailwind), reversed under Trick Room. |
| 65 | Ally Switch: who can be swapped | Standing Pokémon only. Downed Pokémon and empty slots cannot be moved. |
| 66 | A locked move whose target is out of reach after an Ally Switch | It fails: the move is used, spends its PP, and has no valid target. |
| 67 | One-against-one fights | Always the engine's Doubles rules: screens cut damage by a third; Follow Me, After You and Quash work. |
| 68 | Extra enemy moves and the user's conditions | As the engine does. Sleep and confusion tick once per action. A flinch cancels every action of the round. A recharge costs one action: the others still happen, and Hyper Beam followed by an extra move in the same round spends that move recharging. A rampage (Outrage, Thrash) lasts 2 to 3 rounds however many actions the enemy has. A two-turn move charges on one action and fires on the next, even in the same round. Protect covers the whole round while the other actions still attack. |
| 69 | A move with nobody in its reach | Cannot be locked. The player picks another move, Runs first, or uses the Bag. |
| 70 | A charged two-turn move whose target is out of reach on the second round (after a Run) | It fails, like decision 66. |
| 71 | Moves a GM can pick for the common-move supplement | Every real main-series move: current, past, and those that exist in Gen 9 but cannot be obtained (about 850). No Let's Go partner moves, no fan-made (CAP) or unreleased moves. Z-moves, Max moves, Return and Frustration stay out. |
| 72 | Baby stages from later generations (Pichu, Cleffa, Igglybuff, Tyrogue, Happiny, Mime Jr., Smoochum, Elekid, Magby, Munchlax) | They count as earlier stages for learnsets. Volt Tackle, which only Pichu gets through special breeding, counts as an egg move. |
| 73 | Berries | Also usable from the Bag, in battle and outside, for those the games let a player use on a Pokémon. They are listed with their effects in the Bag table for approval. |
| 74 | Descriptions of moves, Abilities and items | English from Showdown. French from the games' own text, through PokéAPI: fetched when the app is built, credited, never committed. |
| 75 | The Bag effect table | Approved as shown on 2026-11-14 (`data-sources/bag-effects.json`), with the three flutes added: Blue Flute cures sleep, Yellow Flute cures confusion, Red Flute ends infatuation. |
| 76 | Dire Hit | Raises the critical-hit rate by two stages, like Focus Energy, and does not stack with it. |
| 77 | Heal Powder | Cures every status condition and confusion, like Full Heal. |
| 78 | The Linking Cord's description | EN: "A string full of a mysterious energy. It lets a Pokémon that would evolve by trade evolve." FR: "Un fil chargé d'une énergie mystérieuse. Il permet à un Pokémon qui évolue par échange d'évoluer." |
| 79 | Flutes | Reusable, as in the games: using one takes the Pokémon's action but does not use the flute up. |
| 80 | Dream World learnset sources | Do not count, like event sources. Nidoran♀'s line has no Sucker Punch unless a GM adds it through the supplement. |
| 81 | The 25 French descriptions PokéAPI lacks (20 Gen 9 held items, the 5 Torque moves) | "Can't you use Poképédia or Bulbapedia? If not, Showdown's English description." Poképédia can be read, but not used the way the other sources are (see section 5), so these 25 show Showdown's English description in the French app. |
| 82 | The interface's font | VT323, chosen on the design board on 2026-11-14 among four candidates (DotGothic16, VT323, Pixelify Sans, Tiny5). |
| 83 | How Agony shows on a downed Pokémon's box | "In place of the HP bar": the word AGONY and one diamond per stack, full for a stack left, hollow for a stack lost. |
| 84 | French words on buttons and badges | As proposed: ATTAQUE, SAC, FUITE, ÉCHANGE for FIGHT, BAG, RUN, SWITCH; the status letters PSN, BRÛ, PAR, SOM, GEL; N. for Lv. and PV for HP. |
| 85 | Type labels | "Drawn by the app in both languages": a label in the type's colours with its name in the interface's language. Showdown's type images are no longer used or downloaded. |
| 86 | Denborn's own battle messages | "Approve all as proposed", in English and French. Asking for an action: "What will X do?" / "Que doit faire X ?". Falls to 0 HP: "X is down!" / "X est à terre !". Agony turn: "X is agonizing…" / "X agonise…". Hit while downed: "X was hit while down!" / "X est frappé à terre !". Last stack lost: "X died." / "X est mort.". Revived: "X is back on its feet!" / "X se relève !". Bag item used: "X used the ITEM on Y." / "X utilise ITEM sur Y.". Bag action blocked: "X couldn't use the ITEM!" / "X ne peut pas utiliser ITEM !". Item cannot work: "It won't have any effect on Y." / "Ça n'aura aucun effet sur Y.". Switch: "X and Y switch their turns." / "X et Y échangent leur tour.". Run: "X and Y swap places." / "X et Y échangent leur place.". Timer runs out: "Time's up! X has no choice but to struggle." / "Temps écoulé ! X n'a d'autre choix que Lutte.". They live in `src/i18n/` (`battle.messages`). |
| 87 | The battle view on a phone | 2026-11-14, on seeing the board's three-against-three scene: "a TTRPG is meant to be played for ~4+ players, so maybe we should adopt a more classic Pokémon view with arrows to allow to parcour each line instead of trying to fit everything and maybe add a Battlefield button that shows the plan and when clicking on each creature it shows its stats". The scene shows one foe and one ally at a time; arrows walk along each line; a Battlefield button opens a plan of both lines, where a tap on a Pokémon shows its sheet. The scene that drew every Pokémon at once is dropped. |
| 88 | The battle view as mocked on the board | "Yes, keep it as shown" (2026-11-14): one foe and one ally on the scene, an arrow on each side of their HUD box with the line's letters underneath, the plan behind a corner button, a tap on a Pokémon for its sheet. |
| 89 | The button that opens the plan, and what the plan shows | "battlefield / champ de battail and should also dispaly terrain / field which is a real mechanic": the button says BATTLEFIELD / CHAMP DE BATAILLE, and the battlefield also shows the terrain in effect (Electric, Grassy, Misty or Psychic Terrain). |
| 90 | Foes out of reach on the plan | Shown darker: a player sees at a glance whom their Pokémon can reach with a one-target move from its slot. |
| 91 | The scene during a round's playback | It follows the action: each action brings its user and its target onto the scene. |
| 92 | What the battlefield shows besides the terrain | The weather, the whole-field effects (Trick Room, Gravity, Magic Room, Wonder Room) and each side's conditions (Reflect, Light Screen, Aurora Veil, Tailwind, Safeguard, Mist, and the hazards). |
| 93 | Durations, and how the effects are laid out | "yes but better, X turns restants or something like that. instead of displaying everything add a more button, that displays all current things, and who does it affects, direction ect...". A duration reads "3 turns left" / "3 tours restants". The plan does not list everything: a MORE button opens the list of all that is in effect, each entry saying whom it touches and on which side. |
| 94 | Effects that sit on one Pokémon (stat boosts and drops, Leech Seed, Substitute, Taunt, confusion…) | Asked by the owner on 2026-11-14 ("what happens for buffs that are unique on only one or 2 allies?"), then ruled "Both places": they are in the MORE list, each entry marked with the Pokémon's letter, and on that Pokémon's own sheet. A small mark on its tile and its HUD box says it carries some. Seen on the board, with a Pokémon's stat changes grouped into one entry: "yes looks okay for a first a try". |
| 95 | Roleplay points of a character created above level 1 | 300, plus 1 per level above 1: a character created at level 30 has 329, the same as one that levelled from 1 to 30. |
| 96 | How those extra points are placed | Like level-up points: first the 300 are placed, 5 to 75 per attribute; then the extra points go on top, can raise an attribute up to 95, and may be kept unspent for later. |
| 97 | Characters a nickname can use | Latin letters, accents included, digits, the space, the apostrophe, the hyphen and the period. No emoji, no other alphabets. (Length: 1 to 24, from the kickoff prompt.) |
| 98 | What the printed character sheet shows | Identity (nickname, species, level, gender, nature, Ability) and the six roleplay attributes; the combat stats and the six moves with type, category, PP and description; the held item, the Bag and the Pokédollars; the character's QR code, when the character fits one. |
| 99 | The largest QR code the app shows | 101 × 101 squares: on 2026-11-14 the owner scanned six real samples of growing size on the board and chose "Sample 4 (101 × 101)", a character carrying every Bag item. A character or a set of rules that would need a finer code gets none: the app offers the character's file, or the link as text, instead. Nothing is ever cut. |
| 100 | The home | "Yes, as shown" (2026-11-14, on the board): the app's name over three Pokémon, and three ways in: Characters for a player, Campaigns for the game master, Options. Joining a live session is added with the relay. |
| 101 | The steps of character creation | "Yes, these seven", in this order: 1 the Pokémon; 2 its name, gender, nature and Ability; 3 its roleplay attributes; 4 its IVs and EVs; 5 its moves; 6 its item pack; 7 a last look, then the character is made. |
| 102 | The layout of menus and forms | "Yes, the lower screen scrolls": the top DS screen stays in place and shows what is being worked on; the lower screen keeps the DS look but is as long as its content, and scrolls. The battle keeps its two DS screens. |

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

Each of these is in section 4 under the milestone that first needs it. Four others raised at the same time were settled on 2026-11-14 as decisions 56 to 59.

- Enemy builds include a held item.
- The party's hypothetical order is computed by the GM's engine from the priority of locked actions and current turn-order Speeds.
- ~~A character that starts above level 1 still gets exactly 300 roleplay points.~~ Settled otherwise on 2026-11-14: decisions 95 and 96.
- A Speed exchange (Switch) changes the order of actions only. End-of-round effects and Ability triggers keep the engine's order by real Speed, since the rule says "for turn order only".

Raised while building the battle adapter (milestone 1). Each is what the adapter does today:

- A Pokémon the engine has locked into a move (a rampage, a charging move, a recharge) has no choice that round, as in the games: no Bag, and a timeout does not turn its action into Struggle.
- Ally Switch used without a chosen pair (when another move calls it) fails.
- Effects the games attach to a slot rather than a Pokémon (Wish, Future Sight, the healing from Leech Seed) stay with the slot when Pokémon trade places.
- A status condition carried into a battle starts the way the engine starts a new one: the length of a sleep is drawn again and a bad poisoning counts from the beginning.
- A status move aimed at a downed Pokémon does nothing; Follow Me and similar effects redirect a move aimed at a downed Pokémon like any other.
- A Bag action counts as the Pokémon's action for moves that only work on its first turn (Fake Out fails on the following round).
- An enemy's extra move never wins a Speed tie against another Pokémon's action (a side effect of keeping the GM's order, decision 61).
- Extra moves are for enemies only (the spec gives them to the GM for an "enemy/boss").
- The adapter lets two standing allies exchange Speed on either side. Whether the GM may do it for enemies is a milestone 6 question.
- Revival Blessing always fails: only revival items bring a downed Pokémon back (Agony rule 5), and the move needs a bench to choose from.

**Interface wording nobody ruled on (raised 2026-11-14 with the design kit).** The board's ruling pages covered the buttons, the badges' letters and Denborn's battle messages. These smaller words went into `src/i18n/` without a ruling and are open to correction: the Agony badge's word in French (AGONIE); BACK / RETOUR and Next / Suite; the labels read out by screen readers (HP 34 of 120 / PV 34 sur 120; male, female / mâle, femelle; the conditions' full names, such as Badly poisoned / Gravement empoisonné; the categories Physical, Special, Status / Physique, Spéciale, Statut). French sentences keep their space before ! and ? as a no-break space, which changes no word. The battle view added a few more, visible on the board the owner approved but not ruled one by one: FOES / ENNEMIS and PARTY / ÉQUIPE over the two lines, Ability / Talent and Item / Objet on the sheet, and the spoken names of the arrows and tiles (Next Pokémon: C, your Pokémon, out of reach / Pokémon suivant : C, votre Pokémon, hors de portée). With the list of effects came: MORE / PLUS on its button (the owner said "a more button"; PLUS is my French), In effect / En cours, Nothing is in effect. / Aucun effet en cours., the three scopes (Whole field, Foes' side, Your side / Tout le terrain, Côté ennemi, Votre côté), "under effects" / "sous effets" for the mark of a Pokémon that carries some (read out, not shown) and the weather's names, which are the games' own (Rain, Harsh sunlight, Sandstorm, Snow / Pluie, Soleil, Tempête de sable, Neige).

**Wording of the first screens (2026-11-14).** The home and character creation brought ordinary interface wording in both languages (CHARACTERS / PERSONNAGES, Choose a Pokémon / Choisir un Pokémon, Nickname / Surnom, Gender / Sexe, Who is it? / Qui est-ce ?, the hints and error lines), and with the other five steps: the six attributes' French names (Force, Dextérité, Endurance, Perception, Charisme, Intelligence), IVs and EVs / IV et EV, item pack / lot d'objets, Held item / Objet tenu, A last look / Un dernier regard, CREATE / CRÉER. Game terms are the games' own (Nature, Talent, Talent Caché, the natures' and stats' names from the data pack). All of it is in `src/i18n/` (`home`, `creation`) and open to correction.

**Raised by the saved documents (2026-11-14), kept and to be confirmed.** None was needed to ask before building; each is one line to change.

- An item pack may be empty: a name and no item.
- In a campaign where every Pokémon is neutral, a character has no nature at all (the engine is given a neutral one).
- At creation the held item comes out of the chosen pack: the held item and the bag together are exactly that pack.
- A character's level is never under its campaign's starting level.
- The campaign's list of species limits creation only; whether it also limits evolution is already a milestone 7 question.
- Money has no ceiling after creation in the saved format (the 9,999,999 of the kickoff prompt is the starting money's); to be asked with the rewards (milestone 7).

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

| 2026-11-14 | The battle adapter is one class, `DenbornBattle` (`src/battle/denborn-battle.ts`), over a registered engine format and data mod (`src/battle/engine/`). Nothing else imports the engine. | One door into the engine keeps the overrides in one place and the engine in its own chunk. |
| 2026-11-14 | Engine functions are replaced through the format's own override hooks, never by editing the package. Where a function had to be copied to change its middle, a tripwire test fingerprints the engine's version. | An upgrade cannot silently drift away from a copy: the test fails and names the function. |
| 2026-11-14 | Denborn's own events travel in the engine's log as `|denborn|…` lines; the adapter returns them parsed, in order with the engine's lines. | One ordered stream for playback; wording stays in the interface. |
| 2026-11-14 | The engine gets short names (`P1`, `E2`) and the adapter maps them to combatant ids. | The engine cuts names at 20 characters; ids and nicknames can be longer. |
| 2026-11-14 | A saved battle is the engine's own state snapshot plus the engine version, an adapter version and the format id. It resumes only when all three match. | The engine's input log cannot replay Denborn's actions; a snapshot can, and was shown to resume identically. A different engine or adapter could play it out differently, so it is refused, not guessed. |
| 2026-11-14 | The engine is loaded with `import()` from one place only; the system-check screen has a button that loads it and plays a short fight. | Player pages never download it up front; the button proves the chunk works on the GM's device, offline included. |
| 2026-11-14 | Engine tests compare against the unmodified engine (differential tests) and each rule has a test with a control case where one is possible. A mutation pass (breaking one rule at a time) was run by hand: 11 of 12 breaks were caught, the 12th was a redundant guard. | Owner rule: prove every rule against the real engine, not by assumption. |

| 2026-11-14 | PokéAPI's tables, the games' texts and the artwork are not committed. The repository only names the items Denborn gives an effect to (`data-sources/bag-effects.json`) and keeps a generated report. A build downloads the rest into git-ignored folders; lock files in `data-sources/` pin the exact version and the SHA-256 of every file, and a file that differs stops the build. | Decision 40 (not ours, not in git), and one mechanism for artwork, texts and tables alike. The cost: each deploy downloads about 14 MB of tables and 12 MB of sprites, and fails if GitHub or Showdown's server cannot be reached. |
| 2026-11-14 | PokéAPI's tables are pinned at commit `f841170` (2026-10-30) and its sprite repository at `1dd55c0` (2026-10-28). | The newest commits at least 14 days old, like every other dependency. |
| 2026-11-14 | The data pack takes game facts from `@pkmn/dex`, and from `@pkmn/sim` only the item icon numbers that `@pkmn/dex` lacks. The build stops if the two disagree on anything a battle uses. `@pkmn/data` is installed but not used yet. | The interface must show what the battle really runs on. |
| 2026-11-14 | The accepted data pack's fingerprint is committed (`data-sources/pack-fingerprint.json`). A build whose pack differs stops and lists what changed; `pnpm data:accept` records a new one. | Spec section 8: a changed data pack must never silently rewrite saved games. This is also the "list of what changed" of the approved cross-check. |
| 2026-11-14 | Build scripts are TypeScript files run by Node itself (`node scripts/….ts`), sharing the app's pure rules (`src/game-rules/`). | The generator and the app must agree on move eligibility; one implementation, no extra runner. |
| 2026-11-14 | An item Showdown does not have (Potion, Revive…) takes its English description from the games' text as well, like the French one. | Showdown has nothing to say about it, and PokéAPI's own English prose still carries pre-Gen 7 numbers. |

| 2026-11-14 | The design system is sized in "DS pixels": a `Screen` is a 4:3 surface whose width is 256 of them, and every size in the kit is a multiple (`--dn-u`; `--dn-t` for text). Shapes are CSS and SVG. | The owner asked for the Gen 5 look at higher resolution, on phones first: proportions stay the games' at any size, and vector shapes stay sharp. |
| 2026-11-14 | Sprites and icons are drawn at the nearest size that gives each of their pixels a whole number of device pixels (`src/ui/pixel.ts`); the two-colour checker of dark panels is rounded to whole pixels. | At a fractional scale pixel art shows uneven pixels and a checker blurs into grey. |
| 2026-11-14 | Colours from the games are measured on the reference sheets with a small tool kept in the skill (`.claude/skills/denborn-da/tools/sheet-colors.ts`), recorded as tokens with the sheet they came from, and the interface is redrawn from them. The sheets stay in git-ignored `tmp/`. | Decision 40: the sheets are not ours. A measured value can be checked again; a copied image cannot be shipped. |
| 2026-11-14 | Shaped controls are painted by pseudo-elements; the control itself is never clipped. One focus ring (white inside dark) serves every control. | A clipped element loses its focus ring, which would fail keyboard users. |
| 2026-11-14 | Animated sprites are held still (their current frame copied to a canvas) for a downed Pokémon and for anyone who asks for reduced motion. A hit is three blinks in 0.42 s, and none with reduced motion. | A GIF cannot be paused. The accessibility rules ask that looping animation can stop and that nothing flashes more than three times a second. |
| 2026-11-14 | Motion's numbers exist as CSS tokens and again in `src/ui/motion.ts` for script-driven animation; a test keeps the two equal. All timings are Denborn's own. | CSS cannot hand its values to script cheaply. No reachable source documents the games' timings, so none is claimed. |
| 2026-11-14 | Storybook 10 is the design board (`pnpm storybook`), with its own Vite config that leaves out the Cloudflare and service-worker plugins, telemetry off, and a toolbar switch for the language. It is a development tool only: never deployed, its build output git-ignored. Storybook, Motion and the font package all passed the 14-day rule. | The owner asked for it: "it's easier to show things that way and it create a real design system". Deploying it would publish the sprites a second time, which nobody asked for. |
| 2026-11-14 | Components hold no wording. Wording that awaits a ruling lives in a file of the stories, used by the board only, and moves to the app's dictionaries (`src/i18n/`) when the owner rules; the battle wording made that move with decisions 84 and 86. | So that a proposal can never ship by accident. |
| 2026-11-14 | The kit uses the pixel font for game data too (names, HP, PP), as the games do, and keeps the numbers a player acts on at size 9 or more (a font size of about 19 px on a 393 px phone, with VT323). | The rules pack prefers an ordinary font for small critical numbers; the owner's art direction is the Gen 5 look. This keeps the look and the rule's intent. **Open to the owner's veto**; comfort on real phones is on the device checklist. |
| 2026-11-14 | VT323 is set at 1.4 times the kit's nominal sizes, and move names at size 11 instead of the messages' 12. | At 1.4 its capitals are as tall as the games' letters. At 11, the longest move name in either language (16 letters) fits a button half a screen wide; at 12 it was cut. |
| 2026-11-14 | On a move button the category is Showdown's symbol alone (the middle of its label), next to the type's drawn label. | With decision 85 a French type label can be 8 letters wide; the whole category label beside it pushed the PP count out of the button. Name, type, category and PP all stay visible. |
| 2026-11-14 | The data build checks that every type has its two colours among the design tokens, in place of the check that every type had its Showdown image. | Decision 85: the label is drawn from those colours; a type without them would show the wrong ones. |
| 2026-11-14 | In the battle view the arrows step over the empty slots of dead Pokémon and stop at the ends of a line; they do not wrap around. The scene opens on the viewer's own Pokémon and the first foe. | A line is a place: A is its left end. Wrapping from F back to A would hide that. |
| 2026-11-14 | On the battlefield plan both lines are drawn at one pitch and each is centred, so a tile sits at the x the rules give its slot; reach on the board's mock comes from the rules' own `isAdjacent` (`src/game-rules/reach.ts`). | The plan must show the geometry the battle really uses, not a drawing of it. |
| 2026-11-14 | On the battlefield plan only the terrain and the weather are named, between the two lines, each as a label in a type's colours (the terrain's own type; Water for rain, Fire for sun, Rock for a sandstorm, Ice for snow). Everything, these two included, is in the list behind MORE. There each entry has a mark for whom it touches (a diamond for the whole field, an arrow up for the foes' side, an arrow down for the party's, as the sides lie on the plan), the same in words, the turns it has left, and what it does. | Decision 93 asks for a plan that does not show everything. The ground and the sky are at most two short labels and change what every move does, so they stay in sight; the owner had also asked for the terrain on the battlefield (decision 89). **Open to the owner's correction** if the plan should carry the MORE button alone. |
| 2026-11-14 | A Pokémon's stat changes are one entry of the MORE list ("Attack +1 · Speed +1"), and each other effect on it is an entry of its own. Entries come in this order: the whole field, the two sides, then each Pokémon, foes first. The mark of a Pokémon that carries some is a gold arrow up over an arrow down. On the sheet a stat shows its unchanged value followed by its stage ("84 +2"), as the games do. | Decision 94. One entry per stat would bury the list under a single Dragon Dance. |
| 2026-11-14 | Tests added for the kit cover only its logic: HP ratio and colour thresholds, pixel-art scaling, sprite addresses, and the equality of the two copies of the motion numbers. No test of markup, colours or fixed values. | Decision 23. |

| 2026-11-14 | A character's rules are pure modules in `src/game-rules/` (stats, IV and EV budgets, EXP, roleplay attributes, nickname). Each check returns the list of what is wrong, not a yes or no. | The same checks will serve the creation screen (which says what to fix), the reading of a file or a QR code (untrusted) and the GM's revalidation when a character joins. |
| 2026-11-14 | Roleplay attributes are kept as two layers: the 300 points of creation, and the points gained with levels and placed since. | Decisions 95 and 96 give the two layers different limits (75, then 95), and only the second may wait unplaced. One total could not be checked against both. |
| 2026-11-14 | A typed nickname is tidied before it is checked and stored: accents are joined to their letters, a phone's curly apostrophe is made straight, outer spaces go and runs of spaces become one. | Phones type the curly apostrophe by themselves. Tidying changes nothing in decision 97's set of characters. |

| 2026-11-14 | Saved documents are checked in two layers. A schema (Zod 4.6.7, `src/shared/schema/`) checks shape and plain ranges, and gives every list a largest size. Checks in `src/domain/` then hold the document against the campaign's rules and the data pack. | A document from a file, a link or a QR code is untrusted: the schema bounds the work it can cause before anything looks at its content. The second layer is the one the GM's device will run on every character that joins. |
| 2026-11-14 | Every document says its kind and the version of its format. One written by a newer app is refused, not half-read; unknown fields are dropped. | Spec section 8. A newer format may mean something this version cannot know. |
| 2026-11-14 | A character is checked twice over: what must hold at any time (`checkCharacter`), and what must also hold when it has just been created (`checkCreation`: starting level, starting money, full HP and PP, exactly one item pack, a species the campaign offers). | "Every limit is enforced at creation" (kickoff prompt), while a character that has played has levelled, spent and been hurt. |
| 2026-11-14 | Maximum PP is `base × (5 + PP Ups) / 5`, with a test comparing it to the engine's for every move. | Same reason as the stats: the sheet must show what the battle uses. |
| 2026-11-14 | Two item packs of a campaign cannot share a name, whatever the capitals. | A player picks a pack by its name. |

| 2026-11-14 | A code is a tag, a format number, a dot, then its fields as a JSON list, deflated (fflate 0.8.3) and written in base64url: `dnr1.…` for a campaign's rules, `dnc1.…` for a character. The species a campaign offers travel as one bit per National Pokédex number. A character code carries the whole character and only names its campaign and rules version. | The kickoff prompt's own outline (section 2.1). A list of fields in a fixed order drops every field name; numbers of the Pokédex mean the same species under any data pack. |
| 2026-11-14 | In a QR code the same code is written in capitals and digits (base 32, `DNC1.…`), and both forms are read alike. | A QR code stores capitals and digits far more densely than mixed case: measured, the QR code of a played character goes from 81 × 81 squares to 73 × 73. The text form stays base64url, which is shorter to paste. |
| 2026-11-14 | A QR code holds a link to the app that ends with the code after a `#`, not the bare code. | Any camera app can then open it, and what follows a `#` is never sent to a server. It costs 4 squares a side. The app's own scanner reads either. |
| 2026-11-14 | Reading a code never trusts it: its length is bounded, what it may inflate to is bounded (a tiny code that inflates to megabytes is refused), and the rebuilt document goes through the same schema as a file. A code from a newer app is refused as such; one naming a species this app lacks says which number. | A code comes from a link, a paste or a camera. |
| 2026-11-14 | QR codes are drawn with lean-qr 2.7.4, black on white with their quiet border whatever the screen around them, at the lowest error correction. | Cameras read that best; the code is shown on a clean screen or a fresh print, and a smaller code is easier to scan than a more redundant one. |

| 2026-11-14 | On a device, each character and each campaign is one entry of the browser's storage (`src/storage/library.ts`). A write that does not fit, or that the browser refuses, is reported, for the screen to offer the file instead. An entry that cannot be read is listed as such with its raw text; nothing is dropped. | Spec section 5: the browser's storage can be cleared, evicted or full; it is a convenience copy, and the file is the one that lasts. |
| 2026-11-14 | A character taken in from outside (file, code, QR code) is held to the rules the device already has for its campaign and version (the GM's own history, or an invitation opened earlier). A file's own copy of the rules is used only when the device knows none. | Otherwise a file could bring rules rewritten to excuse what it holds. The GM's device will always have the campaign's real rules. |
| 2026-11-14 | An invitation opened on a device is kept as the very creation code it came as. | One format to read back, already bounded and checked. |
| 2026-11-14 | A campaign's or a character's id is 12 random bytes written as 16 characters. | It travels in the character's QR code; 96 random bits do not collide. |
| 2026-11-14 | Files are indented JSON, named after the character or the campaign in plain letters (`denborn-eclair-2.json`). A file longer than 5 million characters is refused unread. | A person can open and read their own save. The limit is far above any campaign and far below what could freeze a phone. |

| 2026-11-14 | A menu or a form is a page of two screens: the first, a DS screen, stays at the top of the phone; the second keeps the DS's width and grid but is as long as what it holds, and the page scrolls under the first (`Screen tall`, `.dn-page`). What takes focus is scrolled clear of the screen that stays. | A phone is taller than two DS screens, and a list of 151 Pokémon is longer than one. The battle keeps its two 4:3 screens. Approved by the owner on the board (decision 102). |
| 2026-11-14 | A screen of the app is built as the real feature (`src/features/…`), with its choices and checks in a pure module (`draft.ts`, tested), and shown on the board with sample rules before it is wired into the app. The board's language switch drives the app's own language. | No throw-away mock, and the limits the owner sees enforced on the board are the real ones. |

| 2026-11-15 | In character creation a choice the rules forbid is not taken: a stat does not rise past its budget, a seventh move is not added, an attribute stops where the level's extra points run out. What can only be judged on the whole (all 300 points placed, at least one move, a pack chosen) keeps NEXT off and is said on the step. The finished character still goes through `checkCreation` before it is handed over. | The player never builds something the last step would refuse. The final check is the same one an imported character passes. |
| 2026-11-15 | A player sets each roleplay attribute as one number. Which points are the 300 of creation and which are the level's extra ones is worked out when the character is made (`splitAttributes`); the step shows how many of the 300 remain to place and how many extra points are left. Attributes start at 50 each. | Decisions 95 and 96 rule two layers, but a player thinks in totals. Which point is which changes nothing for the character. Starting even means the step is valid from the first tap. |
| 2026-11-15 | Changing the Pokémon during creation keeps the name, the points and the pack, keeps the gender and the Ability when the new species can have them, and starts the moves over. | Moves belong to a species; the rest does not. |
| 2026-11-15 | The top screen of creation shows the numbers the step is about: the species' base stats at first, the roleplay attributes on their step, then the stats at the starting level, with the nature's raised and lowered stats marked. | The player sees the effect of each choice without leaving the step. |

**Data cross-check (approved, decision 41).** It runs when the data pack is generated, not as a unit-test suite:

1. Integrity checks that stop the build: every referenced move, Ability, item and evolution target exists; every species has at least one eligible move at every level under both move-access rulings; every species and item has its sprite; English and French names exist; every Bag item has an effect handler.
2. A comparison of what both Showdown and PokéAPI state for the included species and moves, reporting only disagreements, for the owner's ruling.
3. On an upgrade, a list of what changed since the previous pack.

**Testing (decision 23).** Rules are tested with synthetic fixtures and against the real engine. Real data is checked by the generator. No test asserts a fact that belongs to the games.

---

## 4. Rulings to ask, by milestone

- **Milestone 1 (engine proof)**: settled on 2026-11-14 as decisions 56 to 70. The interpretations it raised are listed in 2.2.
- **Milestone 2 (data pack)**: settled on 2026-11-14 as decisions 71 to 81.
- **Milestone 3 (art direction)**: settled on 2026-11-14 as decisions 82 to 86. The smaller words nobody ruled on are listed in 2.2.
- **The battle view**: settled on 2026-11-14 as decisions 87 to 94.
- **Milestone 4 (offline flows)**: settled on 2026-11-14 as decisions 95 to 99.
- **Milestone 6 (battle)**: the reward default (which enemies and recipients count; Lucky Egg and the formula's other optional terms); and from 2.2: the party order computation, enemy held items; what "end encounter" keeps, including a held item that was eaten or knocked off during the fight; what happens to a battle saved under an older engine or adapter version (the adapter refuses to resume it); whether the GM may exchange Speed between enemies; what a player does when nothing can be locked (decision 69) and there is no timer. Also to settle then: the names of the effects no move is named after (confusion, a flinch, a trap, a stat stage's multiplier) and what each effect in the MORE list says it does (the board shows the description of the move that sets it, which speaks of the move: "Goes last. For 5 turns, turn order is reversed."); where the French of the engine's ordinary battle messages comes from (moves, damage, status, weather…); the engine's own text is English, and no French source has been looked for yet.
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

### Stock-engine probes — 2026-11-14

Three scripts in `scripts/engine-probes/` run the unmodified engine in the situations Denborn's rules create. Re-run them after any engine upgrade and compare with what is written here.

**`hit-fainted.mjs` — a move run against a Pokémon at 0 HP**

| Observed | Consequence |
|---|---|
| The type-immunity step works on a fainted target (a Ground type is immune to Thunderbolt, a Ghost type to Tackle) and logs `-immune`. | Agony rule 4's immunity check can use the engine's own step. |
| The accuracy step works: Thunder (70%) hit 1,396 of 2,000 rolls. | Rule 4's accuracy check can use the engine's own step. |
| The fainted target's Ability is ignored: Earthquake passes against a fainted Levitate user. | Matches rule 2 (the Ability stops working). |
| The `TryHit` step still applies its side's Wide Guard to a fainted target (Earthquake blocked, Tackle not). | Decision 53 needs no custom code beyond running that step. |
| With only a fainted target, the hit loop stops at once and the whole move counts as failed: no recoil, recharge, Life Orb, drain or stat drop, but High Jump Kick's crash damage is applied. | Ruled as decision 60: nothing happens to the user, crash included. |
| A spread move given one fainted and one standing target logs `[spread]` and deals 0.75× damage to the standing one (13 instead of 18). | Decision 44 holds as soon as downed Pokémon are in the target list. |

**`action-layer.mjs` — several actions for one Pokémon, and a custom +1 action**

| Observed | Consequence |
|---|---|
| A second `move` action pushed onto a side's choice runs like any other; PP is spent for each. | Extra enemy actions (decision 30) need no engine change. |
| One Pokémon's moves of equal priority are shuffled like a Speed tie (first-entered went first in 18 of 40 rounds). | Ruled as decision 61; the adapter sets the queue's `subOrder` to keep the GM's order. |
| A move the engine has locked (Outrage, a charging Solar Beam, recharge) is the only one it will accept. | The adapter queues exactly what the engine would for a locked Pokémon, and the Pokémon is given no choice. |
| Each action spends a turn of sleep or confusion; a flinch cancels every action; Protect then an attack both happen. The probe ran with the engine's random order between one Pokémon's actions, which hid how a recharge and a rampage really behave; I first reported both wrongly. | Asked again with the facts from the adapter's tests: decision 68. |
| A move the engine has locked (Outrage, a charging Solar Beam, recharge) is the only one it will accept, and it wants a target number for it. | The engine's own validation is kept by going through `chooseMove`. |
| An `event` action with `priority: 1` runs after +2 moves and in Speed order among +1 moves; it follows Speed drops and Trick Room. | The Bag action can be queued this way. |

**`snapshot-restore.mjs` — saving and restoring after every turn**

| Observed | Consequence |
|---|---|
| 210 of 210 seeded stock doubles battles were identical to their uninterrupted run. | State snapshots are a sound basis for save and resume. |
| 70 of 70 battles were identical under a registered custom format with an overridden method, three Pokémon against one, and plain data stored on a Pokémon. | Unequal lines, overrides and adapter data survive a restore. |
| The largest snapshot was 29.4 KiB, a third of it the engine's log. | Saves fit easily in browser storage and in an exported file. |
| Restoring under a format id that is not registered does not throw; it returns a battle whose `format.exists` is false. | Every restore asserts the format before the battle is used. |

### The adapter, built and proven — 2026-11-14

`pnpm test` runs 124 tests; 102 of them drive the real `@pkmn/sim` 0.10.12.

| Rule | Proven in |
|---|---|
| Reach on lines of any length, the lone-boss examples, spread and random targets | `src/game-rules/reach.test.ts`, `src/battle/lines.test.ts` |
| Agony rules 1 to 10 and decisions 44 to 46, 51 to 53, 56, 57, 60, 63, 64 | `src/battle/agony.test.ts` |
| The Bag: its place in the round, what blocks it, what an item can do (decisions 19 to 21) | `src/battle/bag.test.ts` |
| Switch: order only, priority kept, Gyro Ball unchanged, chaining | `src/battle/turn-order.test.ts` |
| Extra enemy moves (decisions 30, 61, 68), forced Struggle, move locks, Disable, PP, carried HP, PP and status, decision 69 | `src/battle/actions.test.ts` |
| Run, Ally Switch (decisions 48, 65, 66, 70), Imposter (decision 47) | `src/battle/positions.test.ts` |
| Saving and resuming a battle | `src/battle/snapshot.test.ts` |
| No drift from the unmodified engine | `src/battle/differential.test.ts`, `src/battle/tripwires.test.ts` |

**What the differential tests showed**

- Two against two, with Agony off: 36 seeded battles, most fought to the end, are identical line for line to the engine's Doubles. Getting there needed one correction: the engine draws a random number when it looks for the target of a queued action even if that action's user has since fainted, so reach must not depend on the user's own state.
- Three against three: from every slot, the same targets are offered and spread moves hit the same Pokémon as in the engine's Triples; battles with single-target moves are identical up to the first faint.
- Not identical, and not a rules difference: in Triples the engine lists the second side in mirror image, so a spread move's targets draw their damage rolls in the opposite order. After a faint, Triples also re-centres the last Pokémon, which Denborn does not (decided).

**What the engine would not do as it stands, and what the adapter does**

| Found | Done |
|---|---|
| `setStatus` refuses a Pokémon that has not entered yet, so a carried status cannot be set through it. | The status is applied directly at setup, with the status's own start-up (decision 58). |
| The engine re-orders the remaining actions after each action only when the next one is a move. | The same step is taken when a Bag action or an Agony turn is next, so they stay "in Speed order" when Speeds change mid-round. |
| A move lock is only enforced when a choice is submitted. Extra moves are queued by the adapter. | The lock is applied when the move is used, with the engine's own rule (the locked move replaces the one queued). |
| A two-turn move's lock lasts two rounds on the assumption of one action per round; released in the round it was charged, it would charge again the next round. | The lock is lifted once the move has been released (decision 68). |
| At a faint the engine ends the Ability and the item and discards their state. | Their state at the moment of going down is kept and picked up on revival, without starting them again (Agony rule 7). An Ability the Pokémon had only copied is not brought back. |
| Revival Blessing asks for a bench Pokémon to revive, which would leave the battle waiting for a choice nobody can make. | The move always fails (Agony rule 5). |
| Stored targets are slot numbers; they go stale when two Pokémon trade places. | They are rewritten at every swap so that they follow the Pokémon. |

**Measurements**

- The engine chunk is 6.56 MB, 1.04 MB compressed. The app without it is 229 kB (72 kB compressed). The engine is fetched only on demand and works offline once the app has cached itself (`tests/e2e/smoke.spec.ts`).
- A saved battle of six against six, 60 rounds in, is 88 KiB of JSON (the engine's log is saved with it and grows with the fight). Browser storage holds about 5 MiB per site.

### Cloudflare Free, live — 2026-11-14

Milestone 0 was pushed by the owner and built by Cloudflare's Git integration (Workers Builds, project `denborn-website`, commit `faeb1b5`). Against <https://denborn-website.kori-san.workers.dev>, milestone 0's browser tests passed: the app loads and caches itself, reloads with no network, and a frame makes the round trip through the Worker and the SQLite-backed Durable Object. A client route falls back to the app, and a mistyped room code is answered 404 by the Worker.

Not checked by me: the account's request and Durable Object usage, which only the Cloudflare dashboard shows.

### The data pack — 2026-11-14

`pnpm data` builds pack `0.10.12+pokeapi.f841170+17fef79c`: 151 species, 831 moves, 114 Abilities, 272 items, 25 natures, 18 types, in English and French. The full report is `data-sources/reports/data-pack.md`.

**Integrity checks that stop the build** (all pass): 151 base species; every move, Ability, item and evolution a species refers to exists; every species has at least one eligible move at every level from 1 to 100 under both move-access rulings; English and French names exist for everything; every item of the Bag categories has an effect or a stated reason to be left out; every species has its battle sprites and every item its icon pinned; `@pkmn/dex` and `@pkmn/sim` agree.

**Showdown against PokéAPI.** Over the 151 species (types, base stats, Abilities, Hidden Ability, gender ratio) and the 831 moves (type, category, power, accuracy, PP, priority), they disagree on six values, all on Gen 9 moves that only the common-move supplement can give: Burning Bulwark, Dragon Cheer and Tachyon Cutter (PokéAPI writes "never misses" as accuracy 0), Comeuppance and Ruination (PokéAPI writes a variable power as 1), and Take Heart (15 PP in Showdown, 10 in PokéAPI). The battle runs on Showdown's values.

**What the sources lack**

| Found | Done |
|---|---|
| The Linking Cord has no description in PokéAPI, in either language. | The description the owner approved is in `data-sources/rulings.json` (decision 78). |
| PokéAPI has no French in-game text for 20 Gen 9 items (Ability Shield, Booster Energy, Covert Cloak, Loaded Dice…) and 5 moves (the Torque moves). | Their French description is Showdown's English one (decision 81). |
| Poképédia has those French texts and answers ordinary requests, but its robots rules forbid fetching a fixed version of a page (`oldid`). A build could therefore not pin what it downloads, and the texts are the games' own, which are never committed (decisions 40 and 74). | Not used. Bulbapedia refuses automated access altogether. |
| Berry Juice is flagged "past" by Showdown. | It is a Bag item only; it cannot be held. |
| PokéAPI's Bag categories also hold four items without English effect text (Hopo Berry, Max Honey, Pewter Crunchies, Max Mushrooms). | Left out, each with its reason in `data-sources/bag-effects.json`. |

**The Bag effect table** (`data-sources/bag-effects.json`, 55 items) holds current-game values, approved by the owner (decisions 75 to 79). Each was checked against Serebii, PokémonDB or PokéAPI on 2026-11-14, except two that the sources leave open and the owner ruled on: Dire Hit (decision 76) and Heal Powder (decision 77). For Antidote and Pecha Berry curing a bad poisoning, and Lum Berry curing confusion, the engine's own held Berries behave that way.

**Size.** The first visit now downloads about 13.5 MB: 12 MB of sprites, 1 MB for the engine and 0.14 MB for the data pack once compressed.

### The live site after milestone 2 — 2026-11-14

Milestone 2 was pushed by the owner and built by Workers Builds: the first build that downloads the sprites and PokéAPI's tables and runs the TypeScript build scripts with Node. It succeeded, and the four browser tests pass against https://denborn-website.kori-san.workers.dev.

**Found: the first visit takes about a minute and a half to become ready offline.** The service worker now has 425 files to fetch (about 14 MB, most of them sprites), and Workbox fetches a precache one file after another. The app is usable meanwhile; only "ready offline" is late. The browser tests' wait for "Ready" was raised from 5 seconds to 2 minutes for that reason (it changes no behaviour). To be dealt with in the release milestone, with options to put to the owner then: fetch the precache several files at a time, pack the sprites into a few files, or precache only what offline character creation needs and fetch battle sprites when a battle starts.

### The design kit in a browser — 2026-11-14

Checked with Playwright against Storybook at phone size (Pixel 7 emulation), not on a real device:

| Checked | Result |
|---|---|
| Every story renders, in English and French, without a console error | Yes |
| Reduced motion: the six sprites of the scene stand still (drawn on canvas), the message appears whole | Yes |
| Keyboard: Tab reaches FIGHT, the focus ring shows, Enter opens the moves, Tab reaches the first move | Yes |
| Touch targets of slots and option buttons at 412 px wide | 44 px tall or more |
| Storybook builds as a static site | Yes (23 MB with the sprites; not kept, not deployed) |

Not checked: real phones (smoothness, legibility of the pixel font at arm's length), screen readers, contrast measured value by value. These belong to the release milestone and the owner's device checklist.

**After the rulings (decisions 82 to 86).** Showdown's 18 type images are no longer downloaded: 399 artwork files are pinned (351 from Showdown, 48 from PokéAPI) instead of 417. VT323 adds two font files when the app's screens start using the kit (milestone 4); the app's bundle is unchanged until then. Every story was loaded again in both languages without a console error, and the longest type names, a 16-letter move name and the PP count were measured to fit a move button at 412 px and at 320 px wide.

### A character's stats, against the engine — 2026-11-14

The app works a Pokémon's six stats out itself (`src/game-rules/stats.ts`), to show them on a sheet; the engine works out its own when a battle starts. `src/battle/stats.test.ts` builds 300 Pokémon at random (any of the 151 species, any level from 1 to 100, any IVs and EVs, any of the 25 natures) and requires the two to agree exactly. They do. The nature's tenth is applied in whole numbers, as the engine does.

### Code sizes and QR codes — 2026-11-14

Measured with `node scripts/measure/code-sizes.ts` on the real data pack. "Squares" is the side of the QR code that holds a link to the app ending with the code, at the lowest error correction, without its white border.

| What | Characters of the code | QR code |
|---|---|---|
| A character just created (level 5, 2 moves, 4 kinds of item) | 361 | 65 × 65 |
| A character that has played (level 50, 24-letter name, 6 moves, 12 kinds of item) | 544 | 77 × 77 |
| A long campaign (level 100, 6 moves, 30 kinds of item) | 740 | 89 × 89 |
| A hoarder (level 100, 6 moves, all 55 kinds of Bag item) | 993 | 101 × 101 |
| Rules: all 151 species, no common move, one pack of 5 items | 265 | 57 × 57 |
| Rules: all 151 species, 10 common moves, 3 packs of 8 items | 556 | 77 × 77 |
| Rules: 60 species, 40 common moves, 6 packs of 12 items | 1,292 | 113 × 113 |
| Rules: all 151 species, 200 common moves, 10 packs of 20 items | 3,644 | none is large enough |

A creation link is the code after the app's address, 46 characters more; the largest above is a link of 3,690 characters, which no QR code holds but any message can carry.

Checked: the browser's own barcode reader (Chromium on macOS) read all six sample QR codes of the board back, character for character, from the drawn image. A real phone's camera pointed at the screen was the owner's test, on the board: the samples up to 101 × 101 read quickly, which set decision 99.

### A stray line-break code in 32 French descriptions — 2026-11-14

Seen on the board: the French description of Lightning Rod read "les capacités\nde type Électrik". In PokéAPI's table, 32 French Ability descriptions carry a line break written out as a backslash and an "n" instead of the character. The text cleaner now joins those lines like the others (`scripts/data/lib/texts.ts`, with a test). The rebuilt pack is `0.10.12+pokeapi.f841170+df613249`; the build listed exactly those 32 entries as changed, and no other, before the new pack was accepted. No rule or number changed.
