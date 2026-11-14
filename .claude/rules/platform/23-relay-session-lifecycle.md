---
paths:
  - "worker/**/*.ts"
  - "src/network/**/*.{ts,tsx}"
---
# Room relay lifecycle and authoritative GM

- Map a room ID deterministically to a Durable Object; one room object represents one live session. Relay carries messages, connection metadata and ephemeral membership only.
- DO hibernation wipes in-memory state. Store minimal connection identity/role metadata in WebSocket serialized attachments where allowed (up to documented size), not full battle snapshots.
- Session resume protocol must distinguish **new GM epoch** versus stale messages from a prior hosting session. Route resumed state only after the GM asserts a fresh authoritative snapshot.
- Players receive state from the authenticated GM. If GM disconnects, show session paused; do not elect players as GM or transfer authority automatically.
- Player disconnect + active timer: GM pauses as specified. On reconnect, GM pushes current authoritative state before allowing new commands.
- Handle duplicate/tab connections and stale room links safely. Enforce size, connection and rate bounds at the relay; over-limit clients receive structured errors.
- All messages need replay/idempotency tests; test DO restart, hibernation, Worker deploy, tab backgrounding and network interruption.
- When free quota exhausts, fail closed to a recoverable room error; local saved campaign must remain available.

Source: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
