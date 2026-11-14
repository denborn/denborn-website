# Code quality and delivery

- TypeScript strict mode; prohibit unexplained `any`, unsafe casts, magic string protocols, and duplicate derived state.
- Apply DRY to domain semantics, not by creating giant "utils" helpers. Prefer small, cohesive functions, explicit dependencies and pure transformations.
- Maintain predictable naming: `PascalCase` components/types, `camelCase` functions/variables, uppercase literal constants where appropriate.
- Favor narrow modules and explicit exports. Avoid barrel-cycle dependency graphs, cross-layer imports and package-private dependency APIs.
- Make invariants executable as tests and schema validation rather than comments alone.
- Preserve public API compatibility and version serializable changes. When touching a bug, add a regression test first where practical.
- Do not create placeholder production behavior for missing data; show an error state or an explicit `TBD` gate.
- Changes should have: rationale, affected version/scope, failure modes, tests run, and outstanding owner decisions. Don't claim tests, accessibility audits or free-tier production deploys were performed unless actually executed.
- Keep Claude rule files short and scoped; remove contradictory/obsolete instructions and run prompt audit where available.
