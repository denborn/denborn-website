---
paths:
  - "src/ui/**/*.{ts,tsx,css}"
  - "src/components/**/*.{ts,tsx,css}"
  - "src/features/battle/**/*.{ts,tsx,css}"
---
# Motion and polished video-game feel

- **The owner's rule (decisions 218 and 219, 2026-11-16): the app always moves, as a video game does.** Anything that appears, leaves or changes does so with motion taken from the games; nothing is swapped at once, and nothing only fades. Ask of every change: has a Pokémon game ever done it this way? A plain opacity fade as a change of screen was refused in so many words.
- The two screens are the app's frame (`DualScreenFrame`, `src/ui/DualScreen.tsx`) and never go away. A page gives its screens to the frame; a screen or a view that is new gets a `key`, so that the frame moves the old one out and the new one in (`src/ui/screen-motion.ts`): pieces fly where the backdrop stays, black stripes sweep where it changes, and a screen with the same key carries on untouched. New layouts add their pieces to that file's list.
- The target is cohesive Black/White-era game feedback: snappy selection, crisp sprite choreography, non-blocking HP/PP changes, entry/exit, hit/status cues and legible turn sequencing.
- Each meaningful interaction has immediate feedback: pressed/disabled/pending/confirmed/rejected states. Use visual motion to **explain state changes**, never to hide or invent a combat outcome.
- Prefer `transform` and `opacity` to layout-changing animation properties; cap simultaneous large sprites/effects on mobile and profile actual devices.
- Establish design tokens (`--motion-fast`, `--motion-medium`, `--motion-emphasis`, easing curves) through a shared theme rather than scattered numbers. These are design choices, not rules of combat.
- Use one motion system (Motion for React plus CSS for simple interactions); avoid a Swup + Framer Motion + raw transition stack.
- Respect `prefers-reduced-motion` via `MotionConfig reducedMotion="user"` or equivalent, and use `useReducedMotion` for custom transforms, parallax, shake, flashing, autoplay or audio-visual sequences.
- Provide explicit skip/fast-forward for long nonessential battle animations and don't let animation interfere with 60-second round timing.
- Avoid continuous high-frequency blinking; do not use visual effects as the only feedback for turn ownership, damage or status.
- Animation is presentation-only. Replaying/reconnecting from a GM snapshot must never reroll a move.

Sources: https://motion.dev/docs/react ; https://motion.dev/docs/react-accessibility ; https://motion.dev/docs/react-motion-component
