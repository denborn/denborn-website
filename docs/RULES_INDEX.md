# Claude rules index

27 rules in `.claude/rules/`; 3 global (always loaded), 24 path-scoped.

Run Claude Code in the project root. Path-scoped rules only load on matching file access; adapt globs if source layout changes.

| Rule | Scope |
|---|---|
| `.claude/rules/data/40-pokemon-data-build.md` | `scripts/data/**/*.{ts,mjs,js}, src/data/**/*.{ts,json}, src/generated/**/*.{ts,json}` |
| `.claude/rules/data/41-sprites-assets-licensing.md` | `src/assets/**/*, public/sprites/**/*, scripts/assets/**/*, src/components/PokemonSprite*.tsx` |
| `.claude/rules/foundation/01-product-contract.md` | `Always` |
| `.claude/rules/foundation/02-engineering-boundaries.md` | `Always` |
| `.claude/rules/foundation/03-code-review-and-standards.md` | `Always` |
| `.claude/rules/frontend/10-typescript-react.md` | `src/**/*.{ts,tsx}, worker/**/*.ts, scripts/**/*.ts` |
| `.claude/rules/frontend/11-navigation-and-transitions.md` | `src/app/**/*.{ts,tsx}, src/routes/**/*.{ts,tsx}, src/ui/**/*.{ts,tsx}` |
| `.claude/rules/frontend/12-motion-game-feel.md` | `src/ui/**/*.{ts,tsx,css}, src/components/**/*.{ts,tsx,css}, src/features/battle/**/*.{ts,tsx,css}` |
| `.claude/rules/frontend/13-rgaa-wcag-aria.md` | `src/**/*.{tsx,jsx,css}, public/**/*.{html,css}` |
| `.claude/rules/frontend/14-ui-design-and-responsive.md` | `src/**/*.{tsx,css}, public/**/*.css` |
| `.claude/rules/gameplay/30-battle-engine.md` | `src/battle/**/*.{ts,tsx}, src/engine/**/*.ts, src/sim/**/*.ts` |
| `.claude/rules/gameplay/31-turns-locking-and-targeting.md` | `src/features/battle/**/*.{ts,tsx}, src/battle/**/*.ts` |
| `.claude/rules/gameplay/32-agony-progression-roleplay.md` | `src/features/characters/**/*.{ts,tsx}, src/features/progression/**/*.{ts,tsx}, src/battle/**/*.ts` |
| `.claude/rules/gameplay/33-gm-player-interfaces.md` | `src/features/gm/**/*.{ts,tsx}, src/features/characters/**/*.{ts,tsx}, src/features/campaigns/**/*.{ts,tsx}` |
| `.claude/rules/platform/20-vite-build.md` | `vite.config.ts, vitest.config.ts, package.json, tsconfig*.json, scripts/**/*.{ts,mjs,js}` |
| `.claude/rules/platform/21-cloudflare-free.md` | `worker/**/*.{ts,js}, wrangler.jsonc, wrangler.toml, vite.config.ts, .github/workflows/*` |
| `.claude/rules/platform/22-websocket-protocol.md` | `src/network/**/*.{ts,tsx}, src/shared/protocol/**/*.ts, worker/**/*.ts` |
| `.claude/rules/platform/23-relay-session-lifecycle.md` | `worker/**/*.ts, src/network/**/*.{ts,tsx}` |
| `.claude/rules/platform/24-pwa-offline.md` | `src/pwa/**/*.{ts,tsx}, src/service-worker/**/*.{ts,js}, public/manifest.webmanifest, vite.config.ts` |
| `.claude/rules/platform/25-json-save-persistence.md` | `src/storage/**/*.{ts,tsx}, src/shared/schema/**/*.ts, src/features/campaigns/**/*.{ts,tsx}` |
| `.claude/rules/quality/50-security.md` | `src/network/**/*.{ts,tsx}, src/storage/**/*.{ts,tsx}, src/shared/schema/**/*.ts, worker/**/*.{ts,js}, src/features/characters/**/*.{ts,tsx}` |
| `.claude/rules/quality/51-vitest-unit-integration.md` | `**/*.test.{ts,tsx}, **/*.spec.{ts,tsx}, vitest.config.ts, src/test/**/*.{ts,tsx}` |
| `.claude/rules/quality/52-playwright-e2e.md` | `tests/e2e/**/*.{ts,tsx}, playwright.config.ts` |
| `.claude/rules/quality/53-worker-integration-tests.md` | `worker/**/*.test.ts, worker/**/*.spec.ts, tests/worker/**/*.ts, wrangler.jsonc` |
| `.claude/rules/quality/54-performance-offline-budgets.md` | `src/**/*.{ts,tsx,css}, vite.config.ts, scripts/assets/**/*` |
| `.claude/rules/quality/55-release-quality-gates.md` | `.github/workflows/**/*, package.json, wrangler.jsonc, wrangler.toml, docs/release/**/*` |
| `.claude/rules/quality/56-documentation-and-decisions.md` | `docs/**/*.md, tasks/**/*.md, README.md, DECISIONS.md, CREDITS.md` |

Rules apply only as instructions, not an automated linter or an assurance of RGAA conformance. Use real tests, code review and manual audits.
