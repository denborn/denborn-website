# Denborn DA — the design system

Denborn should look and feel like Pokémon Black / White and Black 2 / White 2 (Nintendo DS, Gen 5): their battle screens, their menus, their snap. This file says how. It is the rule book; the code that follows it is in `src/ui/`, and every piece can be seen alone in Storybook (`pnpm storybook`).

The interface is **redrawn**, in CSS and SVG, from what was measured on reference sheets. No pixel of the games' interface is copied. Pokémon sprites and icons are not redrawn: they come from Pokémon Showdown at build time, are never committed, and stay their owners' (see `CREDITS.md`).

Status of this document: the system below is built and shown on the board. Four points still await the owner's ruling (section 9); until then nothing in the app's own screens depends on them.

## 1. Principles

1. **A DS in the hand.** A phone held upright shows the two DS screens stacked: the scene above, the touch controls below. Phones are the players' device; the GM's console is for a laptop or a tablet and is designed with its screens (milestones 4 to 6).
2. **One grid.** Everything is sized in DS pixels, so proportions are the games' at any screen size (section 2).
3. **Measured, then redrawn.** A colour or a shape taken from the games is measured on a sheet, with the tool in the skill, and recorded as a token. What Denborn adds (Agony, the backdrop, motion timings) is marked as its own.
4. **Motion explains.** Every press answers at once; HP drains at a steady pace; a Pokémon that is hit blinks. Motion only shows what the battle already decided. It never decides or delays anything.
5. **Nothing by colour alone, nothing by motion alone.** States also change an outline, a shape or a word. Everything works with reduced motion, by keyboard, and with a screen reader.

## 2. The DS pixel

A DS screen is 256 × 192 pixels. `Screen` (`src/ui/Screen.tsx`) is a 4:3 surface that defines one **DS pixel**, `--dn-u`, as its own width divided by 256. Inside it every size is written `calc(N * var(--dn-u))`.

| Token | Meaning |
|---|---|
| `--dn-u` | One DS pixel. `100cqw / 256` inside a `Screen`; 2 px outside one. |
| `--dn-t` | One DS pixel of text: `--dn-u` × `--dn-font-scale`. Every font size is a multiple of it. |
| `--dn-target` | 44 px, the smallest touch target. Controls never go under it, whatever the scale. |

On a phone 393 px wide a DS pixel is about 1.5 px; on a 768 px tablet, 3 px. Shapes are vector, so they stay sharp at any size. Two things need whole pixels and get them:

- **Pixel art** (sprites, icons) is drawn at the nearest size that gives each of its pixels a whole number of device pixels (`snapScale` in `src/ui/pixel.ts`, tested). Components take a `scale` in DS pixels per sprite pixel: 1 is as large as on the DS.
- **Dither** (the two-colour checker of dark panels) is rounded up to whole pixels with CSS `round()`, or it would blur into grey.

`Screen` comes in three kinds: `scene` (the battle, with Denborn's own sky-and-grass backdrop), `touch` (the brown shell of the games' touch screen) and `menu` (black with the options screen's faint plus marks).

## 3. Colour

All colours are tokens in `src/ui/tokens.css`; components use tokens only. The Storybook page *Foundations / Palette* reads that file and shows every one. Where each measured group comes from:

| Group | Tokens | Measured on |
|---|---|---|
| Frames, dark and light panels, text and its shadow | `--dn-ink`, `--dn-panel*`, `--dn-text*` | B2W2 "HP Bars" sheet: the Black 2 and White 2 boxes and the example boxes |
| Selection, party slots (normal, selected, fainted, confirmed: middle, left band, right band, outline) | `--dn-select*`, `--dn-slot*` | BW "Party Screen" sheet |
| Option buttons, menu backdrop and its marks | `--dn-option*`, `--dn-select-line`, `--dn-backdrop*` | B2W2 "Options Screen" sheet |
| Command tiles, label colours, the shell and the ball | `--dn-tile*`, `--dn-cmd-*`, `--dn-shell*`, `--dn-ball-*` | BW "Battle HUD" sheet |
| Message band | `--dn-message-*` | BW "Battle HUD" sheet, the example screen: the scene behind the text is darkened to 40% of its value, under one dark-red line and one darker |
| HP and EXP bars, "Lv." and "HP" gold, gender marks | `--dn-hp-*`, `--dn-exp*`, `--dn-label-gold*`, `--dn-male*`, `--dn-female*` | B2W2 "HP Bars" sheet |
| Status badges | `--dn-status-*` | B2W2 "HP Bars" sheet (the dark PSN is bad poison) |
| Types, fill and shade | `--dn-type-*` | BW type labels as published by PokéAPI; Fairy (not a Gen 5 type) from Showdown's label |

Denborn's own, with no counterpart in the games: the Agony colours (`--dn-agony*`), the battle backdrop (`--dn-scene-*`), the focus ring (`--dn-focus-ring`).

HP bars are green above half, yellow down to a fifth, red at a fifth or less (`hpTone`, tested).

## 4. Type

The font is **not chosen yet** (section 9). The board shows four candidates, all under the SIL Open Font License: DotGothic16, VT323, Pixelify Sans and Tiny5. Each has a `--dn-font-scale` that gives its capitals the height of the games' letters (about 8 DS pixels for names, 10 for messages), so they are compared at the size they would be used at.

| Use | Size (× `--dn-t`) | Style |
|---|---|---|
| Badges, "Lv." and "HP" labels | 8 | — |
| PP count, small notes | 9 | — |
| Names, levels, HP numbers, slots, options | 10 | Names and levels over the scene: `.dn-text-outline` |
| Messages, move names | 12 | `.dn-text-shadow`, lines 16 DS pixels apart |
| BAG, RUN, SWITCH | 13 | Label colour, dark outline |
| FIGHT | 22 | Red, white outline |

Two text treatments, both from the games: a one-pixel **shadow** down and to the right (`.dn-text-shadow`, for text on a panel or a colour) and a one-pixel dark **outline** (`.dn-text-outline`, for names and levels standing directly on the scene).

A pixel font is used for game data too, as in the games; the project's general rule prefers an ordinary font for small critical numbers. To honour its intent, numbers a player acts on (HP, PP, level) are never smaller than 9 DS pixels, about 14 px on a 393 px phone. Whether that is comfortable on real phones is on the owner's device checklist.

## 5. Components

All in `src/ui/`, exported from `src/ui/index.ts`. They hold no game logic and no wording: text arrives through props, in the app's language. Shaped controls are painted by pseudo-elements (rim, then face) so the control itself is never clipped and its focus ring always shows.

| Component | What it is | After | States and notes |
|---|---|---|---|
| `Screen` | One DS screen; defines the DS pixel | — | `scene`, `touch`, `menu`. Has an accessible label. |
| `Panel` | Box for text and values | B2W2 HP box bodies | `dark` (dithered), `light`. Hard shadow down-right. |
| `Slot` | A row that can be chosen | BW party slots | resting, selected, `ok` (confirmed), `down` (downed), disabled. Cut corners, three bands split by two arrowheads; the outline changes with the state. |
| `OptionButton` | A small choice or action | B2W2 options buttons | resting, selected / primary, disabled. Pointed at both ends. |
| `CommandMenu` | FIGHT, BAG, RUN, SWITCH | BW touch screen | FIGHT is the great ball; the other three are dotted dark tiles with a thick white rim along the bottom. Each can be disabled. |
| `MoveButton` | One of six moves | BW move buttons | Type-coloured face, white rim; name, type and category labels, PP. Selected (rim in the selection colour), disabled. `.dn-moves` lays six of them two by three over a row for BACK. |
| `HpBar`, `ExpBar` | Meters | B2W2 bars | Two-tone fill. HP drains at a steady pace (a full bar in 0.9 s) and changes colour on the way. `role="meter"` with its values. |
| `StatusBadge` | PSN, BRN, PAR, SLP, FRZ, bad PSN | B2W2 status icons | Letters come from the app's language; the full name is its accessible label. |
| `AgonyBadge` | Stacks left of a downed Pokémon | Denborn's own | Full diamonds remain, hollow ones are lost. Placement to be ruled (section 9). |
| `HudBox` | Name, gender, level, HP of one Pokémon | B2W2 HP boxes | Name and level stand on the scene; badges, "HP" and the bar sit on a dark plate with a point at the outer end, a slant at the inner one and a hard shadow. `foe` mirrors it. Optional HP numbers. Width can be narrowed with `--dn-hud-width`. |
| `MessageBox` | The message band | BW message band | Types the text out (45 letters a second, Denborn's choice); a tap, Enter or Space completes it, then asks for the next. A screen reader gets each line whole, once. |
| `PokemonSprite` | A battle sprite | Showdown | Front, back, female. Can be frozen on a frame. Shows the name when there is no sprite. |
| `Battler` | A Pokémon on the field | — | Enters from its side; `hit()` and `attack()` play once and resolve when done; poses `standing`, `downed`, `gone`. |
| `PokemonIcon`, `ItemIconImage`, `TypeIcon`, `CategoryIcon` | Icons | Showdown, PokéAPI | Decorative unless given a label. |
| `TypeLabel` | A type label drawn by the app | BW type labels | In the app's language. Whether it replaces Showdown's English images is to be ruled (section 9). |

Not designed yet, and not to be improvised: the layout for four to six Pokémon a side, target selection, the Bag, the party and summary screens, and the GM's console. They come with their milestones, on this system.

## 6. Motion

One motion system: CSS transitions for presses and state changes, Motion for React for what is choreographed. The numbers exist once as CSS tokens and once in `src/ui/motion.ts`; a test keeps them equal. They are Denborn's own: the games' timings are not documented.

| Token | Value | Use |
|---|---|---|
| `--dn-press` | 90 ms | A button going down |
| `--dn-quick` | 160 ms | A selection moving, a badge arriving |
| `--dn-move` | 280 ms | A panel or a Pokémon sliding in, a lunge |
| `--dn-slow` | 480 ms | A Pokémon going down, a screen wipe |
| `--dn-ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Arrivals and answers |
| `--dn-ease-in` | `cubic-bezier(0.6, 0, 0.9, 0.4)` | Departures |
| `--dn-ease-snap` | `cubic-bezier(0.3, 1.4, 0.5, 1)` | Arrivals with a small overshoot |

What moves, and how:

| Event | Motion | With reduced motion |
|---|---|---|
| Press | The control sinks one or two DS pixels, or shrinks slightly; commands and moves also brighten | The same change, at once |
| A Pokémon enters | Slides in from its own side | Appears |
| It uses a move | Short lunge toward the foe | Nothing; the message says it |
| It is hit | Three hard blinks in 0.42 s | Nothing; the HP bar and the message say it |
| HP changes | The bar moves at a steady pace, recolouring on the way | Jumps to the new value |
| It is downed | Sinks 5 DS pixels, greys, and its sprite stops on its frame | Same end state, at once |
| It is out of the fight | Drops and fades | Disappears |
| A message | Typed out; "more" arrow bobs | Shown whole; arrow still |
| A badge arrives | Scales in with a small overshoot | Appears |

Rules:

- Animate `transform` and `opacity`. The one exception is the grey of a downed Pokémon, a short filter change on one sprite.
- Never wait for an animation before accepting input or sending a command. A round's playback can be skipped.
- No more than three blinks a second, and never as the only sign of anything.
- Animated sprites stand still for anyone who asks for reduced motion (`PokemonSprite` copies the current frame to a canvas).
- Wrap choreography in `MotionConfig reducedMotion="user"` and use `useReducedMotion` for anything that is not a transform.

## 7. Artwork

| What | From | Size | Component |
|---|---|---|---|
| Battle sprites, front and back, animated | Showdown `gen5ani`, `gen5ani-back`; `ani` when a species has no Gen 5 sprite | Varies, up to 96 × 96 | `PokemonSprite`, `Battler` |
| Female sprites (22 species) | Same folders, `-f` | — | `female` prop |
| Pokémon icons | Showdown `pokemonicons-sheet.png`, 40 × 30 cells, 12 a row, by Pokédex number | 40 × 30 | `PokemonIcon` |
| Item icons | Showdown `itemicons-sheet.png`, 24 × 24 cells, 16 a row; PokéAPI's own image for the items Showdown lacks | 24 × 24, 30 × 30 | `ItemIconImage` |
| Type and category labels | Showdown `types/`, `categories/` | 32 × 14 | `TypeIcon`, `CategoryIcon` |

Paths are built only by `src/data/sprites.ts`, from what the data pack and the sprite lock say exists; a name is never guessed. Order of fallback for a battle sprite: Gen 5 animated, then Showdown's `ani` set, then the Pokémon's name as text.

## 8. Accessibility

Every screen built on the kit must hold to this. The kit's own pieces were checked in a browser on 2026-11-14 (reduced motion, keyboard focus, target sizes); a full audit with real assistive technology is part of the release milestone.

- **Targets**: no control under 44 × 44 px, whatever the scale.
- **Focus**: one ring for everything, white inside dark, never clipped. Order follows reading order. When a view replaces another (commands to moves), focus moves to the new view's first control.
- **Keyboard**: every action works with Tab, Enter and Space. Nothing needs a drag.
- **Names**: a sprite or icon next to its name is decorative; alone, it carries a label. Meters expose their values. Status badges carry the condition's full name.
- **Announcements**: battle messages are read whole, once, politely. The typewriter is for the eyes only.
- **Colour**: no state rests on colour alone. Text over the scene has an outline, text on colour a shadow.
- **Motion**: everything in section 6's right-hand column.
- **Language**: components receive their words; none is written in a component.

## 9. Awaiting the owner's ruling

Shown on the board under *To decide*:

1. The font, among the four candidates (or none of them).
2. The French words on buttons and badges (ATTAQUE, SAC, FUITE, ÉCHANGE; PSN, BRÛ, PAR, SOM, GEL; N. and PV), and whether the French interface shows Showdown's English type labels or labels drawn by the app in French.
3. Where Agony shows on a downed Pokémon's box: a tag under the plate, pips on the plate, or in place of the HP bar.
4. The wording of Denborn's own battle messages, in English and French. Only "<name> is agonizing…" is decided.
