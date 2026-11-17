---
paths:
  - "src/app/**/*.{ts,tsx}"
  - "src/routes/**/*.{ts,tsx}"
  - "src/ui/**/*.{ts,tsx}"
---
# SPA navigation and animated transitions

- **One React-owned SPA. Do not install Swup by default.** Swup is primarily for replacing server-rendered page containers; in-place React DOM replacement risks reconciliation, events and state. Use in-React navigation and Motion for React or native CSS transitions.
- Route/view state must be URL-addressable when appropriate (GM campaign, character creation, live join), but do not include secret tokens or character JSON in public URLs unless explicitly justified and bounded.
- Preserve history/back navigation and focus. On a view change, update the document title and move focus to the new heading or otherwise announce the change accessibly.
- Animate entering/leaving page content with stable keyed React boundaries (e.g. Motion `AnimatePresence`). Never delay an irreversible action until a visual animation completes. In Denborn that boundary is the frame of the two screens (`DualScreenFrame`): a page never draws its screens itself, and a change of address must not feel like another page (decision 218). A page must not reach for what is on its screens from an effect of its own: the frame draws them a moment after the page.
- State must survive transition animation interruptions; resolve network commands separately from visual effects.
- Maintain usable no-animation UI under `prefers-reduced-motion` and if image animation fails.

Sources: https://swup.js.org/getting-started/ ; https://motion.dev/docs/react-animate-presence ; https://react.dev/learn/manipulating-the-dom-with-refs
