# Denborn

A fan-made companion app for a Pokémon tabletop RPG. Friends roleplay at the table; when the GM launches an encounter, the app runs the fight with real Generation 9 mechanics. Players use their phones, the GM a laptop or tablet.

Unofficial and non-commercial. Pokémon belongs to Nintendo, Creatures Inc. and GAME FREAK inc. See [CREDITS.md](CREDITS.md).

**Status:** V0 in progress.

- Milestone 0 (foundations) is done and live on Cloudflare's Free plan: the toolchain, the offline shell and a relay skeleton.
- Milestone 1 (battle engine) is done: `src/battle/` runs Denborn's fights on the real simulator, with every rule proven by tests (see DECISIONS.md, section 5).
- Milestone 2 (game data) is done: 151 species, their moves, Abilities and items in English and French, with the sprites, built from pinned sources.
- Milestone 3 (art direction) is done: the design system Denborn DA, after Pokémon Black / White, with its components shown in Storybook.
- Milestone 4 (offline flows) is done. In the app: the home; for a game master, campaigns with their rules (species with filters, starting level and Pokédollars, natures, moves, common moves, item packs), each saved change a new version, the creation link with its QR code, and a campaign's file to save, import and remove; for a player, creating a character step by step from that link, the list of characters kept on the device, a character's sheet with its file, its QR code and its printed form, importing a character from its file, its link or a scan of its QR code, and removing one; the options with the system check. Everything in it works with no network once the app is cached. Not checked on real phones yet.
- Milestone 5 (live sessions) is done. In the app: a game master hosts a session of a campaign and shows its join code, QR code and link; players join with one of their characters of that campaign, or make one there and then, and wait to be let in; the party is shown to everyone; a dropped connection mends itself, and the same code works when the game master comes back. Checked between two browsers on the live site; not on real phones yet.
- No battle can be played in the app yet.

## What is authoritative

| File | Role |
|---|---|
| [DECISIONS.md](DECISIONS.md) | Every rule and product decision the owner has made, with dates; unconfirmed interpretations; engineering choices; rulings still to ask. |
| [tasks/V0_SPEC.md](tasks/V0_SPEC.md), `V1_SPEC.md`, `V2_SPEC.md` | The specifications. Decisions in `DECISIONS.md` complete and override them. |
| [DESIGN.md](DESIGN.md) | The design system: how every screen must look, move and stay accessible. |
| [.claude/CLAUDE.md](.claude/CLAUDE.md), [.claude/rules/](.claude/rules/) | Engineering guardrails for work in this repository. |
| [docs/](docs/) | Research notes, sources and the integration proofs required before a dependency is trusted. |

The owner alone decides game rules. A TBD in a spec is a question to ask, never a default to pick.

## How it is built

- One single-page app: Vite, React, TypeScript; installable and usable offline (service worker precache).
- Battles run only on the GM's device, on Pokémon Showdown's simulator (`@pkmn/sim`, with `@pkmn/dex` and `@pkmn/data`, all pinned at 0.10.12 and upgraded together).
- One Cloudflare Worker serves the app as static assets and relays WebSocket messages between the GM and the players through one Durable Object per room. The relay stores no game data.
- No database. Saves are versioned JSON files plus copies in the browser's storage.
- Everything must run on Cloudflare's Free plan.
- The interface follows one design system, Denborn DA: its rules are in [DESIGN.md](DESIGN.md), its components in `src/ui/`, and Storybook shows each of them alone. Storybook is a development tool; it is not deployed.

## Commands

Requires Node 22.12 or later and pnpm 12.

```sh
pnpm install          # exact, locked versions; nothing newer than 14 days is ever installed
pnpm data             # download the pinned sprites and tables, build the game data pack (needed once before `pnpm dev`)
pnpm dev              # app + Worker + Durable Object, locally
pnpm verify           # type check, lint, all tests, production build, end-to-end tests
pnpm test             # unit, engine and Worker tests
pnpm test:e2e         # browser tests against the production build (run `pnpm build` first)
pnpm storybook        # the design system's board, on http://localhost:6006 (needs `pnpm data` once)
node scripts/engine-probes/hit-fainted.mjs   # what the unmodified engine does (also action-layer, snapshot-restore)
```

Deploys are not run by hand: Cloudflare builds and deploys every push to `main` (Workers Builds, project `denborn-website`). To run the browser tests against the live site: `E2E_BASE_URL=https://<the deployed URL> pnpm test:e2e`.

The first end-to-end run needs a browser: `pnpm exec playwright install chromium`.

## Artwork and game texts are not in this repository

Sprites, icons, the games' texts and the reference sheets used for the art direction belong to their rights holders and are never committed. A build downloads the sprites and PokéAPI's tables from the versions pinned in `data-sources/*.lock.json`, checks every file against its recorded checksum, and generates the data pack from them. `CREDITS.md` lists every source.

When a pinned source or the engine changes: `pnpm data:pin` re-pins the downloads, `pnpm data:accept` shows what changed in the game data and records the new pack.
