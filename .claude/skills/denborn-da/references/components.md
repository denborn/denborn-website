# The kit

| File | Holds |
|---|---|
| `src/ui/tokens.css` | Every colour, duration, easing and base size. The only place a value is written. |
| `src/ui/kit.css` | The classes (`.dn-*`). Sizes in DS pixels, colours from tokens. |
| `src/ui/Screen.tsx` | `Screen`, `useDsUnit`, `usePixelScale`. |
| `src/ui/controls.tsx` | `Panel`, `Slot`, `OptionButton`, `CommandMenu`. |
| `src/ui/battle.tsx` | `HpBar`, `ExpBar`, `StatusBadge`, `AgonyBadge`, `HudBox`, `MoveButton`, `MessageBox`. |
| `src/ui/sprites.tsx` | `PokemonSprite`, the icons, `TypeLabel`. |
| `src/ui/battler.tsx` | `Battler` and its one-off moves. |
| `src/ui/motion.ts`, `meter.ts`, `pixel.ts` | Motion numbers; HP maths; pixel-art scaling. Pure, with tests. |
| `src/ui/stories/` | One story per piece, the scene, and the pages awaiting a ruling. `proposals.ts` holds wording that is not decided: it never leaves the board until the owner rules. |
| `.storybook/` | Storybook's setup: its own Vite config (no Cloudflare, no service worker), the language and font switches. |

## Adding a component

1. Find it in the games and measure it; add tokens with their source.
2. Write the class in `kit.css`. For a shaped, focusable control: the element stays unclipped, `::before` paints the rim and `::after` the face, both with the shape's `clip-path`; the inner shape's cut is the outer one minus about 0.6 of the rim's width, which keeps the rim even along a 45° edge.
3. Write the component: native elements (`button`, not a clickable `div`), words through props, states through `aria-pressed`, `aria-selected`, `disabled`.
4. Give it a story, export it from `index.ts`, add its row to `DESIGN.md` section 5.
5. Test only what is logic of ours (a ratio, a threshold, a scale). No test of markup or of a fixed value.

## Gotchas found while building

- A reset such as `.dn-root button { padding: 0 }` outranks a component class. The kit's reset is wrapped in `:where()` for that reason; keep it so.
- `clip-path` on a focusable element hides its focus ring, and `filter` is applied before `clip-path`, so a drop shadow on a clipped element is cut off. Shadows of shaped pieces sit on an unclipped parent (see `.dn-hud__back`).
- A grid column of `1fr` will not shrink below its content; use `minmax(0, 1fr)` when names can be long.
- A two-pixel checker at a fractional scale blurs: round its tile with CSS `round()`.
- A GIF cannot be paused; `PokemonSprite` copies the current frame to a canvas to hold it still.
