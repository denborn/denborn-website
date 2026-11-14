---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "vitest.config.ts"
  - "src/test/**/*.{ts,tsx}"
---
# Vitest unit + integration principles

- Test **public behavior and invariants**. Prefer fast deterministic pure-function tests for stat budgets, valid moves, targeting, phases, serialization, idempotency and version migrations.
- Sim adapter tests should compare to upstream Gen 9 examples, not merely assert implementation agrees with itself. Explicit regression fixtures for Speed/priority swap, 6 moves, adjacency/line targets, status+Agony and manual extra actions.
- Ensure unapproved rules have failing/pending owner-decision tests rather than invented assertions.
- Mock only process boundaries (storage adapters, clock, network), not entire application internals. Seed engine randomness; use fake timers for 60-second round cases.
- Unit tests verify no mutation of prior state; replay a command twice and confirm idempotency/consistent revision outcomes.
- For PWA state, test storage quota failures, schema migrations and conflicting GM/player saves; don't test browser storage semantics solely with mocked localStorage.
- Keep tests independent; avoid inter-test global state and long snapshots of serialized battle internals unless the snapshot has explicit interpretation.
- Report coverage meaningfully for critical pure modules, not line coverage alone. Every production bug gets a narrow regression test.

Source: https://vitest.dev/guide/
