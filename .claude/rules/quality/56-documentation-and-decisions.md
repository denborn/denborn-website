---
paths:
  - "docs/**/*.md"
  - "tasks/**/*.md"
  - "DECISIONS.md"
  - "CREDITS.md"
  - "README.md"
---
# Documentation and owner decisions

- Tag requirements as `CONFIRMED`, implementation `RECOMMENDED`, verification needed `UNVERIFIED` or `OWNER_DECISION_REQUIRED`. Every nontrivial technical recommendation cites a primary source and when it was checked.
- Do not silently edit V0/V1/V2 requirements to match an API or test limitation. Owner approves gameplay changes; implementation can choose a compatible adapter with evidence.
- Track major decisions in brief ADR form: context, evaluated alternatives, Cloudflare Free impact, tests, decision owner, reversibility and source URLs.
- Record dates/versions for package and Cloudflare pricing docs; upstream data changes must not rewrite the rules in old saves.
- Keep examples distinguishable from required behavior. Do not write speculative test results or promises of offline multiplayer.
- Keep Claude rules individually scoped and actionable; note any mismatch with actual repo paths and fix YAML frontmatter.
