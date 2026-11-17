# Motion

The vocabulary and its reduced-motion forms are in `DESIGN.md` section 6. This is how to use it.

- **A change of screen** (decisions 218 and 219) is the frame's work, not a component's: give the `Screen` a `key` that changes with what it shows, and say how far in the view is (`DualScreen depth`). `src/ui/screen-motion.ts` then flies its pieces out and the next ones in, or sweeps the stripes when the backdrop changes. A new layout adds its pieces to the list at the top of that file. Never fade a screen in or out.
- **A page does not reach into its screens from an effect**: the frame draws them a moment after the page. What must happen as something arrives is done by the thing itself (a `Battler` plays its own `cue`), or by the frame (the focus).
- **Simple state changes** (press, hover, selected, disabled): CSS transitions with the tokens `--dn-press`, `--dn-quick`, `--dn-move`, `--dn-slow` and the three easings. The kit's stylesheet removes transition and animation time under `prefers-reduced-motion`.
- **Choreography** (entering, lunging, blinking, going down, typing, bars): Motion for React, with `DURATION` and `EASE` from `src/ui/motion.ts`. Those numbers mirror the tokens; `src/ui/motion.test.ts` fails if they drift.
- **A hard blink, not a fade**: pass `HOLD` as the easing with opacity keyframes.
- **One-off moves return promises**: `Battler`'s `hit()` and `attack()` resolve when they finish, so a round's playback is a plain `await` sequence that can be skipped.
- **Distances are in DS pixels**: multiply by `useDsUnit()` when scripting a transform.
- **Reduced motion**: the app wraps its tree in `MotionConfig reducedMotion="user"` (transforms stop, opacity still changes). Anything else, such as a blink or a filter, must check `useReducedMotion()` itself.

The durations and easings are Denborn's own: the games' timings are not documented anywhere reachable. Changing one is a change to the look; show it on the board.
