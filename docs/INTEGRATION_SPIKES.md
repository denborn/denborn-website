# Required integration spikes before V0 implementation is claimed viable

These are **checklists**, not completed tests. No test has been executed as part of creating this rules pack.

## Spike A — Showdown-derived simulator in browser

- [x] Install a real compatible locked set of `@pkmn/sim`, `@pkmn/dex`, `@pkmn/data`. Done 2026-11-14: all three install at 0.10.12 (`pnpm-lock.yaml`); `src/battle/engine-install.test.ts` fails if they ever differ.
- [ ] Bundle in Vite production build, load after offline airplane-mode reload with no CDN or dynamic Node imports.
- [ ] Start canonical Gen9 match, log moves, seeded outcome and rendered HP; compare to upstream fixture.
- [ ] Inspect actual API behavior for **six active moves** without truncation; do not fake extra buttons.
- [ ] Inspect 4v4 or greater line targeting for every target category; report unsupported moves explicitly.
- [ ] Implement/test free Run/reposition, mutual Switch Speed swap while honoring move priority, and 60s lock timer without altering HP stats.
- [ ] Validate status/KO hooks for Agony, death, healing and manual enemy extra actions (owner-pending semantics flagged).
- [ ] Rehydrate unfinished battle deterministically with same engine/data versions. Check RNG, PP, targeting, order, statuses, pending locks, item use.

**Pass condition:** a repeatable browser test plus a documented adapter surface; unknown behavior is a blocker, not proof.

## Spike B — Cloudflare Free realtime relay

- [ ] Create a Free-plan Worker + **SQLite-backed** Durable Object namespace.
- [ ] Static PWA path bypasses Worker where possible; SPA refresh works; WSS upgrade works.
- [ ] DO Hibernation WebSocket API relays 1 GM + 4 players with schema-validated envelopes.
- [ ] Authorize GM vs player; attempt forged GM command, replayed/duplicate intents and oversized frames.
- [ ] Sleep/hibernate/recreate DO and reconnect; verify attachments, room and GM snapshot recovery.
- [ ] Close GM tab, verify session paused and no player becomes authority; resume through GM file snapshot.
- [ ] Test iPhone Safari background/foreground reconnect and Android Chrome on hosted Free deployment.
- [ ] Review quotas, request/message rates, CPU budget and daily worst-case assumptions.

**Pass condition:** reproducible browser and real deployed Free-plan smoke test with logs.

## Spike C — Offline saves, QR and PWA

- [ ] Seed offline character from a self-contained character-rules link while GM is absent.
- [ ] Persist localStorage, export JSON, fully import to another browser, and return a valid character-sheet QR within measured capacity.
- [ ] Ensure missing/too-large QR produces honest file fallback, not truncation.
- [ ] Start a GM battle, lock at least one action, export and close app; restore offline from file, reconnect and resynchronize all players.
- [ ] Update PWA while in battle: show deferred update, don't reload/lose live state.
- [ ] Clear localStorage and cache, confirm honest recovery UX and no false durability guarantees.

**Pass condition:** Playwright e2e traces on desktop and mobile browser flows plus human-tested iOS/Android PWA install.

## Spike D — art and rights

- [ ] Audit exactly which Gen 1 Gen5 animated front/back sprites exist; test deterministic `ani` fallback, gender/shiny and forms.
- [ ] Audit Showdown itemicon / category sprite availability; inspect licensing/permissions of bundled artwork before publishing.
- [ ] Confirm performance and visual readability on mobile and reduced-motion.

**Pass condition:** complete asset manifest with known missing/rights statuses and screenshots from supported devices.
