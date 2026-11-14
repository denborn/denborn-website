---
paths:
  - "src/pwa/**/*.{ts,tsx}"
  - "src/service-worker/**/*.{ts,js}"
  - "public/manifest.webmanifest"
  - "vite.config.ts"
---
# Installable PWA and offline support

- App shell, type icons, character creation, local import/export, V0 data pack and needed engine code must work offline **after first successful asset fetch and cache**.
- Live shared sessions require networking; never show offline intents as "submitted" to the GM. Explain reconnect and local-only changes.
- Use a manifest with app name, icons, display mode and theme. Check HTTPS secure origin, service worker installation/update, iOS add-to-home-screen and Android installation.
- Service worker must cache **versioned static assets**, never WebSocket messages, campaign secrets, auth URLs or live GM snapshots. Use hashed chunk names and deterministic offline fallbacks.
- Carefully decide precache vs lazy-cached large sprite/engine chunks: offline *guarantee* requires all essential code/data to have actually entered cache. Expose download/preparation progress and test airplane mode rather than assuming it.
- Stage application updates; do not auto-reload during an active battle. Display "update available" and apply after save/GM approval when safe.
- Check first install, storage eviction, offline reload, stale service worker, cache migration, splash/startup and asset missing scenarios on real iPhone Safari/PWA and Android Chrome.
- Treat `localStorage` as a convenience copy, not durable backup. Users must be able to export a versioned JSON file.

Sources: https://vite-pwa-org.netlify.app/guide/ ; https://web.dev/learn/pwa/caching ; https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
