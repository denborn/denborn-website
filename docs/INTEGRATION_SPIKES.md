# Required integration spikes before V0 implementation is claimed viable

These are **checklists**. An item is ticked only with the date and the test or check that proves it; an unticked item has not been proven.

## Spike A — Showdown-derived simulator in browser

- [x] Install a real compatible locked set of `@pkmn/sim`, `@pkmn/dex`, `@pkmn/data`. Done 2026-11-14: all three install at 0.10.12 (`pnpm-lock.yaml`); `src/battle/engine-install.test.ts` fails if they ever differ.
- [x] Bundle in Vite production build, load after offline airplane-mode reload with no CDN or dynamic Node imports. Done 2026-11-14 in headless Chromium (`tests/e2e/smoke.spec.ts`); a real phone in airplane mode is still to be tried by the owner.
- [x] Start canonical Gen9 match, log moves, seeded outcome and rendered HP; compare to upstream fixture. Done as differential tests against the unmodified engine (`src/battle/differential.test.ts`). Rendered HP waits for the battle screens (milestone 6).
- [x] Inspect actual API behavior for **six active moves** without truncation; do not fake extra buttons. Done: the engine takes six moves as they are; every engine test uses them.
- [x] Inspect 4v4 or greater line targeting for every target category; report unsupported moves explicitly. Done for lines of 1 to 6 (`src/battle/lines.test.ts`). Moves replaced or disabled are listed in `src/battle/engine/mod.ts`: Ally Switch, Imposter, Revival Blessing.
- [x] Implement/test free Run/reposition, mutual Switch Speed swap while honoring move priority. Done (`positions.test.ts`, `turn-order.test.ts`). The timer belongs to the GM's session (milestone 6); the engine side of a timeout, forced Struggle, is done.
- [x] Validate status/KO hooks for Agony, death, healing and manual enemy extra actions. Done (`agony.test.ts`, `bag.test.ts`, `actions.test.ts`), on the owner's rulings in DECISIONS.md.
- [x] Rehydrate unfinished battle deterministically with same engine/data versions. Done: restoring after every round gives the same battle as never interrupting it (`snapshot.test.ts`).

**Pass condition:** a repeatable browser test plus a documented adapter surface; unknown behavior is a blocker, not proof.

## Spike B — Cloudflare Free realtime relay

- [x] Create a Free-plan Worker + **SQLite-backed** Durable Object namespace. Done 2026-11-14: live at denborn-website.kori-san.workers.dev.
- [x] Static PWA path bypasses Worker where possible; SPA refresh works; WSS upgrade works. Checked on the live deployment 2026-11-14.
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
