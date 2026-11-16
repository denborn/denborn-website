# Pokémon TTRPG Companion — Claude Code project instructions

This repository is a Pokémon-only cooperative tabletop companion PWA, **not** a new combat system. The human project owner alone approves game rules and product scope.

## Source of truth / precedence
1. Owner's latest explicit decision in the conversation or a subsequent signed-off change. Every decision is recorded with its date in `DECISIONS.md`, which also lists unconfirmed interpretations and the rulings still to ask before each milestone.
2. `tasks/V0_SPEC.md` for the first playable version; `V1_SPEC.md` adds Gen 2–9 species, `V2_SPEC.md` adds boss balancing.
3. `docs/RESEARCH_DECISIONS.md` distinguishes engineering recommendations, constraints and unverified integrations.
4. `.claude/rules/` gives implementation practice. **Never promote a recommendation or TBD to a confirmed game rule.**

## Non-negotiables
- Pokémon are the characters; there are **no trainers**.
- D100 is **only for out-of-combat roleplay**, using six independent attributes; Pokémon battle math stays in the simulator.
- Generation **9 combat rules** are the baseline even in V0; V0 is limited to the first 151 Pokémon species. V1 adds through Gen 9; V2 is for boss balancing.
- Six equipped moves; Gen 5-inspired animated visuals and actual item icons, Showdown `ani` fallback for missing `gen5ani`; no generic-icon substitution for existing Pokémon assets. A battle sprite that is not there (not fetched yet, or missing) shows MissingNo. in its place (decisions 181 and 185).
- GM-controlled campaigns/encounters, live room and shareable *offline* character-creation link; GM authoritative in live battles.
- Only JSON files + `localStorage` copies for canonical saves. **No application database**, paid Cloudflare service, server-canonical saves or silent storage changes.
- PWA installable on iOS/Android; offline UI, character creation and cached data/engine after first successful visit. Live multiplayer still needs connectivity.
- The top platform requirement is **deployable on Cloudflare Free**. Measure bundle size and request consumption; don't claim cost will always be zero under any usage.

## Workflow
- Read relevant spec and rule file before editing code. For an unresolved rule: isolate behind an interface, flag `OWNER_DECISION_REQUIRED`, and ask rather than guessing. For independent engineering work, proceed with a testable minimal implementation.
- Preserve Gen 9 move priorities, targeting, accuracy/damage/status logic, except the user's explicit overrides.
- Run relevant type checks, tests and production build *when scripts exist*; report what ran and what did not. Never invent passing tests.
- Keep client-side simulation, game rules, transport, persistence and rendering separate.
- No secrets or personal data in URLs, logs, service worker caches or sprite filenames.
- Do not fetch simulator scripts or Pokémon API resources from CDNs at application runtime.
- Use pnpm. `pnpm verify` runs the type check, lint, every test project, the production build and the end-to-end tests; run it after each change.
- Test only logic that is ours and can vary. Never write a test that asserts fixed game data; real data is checked by the data-pack generator.
- Pokémon artwork and the reference sheets in `tmp/` are never committed, with one exception the owner made: `public/missingno.gif` (decisions 181 and 187). Credit every source in `CREDITS.md`. Stage files by name, never with `git add -A`: the owner drops files at the root.

## Rules organization
Detailed topic/path-scoped rules are in `.claude/rules/`. See `README.md` for layout and `docs/INTEGRATION_SPIKES.md` for proof-of-concept gates. Claude Code reads unscoped rules at startup and path-scoped rules when matching files are worked on. Run `/doctor prompt-audit` when supported to check instruction conflicts.
