---
paths:
  - "src/**/*.{ts,tsx}"
  - "worker/**/*.ts"
  - "scripts/**/*.ts"
---
# TypeScript / React implementation

- Enable `strict`, `noUncheckedIndexedAccess` where tolerable, and TS-aware ESLint. Treat `unknown` as untrusted until narrowed with a schema.
- Prefer discriminated unions for command/event variants and exhaustive `switch` checking; avoid stringly typed socket events.
- React function components + hooks; render from state, not manual DOM mutations; use `useEffect` for external subscriptions with cleanup, not derived values.
- Keep simulation and persistence operations outside render. Async effects must handle race cancellation or request supersession.
- No nondeterministic `Math.random()` in combat reducers. Simulation RNG must be seedable/logged through the engine adapter.
- Use memoization after profiling; unnecessary memoization increases complexity. Prefer CSS and compositor-friendly animations.
- React keys must be stable character/slot/event IDs, not array positions when rearrangeable.
- Avoid exposing browser globals during build-time data tools or Worker modules; isolate environment-specific adapters and feature detection.
- Do not catch and ignore errors. Show the GM recoverable error, copyable diagnostics without secrets, and a safe retry/export path.

Reference: https://react.dev/learn/escape-hatches ; https://www.typescriptlang.org/tsconfig/#strict
