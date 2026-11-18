# The kit

| File | Holds |
|---|---|
| `src/ui/styles.css` | The one import: the font, the tokens, the classes. |
| `src/ui/tokens.css` | Every colour, duration, easing and base size. The only place a value is written. |
| `src/ui/kit.css` | The classes (`.dn-*`). Sizes in DS pixels, colours from tokens. |
| `src/ui/Screen.tsx` | `Screen`, `useDsUnit`, `usePixelScale`, `useScreenMetrics` (the DS pixel and the device's ratio, for art on a grid of its own). |
| `src/ui/controls.tsx` | `Panel`, `Slot`, `ArrowButton` (the games' small arrow, for `LineBrowser` and `Showcase`), `MenuButton` (the main menu's, on the slot's class), `PointedMenuButton` (UPDATE's: a menu button in the option's shape, its Pokémon a letter at the end of its word), `OptionButton`, `CommandMenu`, `TileButton` (one of the games' tiles with a word: a command, a tile hung from under the strip, the way back), `Tabs` (it draws the part it shows too, so the two are always tied together for screen readers). |
| `src/ui/battle.tsx` | `HpBar`, `ExpBar`, `StatusBadge`, `AgonyBadge`, `HudBox`, `MoveButton`, `MessageBox`, `AbilityBand`. |
| `src/ui/sprites.tsx` | `PokemonSprite` (MissingNo. stands in for a sprite that is not there), the icons, `TypeLabel`, `AppEmblem` (the animated den). |
| `src/ui/battler.tsx` | `Battler` and its one-off moves. |
| `src/ui/battle-scene.tsx`, `scene-camera.ts`, `sky.ts`, `own-pixels.ts` | A fight's scene (decisions 245 to 247, 266, 268, 271, 272, 275, 277 to 280 and 283): `SceneWorld` (one of Showdown's backdrops, lit by an hour, under a camera; it holds the two spots), `SceneSpot` (a side's one Pokémon, its feet on the battle base painted for it), `BattlePlate`, `ScenePlate` (a plate at the games' place, which never moves). `scene-camera.ts` holds the games' sizes, where the backdrop lies and where each Pokémon stands on it (the bases themselves are in `src/data/battle-backdrops.ts`), and the camera: what it does to each layer, where it may go, its shots and its round. `sky.ts` says what veil an hour lays. `own-pixels.ts` takes a picture Showdown serves enlarged back to its own pixels, for the fight's background and the title's plain. |
| `src/ui/order-bar.tsx`, `src/ui/top-strip.tsx`, `src/ui/device.ts` | The order of a round; the strip of a fight's touch screen and what it reads of the device (the time, the battery, how good the ping is). |
| `src/ui/field.tsx`, `line.ts` | `LineBrowser`, `FieldPlan` and `FieldEffects`; how the arrows walk a line (pure, tested). |
| `src/ui/forms.tsx` | `TextField`, `NumberField`, `StatRow`, `StepHeader`. |
| `src/features/<name>/` | The app's screens, built on the kit: a pure `draft.ts` or similar for choices and checks (tested), components that only show it, and a story under "Screens". |
| `src/ui/qr.tsx`, `qr-size.ts` | `QrCode`, and `PaperQrCode` for print (lines, not a picture); which QR code holds a text and the largest the app shows (pure, tested). |
| `src/ui/paper.css` | What prints: classes `dn-paper…`, in millimetres and points, black on white, no backgrounds and no icon sheets (printers leave backgrounds out). A paper sheet is `display: none` on screen and replaces the two screens (`.dn-dual`) in print; `dn-paper--preview` shows it on the board. See DESIGN.md, "On paper". |
| `src/ui/motion.ts`, `meter.ts`, `pixel.ts` | Motion numbers; HP maths; pixel-art scaling. Pure, with tests. |
| `src/ui/reduced-motion.ts` | `usePrefersReducedMotion`: the kit's one answer to "less motion?". Use it, not the animation library's hook. |
| `src/ui/title-scene.tsx`, `scene-fit.ts`, `title-intro.ts`, `storm.ts` | `TitleScene`, the home's top screen: the den in its plain and the storm. How a scene of its own pixel size fills a screen, the intro's steps, and when and where lightning strikes are pure and tested. Its den is drawn by `scripts/assets/draw-den.ts` (run it after changing the drawing), its places are in `src/data/sprites.ts`. |
| `src/ui/wanderers.tsx`, `wander.ts`, `ghost.ts` | `Wanderers` and `Ghosts`, which `TitleScene` shows for a `cast`: the characters walking round the den on the list of characters' top screen, and the dead as ghosts in its light. Where a walker may go, its ways in, round the den and out, where it stands when nothing moves and whose turn it is are pure and tested (`wander.ts`), as is what a ghost looks like at a moment (`ghost.ts`). The ground the den's rocks take is `TITLE_DEN.footprint`, which the den's script checks. |
| `src/ui/carousel.tsx`, `showcase.ts`, `pick-strip.tsx`, `ghost-picture.ts` | `Showcase`, one Pokémon shown large and alive with its arrows, and `PickStrip`, the icons to pick one from (the list of characters' bottom screen, decision 241); its acts, ways in and out and size, pure and tested; a ghost's picture and its drawing, shared with `Ghosts`. |
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
- A page is one `DualScreen` holding exactly two `Screen`s. In the app it draws nothing: the frame (`DualScreenFrame`) draws the two screens and moves them (decision 218). A page with nothing of its own for the top screen puts `DenScreen` there with the key `DEN` (decision 217), so that the den is one screen from page to page.
- A view inside a page that is a screen of its own (a step, a rule, a question) gets a `key` on its `Screen`, made from the page's own `useId()`; without one the view is replaced at once, with no motion, which decision 218 forbids.
- A screen that `scrolls` cuts off what is outside it. A focus ring as wide as the screen is drawn inside it. Its sticky foot hides what the browser scrolls into view under it: what takes focus there carries a `scroll-margin-bottom`. Nothing as tall as a screen goes in one that scrolls, since it could never be seen whole: a QR code goes on the top screen (`.dn-lineup--code`).
- The screens every visit starts from (home, options, credits, loading, the shell) import the kit's files one by one (`../../ui/Screen`, `../../ui/DualScreen`, `../../ui/controls`…), never `src/ui/index.ts`: that door re-exports the pieces that move, and would pull the animation library into the main script. Every other screen uses the door.
- A GIF cannot be paused; `PokemonSprite` copies the current frame to a canvas to hold it still.
- A screen that carries on from page to page (the den) is given no move by the frame: what a page adds to it must come and go by itself. The characters on the plain walk in, and walk out before they are taken away (`AnimatePresence` and `usePresence` in `src/ui/wanderers.tsx`, as the frame's own `Layer` does). A line of text put there would appear and vanish at once, which decision 218 forbids.
- The title scene's world orders what is in it by itself (`isolation: isolate`): a walker's `z-index` is the row its feet stand on, and the layers it may be before or behind have a row too (`.dn-title-scene__far`, `__near`, `__rain--near`). A new layer there says where it stands.
- A move in whole pixels along both axes takes two boxes, one inside the other, each with its own `steps()`: one box moved along a slope lands between pixels.
- What is said about a foot's buttons (the question they answer, what the last one did) goes over them, in the foot (`.dn-foot--said`), never at the top or the end of a long list: the list scrolls it off screen and the answer is given where nobody looks.
