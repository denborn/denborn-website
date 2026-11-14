---
paths:
  - "src/network/**/*.{ts,tsx}"
  - "src/shared/protocol/**/*.ts"
  - "worker/**/*.ts"
---
# WebSocket protocol and Socket.IO compatibility

- Default protocol is **native RFC 6455 WebSocket over WSS**, not Socket.IO: the official DO Hibernation API is WebSocket-based, while Socket.IO server assumes Engine.IO transports, framing and conventional Node server APIs.
- Do not run the npm Socket.IO client against a plain WebSocket server and assume interoperability. If Socket.IO is requested later, require a concrete compatible Worker/DO adapter and hibernation/free-tier benchmark first.
- Version every message envelope: `protocolVersion`, `sessionId`, `senderId`, `messageId`, `seq` (where applicable), `type`, `payload`. Use runtime schemas and max-size limits for every incoming frame.
- The GM issues monotonic canonical revisions; clients send intent messages with expected revision and idempotency ID. Relay routes, authorizes roles, deduplicates where possible and never recomputes combat.
- Initial handshake authenticates GM/players for the room, authorizes character ownership and negotiates pack/schema versions. Room codes are routing locators, **not sufficient proof of GM privilege**.
- On reconnect: reauthenticate, request full GM snapshot + last revision, discard expired optimistic intents, reconcile and re-render; no event from a stale room epoch may mutate a resumed battle.
- Define bounded retry/backoff with jitter, heartbeat/reconnect UX and explicit offline state. Do not auto-repeat a move intent that might have been accepted without checking idempotency.
- Order/priority is decided by the GM's battle engine, **never by network arrival order**. Only the GM client may emit committed state events.
- Keep frames small and meaningful; batch only if metrics warrant it. Don't flood per-frame animation states or timer ticks through the relay.

Sources: https://socket.io/docs/v4/server-initialization ; https://developers.cloudflare.com/durable-objects/best-practices/websockets/ ; https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
