# Technical architecture research and decisions

**Reviewed 2026-11-14.** This document distinguishes requirements from engineering suggestions; it does not modify any game mechanic.

## Decisions and evidence

| Area | Outcome | Status / reason |
|---|---|---|
| Hosting | Cloudflare Workers Static Assets + Worker + SQLite-backed Durable Object relay | **Recommended** and current Free-supported (quotas apply). No app DB. |
| SPA | Vite + React + TypeScript | **Recommended**; official Cloudflare framework guide supports SPA. |
| Navigation | React-controlled navigation / state | **Recommended**, no Swup in React DOM. Swup targets server-rendered websites. |
| UI animation | Motion for React + CSS | **Recommended**, respect reduced motion; build state logic independently. |
| PWA | Vite PWA / Workbox if integration supported | **Recommended**; app shell and engine/data offline post-cache. Live multiplayer not offline. |
| Battle engine | Browser-bundled `@pkmn/sim` | **Proposed, feasibility gated** for modified battle semantics. Browser build advertised upstream. |
| Data | Build-time `@pkmn/dex` / `@pkmn/data` + pinned PokéAPI static item data | **Proposed, version gated**. |
| WebSockets | Native WebSocket protocol on DO Hibernation API | **Recommended** to satisfy Cloudflare Free and avoid incompatible Socket.IO server assumptions. |
| Socket.IO | Not installed by default | **Rejected as default**, revisit only after adapter proof. Engine.IO wire protocol != plain WebSocket app frames. |
| Saves | Versioned JSON exported/downloaded files and localStorage copies | **Owner confirmed**. No server-canonical storage/database. |
| Tests | Vitest, Worker Vitest, Playwright | **Recommended** with real-browser and workerd integrations. |
| Accessibility | WCAG 2.2 AA and French RGAA 4.1.2 review, WAI-ARIA patterns | **Recommended** quality target; manual audit needed to claim conformance. |

## Package version trap

**Corrected 2026-11-14.** An earlier version of this note said `@pkmn/data@0.10.12` did not exist. It does: `@pkmn/sim`, `@pkmn/dex` and `@pkmn/data` 0.10.12 were all published on 2026-10-28, and all three are installed and locked in this repository (`pnpm-lock.yaml`). 0.11.0 was published on 2026-11-09; the owner's rule forbids any release less than 14 days old, and the three packages are always upgraded together (see `DECISIONS.md`).

## Cloudflare Free limitations and architecture impact

- Workers Free request quota shown as 100,000 requests/day and CPU budget 10ms per Worker invocation (as of date reviewed). DO Free has 100,000 metered requests/day (incoming WebSocket application messages use Cloudflare's documented 20:1 billing ratio) and 13,000 GB-s/day of active duration; exceeding a Free quota fails. Static asset requests are free and unlimited, but client->Worker upgrade/relay and WebSocket message traffic consumes relevant quota.
- Durable Objects on Workers Free must use a SQLite-backed storage backend. **Creating a backend in DO configuration is not the same as storing canonical game saves**; game data remains with GM.
- The relay should use `ctx.acceptWebSocket`, socket attachments for bounded ephemeral connection metadata, no always-on timer, and be reconstructable from GM state after hibernation/restart.
- The GM running app owns the room authority. Without a connected GM, clients do not make canonical game progress. Exported JSON files require user action; localStorage may be cleared by browser storage policy. These are risks that UX must explain.
- Free-tier *deployability* does not guarantee all session sizes stay under quota. Test realistic daily use and update budgets when limits change.

## Architecture data flow

```
Build time: verified upstream sources -> normalized/versioned Gen9 data pack
                     |                          + approved sprite manifest
                     v
Cloudflare static PWA (React + bundled sim + data + cached assets)
   GM browser (canonical engine + campaign JSON/localStorage)
             | typed intents / committed snapshots via WSS
   Cloudflare Worker -> room Durable Object (relay only)
             | to authenticated players
   Player browsers (local character copy + UI, no canonical sim authority)
```

## Blockers requiring proof, not theoretical guesses

1. Standard simulator move slots are normally four; UI wants six.
2. Default battle formats have fixed targeting constraints; team line may have 4+ slots.
3. **Switch** swaps round Speed with consent but keeps native priority; normal game substitution logic cannot be reused blindly.
4. **Run** is free reposition before full lock; cannot be mapped to normal escape command.
5. Agony changes KO handling; additional action opportunities complicate end-of-turn effects.
6. Serialize/restore or replay unfinished battles deterministically; upgrade with versioned engine/data pack.
7. Showdown sprites have copyright/permissions separate from package licensing.
8. Entire character QR capacity and self-contained offline-creation link need measured size and security review.

## Owner decisions still pending (from V0)

Most of the items first listed here (Agony, adjacency on long lines, Speed exchange, timeout Struggle, evolutions, IV/EV respec, rewards) were decided by the owner on 2026-11-14. `DECISIONS.md` is the current record: section 1 for decisions, section 4 for what is still to ask. Nothing is auto-resolved by code.

See `docs/SOURCES.md` for primary links and `docs/INTEGRATION_SPIKES.md` for executable acceptance gates.
