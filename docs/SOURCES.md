# Primary reference links — checked 2026-11-14

Research informs **implementation guidance only**. Requirements remain in `tasks/` and the owner's decisions in `DECISIONS.md`. Version/pricing facts may change; recheck before implementation or deployment.

## Claude Code rules
- Claude Code memory/rules, `paths` frontmatter: https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/

## Cloudflare Free, static assets, WebSockets and tests
- Workers Free limits: https://developers.cloudflare.com/workers/platform/limits/
- Durable Objects pricing and Free SQLite requirement: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Durable Objects Hibernation WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Example WebSocket Hibernation DO: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
- Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Static Assets billing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Cloudflare Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/
- React + Vite Worker guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Worker Vitest integration: https://developers.cloudflare.com/workers/testing/vitest-integration/

## Frontend and motion
- React escape hatches: https://react.dev/learn/escape-hatches
- React refs/DOM ownership: https://react.dev/learn/manipulating-the-dom-with-refs
- Swup Getting Started (server-rendered): https://swup.js.org/getting-started/
- Motion React: https://motion.dev/docs/react
- Motion accessibility: https://motion.dev/docs/react-accessibility
- MotionConfig reduced-motion: https://motion.dev/docs/react-motion-config
- Vite: https://vite.dev/guide/
- Vite PWA: https://vite-pwa-org.netlify.app/guide/
- web.dev PWA caching: https://web.dev/learn/pwa/caching
- MDN localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

## Pokémon / assets
- `@pkmn/sim` npm browser guidance and versions: https://www.npmjs.com/package/@pkmn/sim
- `@pkmn/dex` npm/version list: https://www.npmjs.com/package/@pkmn/dex
- `@pkmn/data` npm/version list (0.10.12 published 2026-10-28 and installed here on 2026-11-14): https://www.npmjs.com/package/@pkmn/data?activeTab=versions
- Pokémon Showdown simulator docs: https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
- PokéAPI static data: https://github.com/PokeAPI/api-data
- Showdown sprite repository & permissions: https://github.com/smogon/sprites
- Showdown sprite index: https://play.pokemonshowdown.com/sprites/

## Network, testing, security and accessibility
- Socket.IO server initialization: https://socket.io/docs/v4/server-initialization
- OWASP WebSocket security: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- Vitest: https://vitest.dev/guide/
- Playwright best practices: https://playwright.dev/docs/best-practices
- RGAA 4.1.2 official: https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
- WCAG 2.2 official: https://www.w3.org/TR/WCAG22/
- WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/

## Important research qualifications
- No proof of Cloudflare Free deployment, battle engine compatibility or actual version installation was executed during document creation. Only public documentation was reviewed.
- A plain Cloudflare WebSocket server is not Socket.IO/Engine.IO compatible by default.
- Rules target code quality and accessibility; they are not a formal RGAA conformance audit.
