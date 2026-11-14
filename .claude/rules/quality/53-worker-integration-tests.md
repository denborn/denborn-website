---
paths:
  - "worker/**/*.test.ts"
  - "worker/**/*.spec.ts"
  - "tests/worker/**/*.ts"
  - "wrangler.jsonc"
---
# Cloudflare Worker and Durable Object integration tests

- Use Cloudflare's supported Vitest Worker integration / workerd test environment when compatible with the installed Vite/Workers versions; no Node mock should substitute for Cloudflare runtime proof.
- Test WebSocket upgrade, room partitioning, role checks, message size restrictions, unauthorized sender, replay, reconnection and simulator-free relay behavior.
- Deliberately force/recreate DO to test hibernation metadata/GM snapshot recovery; local dev hibernation behavior may differ, so an actual deployed staging smoke test is required.
- Test Free-tier viable architecture: no accidental KV/R2/D1 dependency, only SQLite-backed DO namespace as required; avoid relying on Node-native Socket.IO server.
- Verify SPA static asset requests don't unnecessarily invoke Worker, and UI fetches operate during intermittent relay failures.
- Ensure Worker code does not import Pokémon simulator, full Dex data or heavy animation assets. Measure package weight and CPU/network quota on realistic sessions.
- Use least-privilege tokens for deployment CI, never check secrets into repo or Vite client builds.

Source: https://developers.cloudflare.com/workers/testing/vitest-integration/ ; https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
