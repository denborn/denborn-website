---
paths:
  - "src/**/*.{ts,tsx,css}"
  - "vite.config.ts"
  - "scripts/assets/**/*"
---
# Performance and offline budgets

- Measure cold start, install size, cached bundle size, first meaningful battle UI, scroll performance and memory consumption on low-end Android and iPhone, not only development desktop.
- Keep high-value interactions responsive when GIFs, page transitions or battle effects animate. Prefer compositor `opacity`/`transform`, sprite atlases/appropriately sized files if licensed and helpful, and lazy asset loading.
- PWA offline core requires a verified precache of minimal app shell, rules/data/engine needed for character creation. Don't indiscriminately precache all V1 sprite variations and risk storage eviction.
- Set measurable budgets once baseline metrics exist; do not fabricate hard numeric promises that have not been profiled. Report before/after sizes when shipping changes.
- Avoid frequent localStorage writes during rapid animation frames; persist accepted state transitions and save at intentional safe points, preserving explicit export.
- Treat rendering as an output of GM snapshots. WebSocket frames carry state/commands rather than 60 animation updates per second.
- Audit chunk duplicates, unused imports, hidden third-party network calls, source-map exposure, and worker asset requests under Cloudflare Free.

Sources: https://vite.dev/guide/performance ; https://web.dev/learn/pwa/caching ; https://motion.dev/docs/react-motion-component
