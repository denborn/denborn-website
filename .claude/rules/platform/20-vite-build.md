---
paths:
  - "vite.config.ts"
  - "vitest.config.ts"
  - "package.json"
  - "tsconfig*.json"
  - "scripts/**/*.{ts,mjs,js}"
---
# Vite / build reproducibility

- Use Vite + React + TypeScript and Cloudflare Vite plugin for SPA/Worker development if integration tests support it. Prefer Cloudflare official starter configuration over handwritten undocumented wiring.
- Pin exact dependency versions and install from the lockfile (`pnpm install --frozen-lockfile`). `@pkmn/sim`, `@pkmn/dex` and `@pkmn/data` are pinned to one exact version (0.10.12) and upgraded together; no release less than 14 days old is installed (`minimumReleaseAge` in `pnpm-workspace.yaml`).
- Use local installed packages at build time. **No runtime CDN** for `@pkmn/sim`, Dex or data packs, and no runtime PokéAPI item fetching in core app flows.
- Build a canonical, versioned, reproducible data pack; normalize and validate once; track upstream commit/tag, generation and patch identifiers in a manifest.
- Separate build-time imports from client and Worker bundles; ensure Worker does not contain `@pkmn/sim` or all sprites.
- Use lazy chunks for large browser-only simulator/optional content as appropriate, with cache-first offline coverage for core functionality.
- Check artifact size, per-file asset size and count against *current* Cloudflare Free deployment limits; CI should fail on accidental multi-megabyte regressions.
- Never embed secrets in `VITE_` environment variables (exposed in client builds). Analyze output for unwanted Node polyfills and dynamic external URLs.

Sources: https://vite.dev/guide/ ; https://developers.cloudflare.com/workers/vite-plugin/ ; https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
