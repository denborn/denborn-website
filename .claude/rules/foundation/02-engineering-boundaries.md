# Engineering boundaries

- Keep these logical boundaries independent: `game-rules` (pure), `sim-adapter` (Showdown wrapper), `domain` (campaign/characters), `transport` (WebSocket protocol), `persistence` (files/localStorage), `ui` (React/components), `assets` (manifest), and `edge-relay` (Worker/DO).
- The GM browser is the only live battle **authority**. All players send *intents*. The relay forwards authenticated messages; it cannot resolve combat or permanently store the campaign.
- Use immutable domain snapshots and explicit commands/events. Do not mutate game state in React components or WebSocket callbacks without a centralized validated reducer.
- Treat all inbound data as untrusted: QR codes, JSON imports, join links, WebSocket frames, generated datapacks and save migrations.
- Separate deterministic game events (for resumption and reproducibility) from presentation-only animations and sounds.
- Avoid premature complexity: no backend database, no SSR requirement, no separate native app, no cloud accounts, no unapproved analytics or automated encounters.
- Architecture diagrams and ADRs must indicate confirmed requirement versus recommended choice versus unverified feasibility. Do not alter approved specs during refactoring without owner sign-off.
