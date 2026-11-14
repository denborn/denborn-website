# Denborn DA — the design system

Denborn should look and feel like Pokémon Black / White and Black 2 / White 2 (Nintendo DS, Gen 5): their battle screens, their menus, their snap. This file says how. It is the rule book; the code that follows it is in `src/ui/`, and every piece can be seen alone in Storybook (`pnpm storybook`).

The interface is **redrawn**, in CSS and SVG, from what was measured on reference sheets. No pixel of the games' interface is copied. Pokémon sprites and icons are not redrawn: they come from Pokémon Showdown at build time, are never committed, and stay their owners' (see `CREDITS.md`).

Status of this document: the system below is built and shown on the board, with the owner's rulings of 2026-11-14 (decisions 82 to 86, section 9). The app's own screens are built on it from milestone 4.

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

A **tall** screen (`Screen tall`) keeps the width and the grid but is as long as what it holds. Menus and forms are a **page** of two screens (`.dn-page`): a 4:3 screen that stays at the top, showing what is being worked on, and a tall one under it that the page scrolls. The battle keeps its two 4:3 screens.

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

The font is **VT323** (decision 82; SIL Open Font License), loaded by `src/ui/styles.css` in its Latin and extended Latin sets only. `--dn-font-scale` is 1.4: at that scale its capitals are as tall as the games' letters, about 8 DS pixels for names and 10 for messages. VT323 is a fixed-width face: every letter is 0.4 of the font size wide, so what fits where can be counted.

| Use | Size (× `--dn-t`) | Style |
|---|---|---|
| Badges, "Lv." and "HP" labels, type labels | 8 | — |
| PP count, small notes | 9 | — |
| Names, levels, HP numbers, slots, options | 10 | Names and levels over the scene: `.dn-text-outline` |
| Move names | 11 | Shadow in the type's shade. The longest move name in either language (16 letters) fits a button half a screen wide. |
| Messages | 12 | `.dn-text-shadow`, lines 16 DS pixels apart |
| BAG, RUN, SWITCH | 13 | Label colour, dark outline |
| FIGHT | 22 | Red, white outline |

Two text treatments, both from the games: a one-pixel **shadow** down and to the right (`.dn-text-shadow`, for text on a panel or a colour) and a one-pixel dark **outline** (`.dn-text-outline`, for names and levels standing directly on the scene).

French puts a space before `!` and `?`; the dictionaries write it as a no-break space so the mark never starts a line. French runs about a fifth longer than English: check a new piece in French first.

A pixel font is used for game data too, as in the games; the project's general rule prefers an ordinary font for small critical numbers. To honour its intent, numbers a player acts on (HP, PP, level) are never smaller than 9 DS pixels of text, about 19 px of font size on a 393 px phone. Whether that is comfortable on real phones is on the owner's device checklist.

## 5. Components

All in `src/ui/`, exported from `src/ui/index.ts`. They hold no game logic and no wording: text arrives through props, in the app's language. Shaped controls are painted by pseudo-elements (rim, then face) so the control itself is never clipped and its focus ring always shows.

| Component | What it is | After | States and notes |
|---|---|---|---|
| `Screen` | One DS screen; defines the DS pixel | — | `scene`, `touch`, `menu`. Has an accessible label. |
| `Panel` | Box for text and values | B2W2 HP box bodies | `dark` (dithered), `light`. Hard shadow down-right. |
| `Slot` | A row that can be chosen | BW party slots | resting, selected, `ok` (confirmed), `down` (downed), disabled. Cut corners, three bands split by two arrowheads; the outline changes with the state. |
| `OptionButton` | A small choice or action | B2W2 options buttons | resting, selected / primary, disabled. Pointed at both ends. |
| `CommandMenu` | FIGHT, BAG, RUN, SWITCH | BW touch screen | FIGHT is the great ball; the other three are dotted dark tiles with a thick white rim along the bottom. Each can be disabled. A `CornerButton`, a smaller tile hanging from the top right corner, opens the battlefield plan; its label is set small, so BATTLEFIELD fits on one line and CHAMP DE BATAILLE on two. |
| `MoveButton` | One of six moves | BW move buttons | Type-coloured face, white rim; name, type label, category symbol, PP. Selected (rim in the selection colour), disabled. `.dn-moves` lays six of them two by three over a row for BACK. |
| `HpBar`, `ExpBar` | Meters | B2W2 bars | Two-tone fill. HP drains at a steady pace (a full bar in 0.9 s) and changes colour on the way. `role="meter"` with its values. |
| `StatusBadge` | PSN, BRN, PAR, SLP, FRZ, bad PSN | B2W2 status icons | Letters come from the app's language; the full name is its accessible label. |
| `AgonyBadge` | Stacks left of a downed Pokémon | Denborn's own | The word AGONY and one diamond per stack: full ones remain, hollow ones are lost. |
| `HudBox` | Name, gender, level, HP of one Pokémon | B2W2 HP boxes | Name and level stand on the scene; badges, "HP" and the bar sit on a dark plate with a point at the outer end, a slant at the inner one and a hard shadow. `foe` mirrors it. Optional HP numbers. For a downed Pokémon the Agony badge takes the place of "HP" and the bar (decision 83). A Pokémon that carries stat changes or effects of its own shows a small gold mark, an arrow up over an arrow down, beside its badges (decision 94); the same mark sits on its tile of the plan. A name too long for the box is cut with an ellipsis. Width can be narrowed with `--dn-hud-width`. |
| `MessageBox` | The message band | BW message band | Types the text out (45 letters a second, Denborn's choice); a tap, Enter or Space completes it, then asks for the next. A screen reader gets each line whole, once. |
| `PokemonSprite` | A battle sprite | Showdown | Front, back, female. Can be frozen on a frame. Shows the name when there is no sprite. |
| `Battler` | A Pokémon on the field | — | Enters from its side, or from the side of the arrow that brought it; `hit()` and `attack()` play once and resolve when done; poses `standing`, `downed`, `gone`. |
| `LineBrowser` | One Pokémon of a line at a time | Denborn's own, in the games' manner | An arrow on each side of the HUD box walks along the line; the line's letters sit underneath: the one shown is lit, a downed one struck through in red, an empty slot faded, the viewer's own underlined in gold. Arrows step over empty slots and stop at the ends. The new Pokémon's name is read out. |
| `FieldPlan` | The battlefield from above | Denborn's own, after the party slots | Both lines as tiles (icon, letter, HP bar or Agony stacks), each line centred on the other at one pitch, so a tile's place is its x of the rules. Six tiles fill the width. The two Pokémon on the scene are lit; a downed one is red; a dead one's slot stays, empty; one out of the viewer's reach is darker (decision 90). Between the lines, the terrain and the weather, each a label in a type's colours (decision 89). At its foot, MORE (with the number of effects) and BACK. |
| `FieldEffects` | Everything in effect on the battlefield | Denborn's own | The list behind MORE (decisions 92 to 94): terrain, weather, rooms, each side's screens and hazards, then what sits on a single Pokémon (its stat changes as one entry, each other effect as its own). Each entry: a mark for whom it touches (a diamond for the whole field, an arrow up for the foes' side, an arrow down for the party's, as they lie on the plan, followed by the Pokémon's letter when it is one Pokémon's), its name, the turns it has left in gold, the scope in words, what it does. It scrolls, by touch or keyboard. |
| `PokemonIcon`, `ItemIconImage`, `CategoryIcon` | Icons | Showdown, PokéAPI | Decorative unless given a label. `CategoryIcon` has a `compact` form: its symbol alone. |
| `TypeLabel` | A type's label | BW type labels | Drawn by the app in the type's two colours, with the type's name in the interface's language (decision 85). The size of the games' label, wider for a long name. |
| `TextField` | A line of text to type | B2W2 option boxes | Label above, a line of help or of what is wrong underneath, tied to the field for screen readers. |
| `StatRow` | One stat: name, bar, value | BW summary | A stat raised by the nature is red with an arrow up, a lowered one blue with an arrow down, as in the games. |
| `StepHeader` | The title of a step of a flow | — | With "Step 2 of 7". It takes focus when the step changes, so the change is announced. |
| `.dn-table`, `.dn-cell` | A table of choices | The games' nature table | The natures: one stat raised per row, one lowered per column, the five neutral ones on the diagonal. |
| `QrCode` | A code as a QR code | — | Always black on white with its quiet border, as wide as its container. The finest shown is 101 × 101 squares (decision 99); for a longer text it shows what it is given instead, such as the way to the file. |

### The battle view

A session has four players or more, so the scene does not try to show every Pokémon at once (decisions 87 and 88). It is the games' own one-against-one view:

- **The scene** (top screen) shows one foe, upper right, and one ally, lower left, each with its HUD box in a `LineBrowser`. It opens on the viewer's own Pokémon and the first foe.
- **The battlefield** (touch screen, from the BATTLEFIELD corner button) is the `FieldPlan`, with the terrain and the weather named between the lines. It does not list everything: **MORE** opens `FieldEffects`, the list of all that is in effect, with whom each touches and the turns it has left ("3 turns left"). What sits on one Pokémon is there too, under its letter, and on its own sheet, where a changed stat reads "84 +2". A tap on a tile brings that Pokémon onto the scene and opens its sheet on the touch screen: HP, types, stats, Ability, held item, moves. BACK returns to the plan, then to the commands.

- **While a round plays**, the scene follows the action: each action brings its user and its target onto the scene (decision 91).

The sheet on the board is a mock: the real one is designed with the character screens (milestone 4). What each effect says it does is, for now, the description of the move that sets it; its proper wording comes with the battle screens.

Not designed yet, and not to be improvised: target selection, the Bag, the party's order, the timer and the GM's console. They come with their milestones, on this system.

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
| Category labels | Showdown `categories/` | 32 × 14 | `CategoryIcon` |

Type labels are not artwork: the app draws them (`TypeLabel`), so they can be in French. Paths are built only by `src/data/sprites.ts`, from what the data pack and the sprite lock say exists; a name is never guessed. Order of fallback for a battle sprite: Gen 5 animated, then Showdown's `ani` set, then the Pokémon's name as text.

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

## 9. Ruled by the owner on the board (2026-11-14)

| Decision | Ruling |
|---|---|
| 82 | The font is VT323. |
| 83 | A downed Pokémon's Agony shows in place of its HP bar. |
| 84 | French buttons and badges: ATTAQUE, SAC, FUITE, ÉCHANGE; PSN, BRÛ, PAR, SOM, GEL; N. and PV. |
| 85 | Type labels are drawn by the app, in both languages. |
| 86 | Denborn's own battle messages, in English and French, as written in `src/i18n/` (`battle.messages`). |
| 87, 88 | The battle shows one foe and one ally at a time, with arrows to walk along each line, and a button that shows the plan; a tap on a Pokémon there shows its sheet. Approved as mocked on the board. |
| 89 | The button says BATTLEFIELD / CHAMP DE BATAILLE; the battlefield also shows the terrain in effect. |
| 90 | On the plan, foes out of the viewer's reach are darker. |
| 91 | While a round plays, the scene follows the action. |
| 92 | The battlefield also knows the weather, the whole-field effects and each side's conditions. |
| 93 | A duration reads "3 turns left" / "3 tours restants". The plan does not show everything: MORE lists all that is in effect and whom it touches. |
| 94 | What sits on one Pokémon (stat changes, Leech Seed…) is in MORE under its letter and on its own sheet; a small mark on its tile and HUD box says it carries some. |
| 99 | No QR code finer than 101 × 101 squares is shown; past that, the file. |
| 100 | The home: the app's name over three Pokémon; Characters, Campaigns, Options. |
| 101 | Character creation in seven steps: Pokémon; name, gender, nature and Ability; roleplay attributes; IVs and EVs; moves; item pack; a last look. |
| 102 | Menus and forms: the top DS screen stays, the lower one is as long as its content and scrolls. |

Any change to these is a new ruling. Anything the system does not cover yet (section 5, last paragraph) is shown on the board and ruled before it ships.
