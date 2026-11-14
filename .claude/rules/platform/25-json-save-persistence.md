---
paths:
  - "src/storage/**/*.{ts,tsx}"
  - "src/shared/schema/**/*.ts"
  - "src/features/campaigns/**/*.{ts,tsx}"
---
# JSON saves / localStorage / compatibility

- **No database**, even for players. Canonical durability is explicit exported/downloaded **versioned JSON file(s)**, plus redundant browser `localStorage` copies; GM holds campaign and joined characters, players hold their own.
- Every saved object has `schemaVersion`, `rulesVersion`, `dataPackVersion`, persistent IDs, monotonic `revision`, and where relevant `simulationVersion`/engine version. Validate before accepting, migrate only via tested explicit versioned migrations.
- Save/reload an unfinished battle with all necessary RNG/engine state, PP, statuses, positions, locked actions, Speed swaps, Agony, timer, GM extras and awaiting player inputs. **Do not assert simulator serialization is supported until spike confirms it.**
- Writes to localStorage are synchronous and quota-limited. Catch `QuotaExceededError`, warn users and offer immediate file export; debounce safe snapshots without losing accepted commands.
- No silent overwrites on import or sync. Compare ID/revision/lineage and show conflict choices; never infer that player local state is more authoritative than GM battle state.
- Make JSON export user-initiated and atomic enough for browsers: create Blob and download, with checksum/integrity field where feasible. Browser cannot silently update an existing downloaded file.
- Full character QR must contain versioned payload if capacity allows; never truncate it. If too large, fallback to file import and flag the QR capacity product decision.
- Avoid persisting secret GM credentials inside shareable character exports, QR code or logs.
- Build adversarial tests for corrupted/missing/old/new schema, overlarge payload, duplicated IDs, Unicode names, save while locked, resume with new code build.

Sources: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage ; https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
