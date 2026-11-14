---
paths:
  - "tests/e2e/**/*.{ts,tsx}"
  - "playwright.config.ts"
---
# Playwright browser testing

- Prefer `getByRole`, `getByLabel`, and accessible user-facing locators; avoid brittle CSS selectors, `waitForTimeout`, arbitrary screenshot-only assertions and tests coupled to component structure.
- Use deterministic fixtures, separate test campaigns and stable local relay/GM test sessions. Exercise multiple isolated browser contexts (one GM + 2–4 players) and realistic mobile viewport/touch settings.
- Required journeys: offline character creation; character JSON/QR import; GM campaign prep; live join; moves/bag lock/unlock; free reposition; consented Switch; 60-second timer with pause and Struggle; disconnect/reconnect; rejoin with a resumed GM snapshot; mid-battle export/import; iOS-style install/offline fetch simulation.
- Verify actual WebSocket events and resulting screen state; do not merely assert button clicks. Run both online and offline after precache; test canceled/stale server responses.
- Include automated accessibility checks with axe where feasible and manual audits for keyboard and native screen readers (automated tools aren't a conformance certificate).
- Record traces/screenshots/videos on failing CI tests; isolate data between workers; do not paper over race conditions with retries or sleeps.
- Test missing sprite fallback and reduced-motion behavior in automated browser runs.

Source: https://playwright.dev/docs/best-practices
