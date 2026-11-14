---
paths:
  - ".github/workflows/**/*"
  - "package.json"
  - "wrangler.jsonc"
  - "wrangler.toml"
  - "docs/release/**/*"
---
# CI / release / provenance gates

- CI gates when scripts exist: exact lockfile install, TypeScript check, lint, formatting, Vitest, worker tests, Playwright smoke tests, data-generation validation, build and asset manifest verification.
- Security: audit dependencies and workflow permissions, verify no private token in build assets/QR/URLs, pin third-party actions to safe references when practical. Report high-severity issues rather than auto-suppress.
- Pre-deploy checklist: latest Cloudflare Free limits and account plan; DO namespace SQLite backend; no paid-bound service; static asset routing; one real multiplayer reconnection test and mid-battle save/reload.
- Version manifest must track app, schema, game rules, simulation, Pokémon datapack and asset revision. Old save compatibility is tested; don't ship breaking migration without backup/export route.
- PWA update strategy must not force refresh mid-combat. Keep previous bundle/saved campaign recoverable during deployment transition.
- Report legal/attribution review status separately from code license. A passing test suite does not imply artwork publishing rights.
- Never claim production readiness without real mobile UX/accessibility smoke tests; never claim zero-cost under unlimited load.
