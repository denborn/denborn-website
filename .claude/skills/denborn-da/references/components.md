# The kit

| File | Holds |
|---|---|
| `src/ui/styles.css` | The one import: the font, the tokens, the classes. |
| `src/ui/tokens.css` | Every colour, duration, easing and base size. The only place a value is written. |
| `src/ui/kit.css` | The classes (`.dn-*`). Sizes in DS pixels, colours from tokens. |
| `src/ui/Screen.tsx` | `Screen`, `useDsUnit`, `usePixelScale`. |
| `src/ui/controls.tsx` | `Panel`, `Slot`, `OptionButton`, `CommandMenu`, `CornerButton`, `Tabs` (it draws the part it shows too, so the two are always tied together for screen readers). |
| `src/ui/battle.tsx` | `HpBar`, `ExpBar`, `StatusBadge`, `AgonyBadge`, `HudBox`, `MoveButton`, `MessageBox`, `AbilityBand`. |
| `src/ui/sprites.tsx` | `PokemonSprite` (MissingNo. stands in for a sprite that is not there), the icons, `TypeLabel`, `AppEmblem` (the animated den). |
| `src/ui/battler.tsx` | `Battler` and its one-off moves. |
| `src/ui/field.tsx`, `line.ts` | `LineBrowser`, `FieldPlan` and `FieldEffects`; how the arrows walk a line (pure, tested). |
| `src/ui/forms.tsx` | `TextField`, `NumberField`, `StatRow`, `StepHeader`. |
| `src/features/<name>/` | The app's screens, built on the kit: a pure `draft.ts` or similar for choices and checks (tested), components that only show it, and a story under "Screens". |
| `src/ui/qr.tsx`, `qr-size.ts` | `QrCode`, and `PaperQrCode` for print (lines, not a picture); which QR code holds a text and the largest the app shows (pure, tested). |
| `src/ui/paper.css` | What prints: classes `dn-paper…`, in millimetres and points, black on white, no backgrounds and no icon sheets (printers leave backgrounds out). A paper sheet is `display: none` on screen and replaces `.dn-page` in print; `dn-paper--preview` shows it on the board. See DESIGN.md, "On paper". |
| `src/ui/motion.ts`, `meter.ts`, `pixel.ts` | Motion numbers; HP maths; pixel-art scaling. Pure, with tests. |
| `src/ui/reduced-motion.ts` | `usePrefersReducedMotion`: the kit's one answer to "less motion?". Use it, not the animation library's hook. |
| `src/ui/stories/` | One story per piece, and the battle scene. When a look or a wording needs the owner's ruling, it gets a page under "To decide" with its options side by side, and the undecided wording stays in a file of the stories (`proposals.ts`, created when needed), never in `src/i18n/`, until the owner rules. |
| `.storybook/` | Storybook's setup: its own Vite config (no Cloudflare, no service worker), the language switch. |

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
- Class names are global. A new `.dn-field` for forms silently took the battlefield plan's `.dn-field` rules (absolute, full size) and hid itself behind the list. Search `kit.css` for a name before using it.
- A sticky screen hides what the browser scrolls into view under it: focusable things in a tall screen carry a `scroll-margin-top` of a screen's height.
- The screens every visit starts from (home, options, credits, loading, the shell) import the kit's files one by one (`../../ui/Screen`, `../../ui/controls`…), never `src/ui/index.ts`: that door re-exports the pieces that move, and would pull the animation library into the main script. Every other screen uses the door.
- A GIF cannot be paused; `PokemonSprite` copies the current frame to a canvas to hold it still.
- What is said about a foot's buttons (the question they answer, what the last one did) goes over them, in the foot (`.dn-foot--said`), never at the top or the end of a long list: the list scrolls it off screen and the answer is given where nobody looks.
