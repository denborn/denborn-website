---
paths:
  - "src/ui/**/*.{ts,tsx,css}"
  - "src/components/**/*.{ts,tsx,css}"
  - "src/features/battle/**/*.{ts,tsx,css}"
---
# Motion and polished video-game feel

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
