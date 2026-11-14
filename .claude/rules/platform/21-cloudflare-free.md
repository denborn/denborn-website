---
paths:
  - "worker/**/*.{ts,js}"
  - "wrangler.jsonc"
  - "wrangler.toml"
  - "vite.config.ts"
  - ".github/workflows/*"
---
# Cloudflare Free as a hard deployability gate

- Every solution **must deploy on Cloudflare Workers Free**, not require paid Durable Objects, R2, KV, D1, Workers Paid, custom hosting, Node persistent processes or proprietary paid service.
- Static Vite assets can deploy via Workers Static Assets; Worker runs only for live connection/control routes. Configure SPA fallback so refreshable client routes work.
- On Free, Durable Objects require **SQLite-backed** DO classes. This storage backend requirement does not license making the DO a canonical campaign database. Keep game saves in GM files/localStorage.
- Use DO Hibernation WebSocket API (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`, `webSocketError`) for efficient relay and session routing. DO memory is volatile after hibernation.
- Do not hold DO awake via perpetual `setInterval`/timer, unnecessary outgoing sockets or frequent keepalive app messages; design so it can hibernate.
- Monitor current Free quotas and failure behavior: Worker requests 100k/day, CPU budget, DO request/message and duration quota, deployment size limits. Free quotas can hard-fail rather than charge overages.
- The GM browser owns timer/round deadlines; relay can deliver values but cannot be the real-time countdown's sole authority. GM disconnect means battle must pause/recover, not continue autonomously.
- Exercise `wrangler dev` / official Cloudflare Vite plugin and an actual Free-tier deployment smoke test. Record relevant exact limits/last-check date in release notes, not unversioned promises.

Sources: https://developers.cloudflare.com/workers/static-assets/ ; https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/durable-objects/platform/pricing/ ; https://developers.cloudflare.com/durable-objects/best-practices/websockets/
