# Denborn DA — the design system

Denborn should look and feel like Pokémon Black / White and Black 2 / White 2 (Nintendo DS, Gen 5): their battle screens, their menus, their snap. This file says how. It is the rule book; the code that follows it is in `src/ui/`, and every piece can be seen alone in Storybook (`pnpm storybook`).

The interface is **redrawn**, in CSS and SVG, from what was measured on reference sheets. No pixel of the games' interface is copied. Pokémon sprites and icons are not redrawn: they come from Pokémon Showdown at build time, are never committed, and stay their owners' (see `CREDITS.md`).

Status of this document: the system below is built and shown on the board, with the owner's rulings of 2026-11-14 (decisions 82 to 86, section 9). The app's own screens are built on it from milestone 4.

## 1. Principles

1. **A DS in the hand.** Every screen of the app is the two DS screens, one over the other, each a box of its own that shows its own thing (decision 214): above, what is being looked at; below, what is touched. Together they are never taller than the window, and the window does not scroll. Phones are the players' device; the game master's console is for a laptop or a tablet, and is two screens like the rest.
2. **One grid.** Everything is sized in DS pixels, so proportions are the games' at any screen size (section 2).
3. **Measured, then redrawn.** A colour or a shape taken from the games is measured on a sheet, with the tool in the skill, and recorded as a token. What Denborn adds (Agony, the backdrop, motion timings) is marked as its own.
4. **It always moves, and motion explains.** The app is a video game, never a set of pages (decisions 218 and 219): whatever appears, leaves or changes does so with motion, and nothing only fades. The two screens stay while what they show changes. Every press answers at once; HP drains at a steady pace; a Pokémon that is hit blinks. Motion only shows what the battle already decided. It never decides anything.
5. **Nothing by colour alone, nothing by motion alone.** States also change an outline, a shape or a word. Everything works with reduced motion, by keyboard, and with a screen reader.

## 2. The DS pixel

A DS screen is 256 × 192 pixels. `Screen` (`src/ui/Screen.tsx`) is a 4:3 surface that defines one **DS pixel**, `--dn-u`, as its own width divided by 256. Inside it every size is written `calc(N * var(--dn-u))`.

| Token | Meaning |
|---|---|
| `--dn-u` | One DS pixel. `100cqw / 256` inside a `Screen`; 2 px outside one. |
| `--dn-t` | One DS pixel of text: `--dn-u` × `--dn-font-scale`. Every font size is a multiple of it. |
| `--dn-target` | 44 px, the smallest touch target. Controls never go under it, whatever the scale. |

On a phone 393 px wide a DS pixel is about 1.5 px; at the app's widest, 480 px, it is about 1.9 px. Shapes are vector, so they stay sharp at any size. Two things need whole pixels and get them:

- **Pixel art** (sprites, icons) is drawn at the nearest size that gives each of its pixels a whole number of device pixels (`snapScale` in `src/ui/pixel.ts`, tested). Components take a `scale` in DS pixels per sprite pixel: 1 is as large as on the DS.
- **Dither** (the two-colour checker of dark panels) is rounded up to whole pixels with CSS `round()`, or it would blur into grey.

**The DS** (`DualScreen`, `src/ui/DualScreen.tsx`) is two `Screen`s, the top one first, and takes exactly two. Both are 4:3 on every page (decision 215). A screen that **scrolls** (`Screen scrolls`) is a DS screen still: what it holds is a column from its top, and what is longer than the screen scrolls inside it, the backdrop staying where it is (decision 216). Menus and forms are built that way: the top screen shows what is being worked on, the bottom one scrolls, and its foot stays in sight. A page with nothing of its own for the top screen shows the den there, in the rain (`DenScreen`, decision 217).

**The frame** (`DualScreenFrame`, in the app's shell) is the DS itself, and stays for the whole visit: a page's `DualScreen` hands it its two screens, and each of the frame's two boxes changes on its own (section 6). A screen's React `key` is its name. The same name on the next page, or on the page's next view, is the same screen: it is not drawn anew, and whatever moves on it goes on moving (the den, `DEN`). Another name is another screen. With no key a screen is its page's own. A page says how far in each of its views is (`DualScreen depth`), so that the frame knows a step back from a step forward.

**The window** (`.dn-device`; in the app, all of the device's, clear of the notch, of rounded corners and of the home bar) holds the DS in its middle, as large as fits with both screens whole, black around it: a phone taller than two DS screens shows black above and below. The DS is never wider than 30rem (480 px). It is never narrower than 20rem (320 px), the narrowest phone the kit is drawn for: a window under 480 px high (a phone on its side, a page much enlarged in a browser) scrolls down to the bottom screen instead (section 8). Where the window's height sets the width, the width is a multiple of four pixels, so that both screens are a whole number of pixels high. On the board a `Phone` gives a width only, and the DS is as wide as it; a `Device` is a window of a given size.

`Screen` comes in four kinds: `scene` (the battle, with Denborn's own sky-and-grass backdrop), `touch` (the brown shell of the games' touch screen), `menu` (black with the options screen's faint plus marks) and `blank` (black, with nothing on it: the bottom screen while the title shows).

The title screen's scene is the one thing not drawn on the DS pixel: it is pixel art of its own size (Showdown's meadow, 238 × 158), each of its pixels a whole number of the device's, enough for its rows to cover the 4:3 screen. It stands on the screen's bottom edge with the den in the middle, and the screen cuts what is left over at its sides and top (`fitScene` in `src/ui/scene-fit.ts`, tested). The name on it is placed in DS pixels, on the screen.

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

Denborn's own, with no counterpart in the games: the Agony colours (`--dn-agony*`), the battle backdrop (`--dn-scene-*`), the focus ring (`--dn-focus-ring`), and the title screen's (`--dn-title-*`): the night's veil, the rain, the red of the lightning, and the four golds and the deep red of the app's name. The main menu's buttons (`--dn-menu-*`, decisions 221 and 230) are Denborn's own too, each made of colours measured elsewhere: the gold labels' shade, the great ball's reds, the Fighting, Dark, Dragon and Ghost labels, and Unown's greys; with them, the faint white of a plate's checker and the shadow under a button's Pokémon.

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
| `Screen` | One DS screen; defines the DS pixel | — | `scene`, `touch`, `menu`, `blank`. Has an accessible label. With `scrolls`, what it holds scrolls inside it, under a thin bar in the colour of a selected option's outline where a browser draws one. |
| `DualScreen`, `DualScreenFrame` | The DS: two screens, one over the other | The DS (decisions 214 and 218) | `DualScreen` takes exactly two `Screen`s. As wide as it is given; in the window (`.dn-device`) as large as fits (section 2). In the app it draws nothing itself and hands its screens to the frame, which moves them in and out (section 6); on the board it is the two screens as they are. |
| `.dn-lineup--code` | A QR code on a top screen | Denborn's own | As large as the screen is high, in its middle: a character's code while its sheet's SHARE part is open, a campaign's creation link while the list of its rules shows. Nowhere in the app are a code's squares larger. |
| `Panel` | Box for text and values | B2W2 HP box bodies | `dark` (dithered), `light`. Hard shadow down-right. |
| `Slot` | A row that can be chosen | BW party slots | resting, selected, `ok` (confirmed), `down` (downed), disabled. Cut corners, three bands split by two arrowheads; the outline changes with the state. |
| `OptionButton` | A small choice or action | B2W2 options buttons | resting, selected / primary, disabled. Pointed at both ends. |
| `MenuButton` (`.dn-menu-button`), `.dn-menu` | A button of the main menu; the menu's grid | Denborn's own, in a party slot's rim (decisions 221 to 224, 230) | A plate in one of six colours (yellow, red, brown, blue, purple, grey) with one word: two flat halves, the upper one a shade lighter, a faint checker of 2 DS pixels on the lower one, inside a party slot's rim and cut corners. Everything starts from the left: the Pokémon, in a place that is the same on every button and half-way up it, in whose middle it stands on the bottom, over a round shadow as wide as itself less a fifth, as on the field; then the word, at 12. The Pokémon is its drawing alone, at 0.8 DS pixel per pixel on every screen, in a place of 30 by 24; one wider than 27 DS pixels at that size is drawn as wide as that. It is the one sprite that is not held to whole pixels of the device (decision 232): the nearest whole size made it a third larger on one screen than on another. Disabled, the button is dimmed. Pressed, it sinks and lights up, its rim turns white and its Pokémon hops off its shadow. `.dn-menu` fills a screen with a grid of four rows of two (`.dn-menu__grid`) over a justified paragraph (`.dn-menu__notice`). |
| `PointedMenuButton` (`.dn-menu-button--pointed`) | The menu's UPDATE | Denborn's own: a menu button in an option button's shape (decision 233) | A menu button, with its colours, plate, rim, dimmed look and press, but pointed at both ends as an option button is, with points as sharp (12 DS pixels deep on a row about 35 high). Its word is in its middle; its Pokémon is the word's last letter, as tall as the capitals (10 DS pixels), on their line, after a space and with no shadow, and hops when the button is held down. |
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
| `.dn-order` | The party's order on the command screen | Denborn's own | A column down the left of the ball (decisions 135 and 149): rank, icon, a drawn tick for who has locked; the viewer's own rank underlined in gold. One button: a tap opens the party's list. |
| `.dn-timer` | The round's timer | Denborn's own | Minutes and seconds down the right of the ball, red under ten seconds, with "stopped" under it while it is held. An inline form sits in a line of title. Spoken to the nearest ten seconds, never tick by tick. |
| `.dn-roster` | A list filling the touch screen | Denborn's own, after the list of effects | A line of title, rows that scroll, a row of buttons. The party in its order with what each has locked (decision 146), which is what a player sees once locked, with CHANGE to unlock; the Bag's items; a Pokémon's moves to restore. |
| `.dn-ask` | A question on the whole touch screen | Denborn's own | An ally's ask to trade places or Speed, with ACCEPT and REFUSE. |
| `.dn-ability` (`AbilityBand`) | The band that names an Ability when it acts | Denborn's own drawing, after the games' band (decisions 165, 167) | Slides in from its Pokémon's side of the scene: a foe's from the right over its head, in the reds of a downed slot; an ally's from the left over its head, in the blues of a slot. The name on one line, the Ability on the next; its far end cut aslant like the boxes. It hides neither Pokémon nor box. |
| `.dn-card` | A Pokémon's sheet during a fight | Denborn's own, after the summary | Its box with HP in numbers, its types, five stats with the stages they carry in gold, Ability, held item, moves in their type's colour with PP. |
| `AppEmblem` (`.dn-emblem`) | The app's emblem: the pink grid ball, rocking | Denborn's own, after the Poké Ball's shake in the games (decision 212) | Seven poses of 42 × 32 side by side in one picture (`public/emblem-frames.png`): upright, then three to the left and three to the right, the ball rolling 2, 4 and 5 pixels as it tips. It rocks to the left and back, to the right and back, in eleven steps of 50 ms, then rests 700 ms (`--dn-emblem-loop`); it stays upright with reduced motion. On the loading screen at twice its size, over the word, and on the credits screen. The app's icon on a phone and in a browser's tab is the same ball, still (decision 209). |
| `TitleScene` (`.dn-title-scene`) | The title screen: the den in its plain, the storm | Denborn's own, in the manner of a DS game's title screen (decisions 202 to 207, 210) | Layers from the back to the front: the plain, the light on its ground, the far rain, the rocks behind the light, the light and the bolts, the rocks in front, the near rain; then the name, on the screen. `intro` plays its steps once (the den in daylight, its light rising, a red bolt as the plain turns dark, the name, the storm); without it the storm is there at once. `still` holds everything: no intro, the rain hangs, no lightning. Without `lightning` the storm is rain alone, no bolt and no flash, and the name may be left out: that is the den a page shows on its top screen when it has nothing of its own there (`DenScreen`, decision 217). Everything but the name is hidden from assistive technology. Imported from its own file (`src/ui/title-scene.tsx`), not from the kit's one door: the home is among the screens every visit starts from. |
| `Wanderers` (`.dn-wanderer`, `.dn-denizen`), through `TitleScene`'s `cast` | The characters walking on the plain round the den: the top screen of the list of characters | Denborn's own (decisions 225 to 227, 229) | Up to five of the living characters, each a battle sprite under its nickname (size 10, outlined, cut past about twelve letters), half a pixel of the scene to a pixel of the sprite, in whole device pixels. Each comes in from out of sight off a bottom corner, stops not far from it, then walks from spot to spot and rests between two walks, a pixel of the scene at a time; it hops as it walks, is seen from behind when it walks away and from the front otherwise, mirrored to head the other way, and faces whoever looks when it stops. No foot is set on the den's rocks (`TITLE_DEN.footprint`); a walker is drawn among the scene's layers by the row its feet stand on, and passes behind the light. With more than five they take turns. The night dims the sprites (`--dn-title-night-sprite`), not the names. `still` stands them round the den, sprites held on one frame. Hidden from assistive technology: the list below names every character. Where they go is `src/ui/wander.ts`, pure and tested. |
| `Ghosts` (`.dn-ghost`), through `TitleScene`'s `cast` | A dead character, in the den's light | Denborn's own (decision 228) | One at a time. The sprite's first frame, one device pixel smaller per pixel than those who walk, tinted with the Ghost type's colour and given a glow of it, drawn again 20 times a second on a small canvas of its own: it rises from behind the rocks in front under its name, sways within the light, its rows waver, its glow comes and goes; near the top it breaks up by itself in squares that drift up, and its name, written on a canvas of its own as a name is on the plain, breaks up with it. `still` stands the first of the dead in the light, whole. No 3D library. What it looks like at a moment is `src/ui/ghost.ts`, pure and tested. |
| `.dn-title` | The app's name on the title screen | Denborn's own (decision 211) | VT323 at 40, gilded: four bands of gold cut to the letters, the ink outline, a deep-red shadow. It is the page's `h1`; the gilding is on its letters (`.dn-title__letters`), so that the heading's focus ring is drawn plain. |
| `.dn-start` | TOUCH TO START | The DS games' title screens (decision 205) | The whole black bottom screen is one button. Its words are there from the start for whoever reads them out, show once the storm has come, and go on and off once in 1.2 s; they stay on with reduced motion or the switch off. Its focus ring is drawn inside the screen. |
| `PokemonIcon`, `ItemIconImage`, `CategoryIcon` | Icons | Showdown, PokéAPI | Decorative unless given a label. `CategoryIcon` has a `compact` form: its symbol alone. |
| `TypeLabel` | A type's label | BW type labels | Drawn by the app in the type's two colours, with the type's name in the interface's language (decision 85). The size of the games' label, wider for a long name. |
| `TextField` | A line of text to type | B2W2 option boxes | Label above, a line of help or of what is wrong underneath, tied to the field for screen readers. |
| `NumberField` | A number to set | — | A slider for the large moves between a minus and a plus for one point at a time; the value in gold. The track fills in the EXP bar's colour. The owner of the value decides what is allowed: a value past the ceiling, or under the floor, does not take (the minus stops at the floor). |
| `.dn-facts`, `.dn-tags` | A summary, line after line; small things in a row that wraps | — | Used by the last look of creation and by the contents of an item pack. |
| `StatRow` | One stat: name, bar, value | BW summary | A stat raised by the nature is red with an arrow up, a lowered one blue with an arrow down, as in the games. |
| `StepHeader` | The title of a step of a flow | — | With "Step 2 of 7". It takes focus when the step changes, so the change is announced. |
| `.dn-foot`, `.dn-foot--said` | The foot of a screen that scrolls: its buttons, kept in sight | Denborn's own | BACK on the left, the main action on the right. With `--said`, a line of text sits over the buttons on the screen's black: the question they answer, or what the last one did or could not do (decisions 177 to 180). It stays at the bottom of the screen wherever the column above it is scrolled. |
| `.dn-credits`, `.dn-credit`, `.dn-anchor` | The credits: who, what of theirs is in the app, their pages | Denborn's own | The name in the colour of a slot's outline, what is theirs in the muted text, then links underlined in that same colour (`.dn-anchor`, the kit's link out of the app). A link is never smaller than `--dn-target-min`. |
| `Tabs` | A row of tabs and the part the current one shows | BW summary pages | Equal widths, the current one lit and underlined. The arrow keys, Home and End move between the tabs; the Tab key goes on to the part. Used by the character sheet. |
| `.dn-figures` | A small table of numbers | BW summary | Names on the left, figures on the right; the last column, the value, stands out from the figures it is made from. A stat its nature raises is red with an arrow up, a lowered one blue with an arrow down. |
| `.dn-table`, `.dn-cell` | A table of choices | The games' nature table | The natures: one stat raised per row, one lowered per column, the five neutral ones on the diagonal. |
| `.dn-camera` | The camera's picture on a top screen | Denborn's own | Fills the screen; a frame in the selection colour marks where to aim, and what lies outside it is dimmed. Nothing moves in it but the picture. |
| `.dn-join` | A session's join code on a top screen | Denborn's own | The code in the largest size, letters spaced, to be read out across a table; its QR code beside it; the campaign's name under it. |
| `QrCode` | A code as a QR code | — | Always black on white with its quiet border, as wide as its container. The finest shown is 101 × 101 squares (decision 99); for a longer text it shows what it is given instead, such as the way to the file. |
| `PaperQrCode` | The same QR code, for paper | — | Drawn as lines, not as a picture, so a printer keeps it sharp at any size. Same limit of 101 × 101 squares. |

### On paper

A character's sheet can be printed (decision 98). Paper is Denborn's own: the games print nothing. Its rules are in `src/ui/paper.css` (classes `dn-paper…`, tokens `--dn-paper…`):

- **Black on white, no backgrounds.** Browsers leave backgrounds out of a print unless told otherwise, so nothing on paper depends on one. A type or a category is a word in a box where the screen has a coloured label; no icon sheet is used. The Pokémon's sprite is the one picture.
- **Millimetres and points.** A sheet of paper has no DS pixel. Text is VT323 at 12 pt, small print at 10.5 pt, never smaller than 10 pt.
- **One page when it can.** A character with six moves and a dozen kinds of item fits one A4 page; a longer bag runs on to a second. No entry (a move with what it does, an item) is split by a page break.
- **Out of sight on screen.** The paper sheet is in the page all along and shows only in print, where it takes the place of the screens. The browser's own print command gives the same result as the app's button.
- **The QR code is drawn as lines** (`PaperQrCode`), 48 mm wide: at the finest code allowed (decision 99) one square is still about 0.44 mm.
- **Room to write.** HP and each move's PP change during play: an empty box beside each takes the new number in pencil (decision 106). The box is no taller than a line of text.

### The battle view

A session has four players or more, so the scene does not try to show every Pokémon at once (decisions 87 and 88). It is the games' own one-against-one view:

- **The scene** (top screen) shows one foe, upper right, and one ally, lower left, each with its HUD box in a `LineBrowser`. It opens on the viewer's own Pokémon and the first foe.
- **The battlefield** (touch screen, from the BATTLEFIELD corner button) is the `FieldPlan`, with the terrain and the weather named between the lines. It does not list everything: **MORE** opens `FieldEffects`, the list of all that is in effect, with whom each touches and the turns it has left ("3 turns left"). What sits on one Pokémon is there too, under its letter, and on its own sheet, where a changed stat reads "84 +2". A tap on a tile brings that Pokémon onto the scene and opens its sheet on the touch screen: HP, types, stats, Ability, held item, moves. BACK returns to the plan, then to the commands.

- **While a round plays**, the scene follows the action: each action brings its user and its target onto the scene (decision 91).

The sheet on the board is a mock: the real one is designed with the character screens (milestone 4). What each effect says it does is, for now, the description of the move that sets it; its proper wording comes with the battle screens.

**Choosing a round's action** (decisions 147 to 149), on the touch screen:

- The command screen has WAIT hanging from its top left corner as BATTLEFIELD hangs from the right, the party's order down the left of the ball and the timer down the right.
- A move that takes a target, a Bag item, RUN and SWITCH are aimed on the battlefield plan itself: the question is written between the two lines, only what can be picked is lit, and the rest is dimmed and cannot be pressed. For RUN, a dead ally's empty place can be pressed.
- An ask to an ally (RUN, SWITCH) shows as a question on that ally's touch screen; the one who asked sees that it is pending, with TAKE BACK.
- Once a player has locked, the touch screen is the party's list.
- The top screen's message says where the player stands: the prompt, ready, an ask, a target lost, no choice, time up.

**The game master's console** (decision 151) is two screens like a campaign's page (decision 214): the battlefield on its top screen, and the round as it stands scrolling inside the bottom one (the timer, each enemy and each player's Pokémon as a row saying what it has locked, the order of everyone). A tap on a row or on a tile opens that Pokémon alone, with DONE to come back. Whatever takes a target is aimed on the battlefield above, where the question is then written and only what can be picked is lit; CANCEL takes its place. A locked row is drawn confirmed; an enemy still to choose carries TO CHOOSE, a player who is away AWAY.

**A round told step by step** (decisions 91, 155 and 156): once everyone has locked, the top screen says the round one sentence at a time, in the games' own words (decision 154). Each step brings the Pokémon it is about onto the scene, the one acting first; the one acting lunges, the one hit recoils, and its HP bar moves then. The touch screen lists what was said so far, the newest last, with SKIP, which goes straight to the round's result and the commands; a tap on the message goes to the next step. Text goes at the speed chosen in the Options: slow, normal or fast, as in the games (25, 45 or 90 letters a second; a sentence stays 2.4, 1.6 or 1 second; the figures are Denborn's own). With reduced motion nothing slides or lunges and each sentence shows whole. The game master's console lists the last round's sentences under the order. An Ability that acts is named by a band on the scene (`AbilityBand`, decisions 165 and 167), in the words of the games' own band ("Arcanine’s Intimidate"): it slides in from its Pokémon's side, stays while the message band says what the Ability did, and is gone when the next move is announced; the list of what was said keeps it as a line. With reduced motion it appears in place.

**What is in effect** now comes from the fight itself: the terrain and the weather are named between the lines of the plan, each a label in a type's colours (Electric, Grass, Fairy, Psychic for the terrains; Water, Fire, Rock, Ice for rain, sun, sandstorm, snow), and MORE lists everything with the games' own names and descriptions in both languages (decision 154), the turns each has left as the engine counts them, and "×2" for what is laid twice. The game master's console lists the same under the order, one line each.

**The end of an encounter** (decision 162): END THE ENCOUNTER on the console opens a page like the others, the party on its top screen; below, one field of EXP per character, filled in by the app, and one of Pokédollars for each; a line under a field says when its EXP reaches a new level, or that the amount is not a whole number; BACK returns to the fight, AWARD AND END closes it. A player then reads on the session screen what their character received, with OK. A fight kept before the app closed that this version cannot play on is said on the hosting screen, with START IT AGAIN and END IT (decision 139).

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
| Press | The control sinks one or two DS pixels, or shrinks slightly; commands and moves also brighten. A menu button sinks two, brightens, turns its rim white and its Pokémon hops; let go, it springs back with a small overshoot (decision 224) | The same change, at once |
| A Pokémon enters | Slides in from its own side | Appears |
| It uses a move | Short lunge toward the foe | Nothing; the message says it |
| It is hit | Three hard blinks in 0.42 s | Nothing; the HP bar and the message say it |
| HP changes | The bar moves at a steady pace, recolouring on the way | Jumps to the new value |
| It is downed | Sinks 5 DS pixels, greys, and its sprite stops on its frame | Same end state, at once |
| It is out of the fight | Drops and fades | Disappears |
| A message | Typed out; "more" arrow bobs | Shown whole; arrow still |
| A badge arrives | Scales in with a small overshoot | Appears |
| The title screen's intro | The den in daylight for 0.8 s; its light rises in 1 s, one row of the scene at a time; a red bolt as the plain turns dark, 0.8 s; the name fades in, 0.6 s. Then rain falls, and red lightning strikes 2 to 5 s apart, at times twice, each flash 0.32 s | No intro: the storm is there, standing still. The rain hangs, the light holds its first frame, no lightning. The same when the Options' switch is off (decision 206) |
| TOUCH TO START | On and off once in 1.2 s | Stays on |
| A screen changes, its backdrop staying (a menu to a menu, the commands to the moves) | Its pieces fly out together, 0.16 s each and 10 ms apart: the title up over the top edge, each row by the left when going further in and by the right when coming back, each button by the side it is nearest to. The backdrop stays. Then the next screen's pieces fly in the same way, 0.28 s each and 30 ms apart from the top down, ten at most one after the other (decisions 218 and 219) | Replaced at once |
| A screen changes, and its backdrop with it (the den to a scene, a menu to the battle's touch screen) | Eight black stripes sweep in from the left and the right in turn and close over the screen, 0.16 s each and 12 ms apart; they sweep on off the next one | Replaced at once |
| The same screen on the next page (the den) | Carries on untouched: its rain goes on falling while the other screen changes | The same |
| A character comes onto the plain (decision 225) | From out of sight off a bottom corner, the first at 48 pixels of the scene a second and at once, the others at 24, 0.7 s apart, by one corner then the other; it stops within 90 pixels of where it came in. Seen from behind as it walks away, it hops, about three hops a second, and turns to face you when it stops | It stands in its place by the den, its sprite held on one frame |
| It roams, and leaves | A walk to another spot, round the den, then a rest of 1 to 4 s. When it is its turn to go, or the list is left for the home, it leaves by the nearer bottom corner at 48 pixels a second, then is taken away | Stays where it stands; taken away at once |
| A dead character's ghost (decision 228) | Rises from the den's base in 6 s, a row of the scene at a time, swaying once in 2.6 s, its glow coming and going once in 1.6 s; it breaks up over the last third. The first 2 s after the scene is there, the next 6 to 10 s after the last has gone | The first of the dead stands in the light, whole |

A screen's change is Denborn's own, after the games' battle menu, where the commands fly out and the moves fly in, and after the stripes that sweep across before a fight. It is played by `src/ui/screen-motion.ts`; a piece that comes takes `--dn-move`, one that goes and a stripe take `--dn-quick`, and the gaps between them are `SCREEN` in `src/ui/motion.ts`. What counts as a piece is listed there: a new layout adds its own. A menu and a blank screen have the same black backdrop; the battle's touch screen, a scene and the den each have their own.

The title screen's lengths are apart from the tokens above: `TITLE` in `src/ui/motion.ts` and the `--dn-title-*` durations, kept equal by the same test. Its steps are in `src/ui/title-intro.ts`, and when and where lightning strikes in `src/ui/storm.ts`. The paces, rests and turns of the characters on the plain are `WANDER` in `src/ui/wander.ts`, a ghost's sway, glow and breaking up are `GHOST` in `src/ui/ghost.ts`; its rise is `TITLE.ghost` and a hop is `--dn-title-hop`.

Rules:

- Everything moves (decision 218), and a change of screen is never a fade (decision 219): if a Pokémon game never did it that way, it is not done.
- Animate `transform`, `translate` and `opacity`. The one exception is the grey of a downed Pokémon, a short filter change on one sprite. A screen's pieces move by `translate`, so that a piece's own `transform` is left alone.
- Never wait for an animation before sending a command. A round's playback can be skipped. A screen that goes out is out in about 0.2 s, and the next can be pressed as soon as it is there.
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
| MissingNo., in the place of a sprite that is not there | "MissingNo. GIF" by Pokemon-Ranger-Sumi, prepared for the app (see `CREDITS.md`); kept in the repository | 45 × 50 | `PokemonSprite`, by itself |
| The title screen's plain | Showdown's meadow, `fx/bg-meadow.png`, drawn by Kyle Dove; served at 753 × 500 and taken back to its own pixels by the scene | 238 × 158 | `TitleScene` |
| The den of the title screen: its rocks in two layers, what its light changes on them and on the ground, and the light's eight frames | Drawn by the project as rectangles (`scripts/assets/draw-den.ts` writes `public/den-*.svg`); kept in the repository | 128 × 60 on the plain's pixels; the light 54 × 135 a frame | `TitleScene` |

Type labels are not artwork: the app draws them (`TypeLabel`), so they can be in French. Paths are built only by `src/data/sprites.ts`, from what the data pack, the sprite lock and the backdrop lock say exists; a name is never guessed. Order of fallback for a battle sprite: Gen 5 animated, then Showdown's `ani` set, then MissingNo. (`public/missingno.gif`, 45 × 50, animated; decisions 181 and 185 to 188), which also stands in while a device has not fetched a sprite yet; it is mirrored for a Pokémon seen from behind, and read out by the Pokémon's own name. Only if MissingNo. itself cannot be shown is the name shown as text.

## 8. Accessibility

Every screen built on the kit must hold to this. The kit's own pieces were checked in a browser on 2026-11-14 (reduced motion, keyboard focus, target sizes); a full audit with real assistive technology is part of the release milestone.

- **Targets**: no control under 44 × 44 px, whatever the scale.
- **Focus**: one ring for everything, white inside dark, never clipped. Order follows reading order. When a screen replaces another just after a press or a key, the focus goes to the title that came in, or with none to the first control of the bottom screen (commands to moves); the frame does it (`DualScreenFrame`). A screen that changes by itself, long after the last press, moves no focus. A screen that is going out cannot be pressed, tabbed to or read.
- **Keyboard**: every action works with Tab, Enter and Space. Nothing needs a drag.
- **Names**: a sprite or icon next to its name is decorative; alone, it carries a label. Meters expose their values. Status badges carry the condition's full name.
- **Announcements**: battle messages are read whole, once, politely. The typewriter is for the eyes only.
- **Colour**: no state rests on colour alone. Text over the scene has an outline, text on colour a shadow. Text reaches 4.5 to 1 against what is behind it (decisions 196 to 198): four colours measured on the games were moved a shade for that (`--dn-text-muted`, `--dn-option-selected-band`, `--dn-slot-ok`, `--dn-status-par`; each token says what was measured), and text never sits on a row's arrows, which are brighter than its middle. Axe checks what a machine can in the browser tests; text over a painted shape was measured by hand.
- **Motion**: everything in section 6's right-hand column.
- **Enlarging**: pinching on a phone is never blocked. In a browser on a computer the DS is already as large as fits in the window, so enlarging the page does little at first; once the DS would be narrower than 20rem it is not made smaller, the window scrolls, and everything grows with the page (twice its size at 300% in a window of 1280 × 800). Nothing is hidden at any size.
- **Language**: components receive their words; none is written in a component.

## 9. Ruled by the owner on the board (2026-11-14 and 15)

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
| 100 | The home: the app's name over three Pokémon; Characters, Campaigns, Options. Its top screen is now the title screen (decision 203, below), and its ways in the menu of decision 221. |
| 101 | Character creation in seven steps: Pokémon; name, gender, nature and Ability; roleplay attributes; IVs and EVs; moves; item pack; a last look. |
| 102 | Menus and forms: the top DS screen stays, the lower one is as long as its content and scrolls. Replaced by decisions 214 to 216, below. |
| 103 | The character sheet: the Pokémon, its battle box and types on the top screen; five tabs below (INFO, STATS, MOVES, BAG, SHARE). |
| 104 | A dead character on its sheet: sprite still, HP at 0, a plate that says DEAD / MORT. |
| 105 | The sheet on paper: one page, black on white; head, identity and attributes, combat stats with the QR code, moves, items. |
| 106 | On paper, an empty box beside the HP and each move's PP, to pencil in what changes at the table. |
| 107 | A character coming in that is already here: both copies shown, which is more recent, REPLACE or KEEP THE ONE HERE. |
| 108 | The import screen: three ways in (file, link or code, QR code scanned with the camera on the top screen); what was read is shown before it is kept. |
| 109 | IMPORT sits in the foot of the Characters list, between BACK and NEW. |
| 110 | Removing a character is confirmed on a screen of its own, which offers its file first. |
| 111 | The way to remove a character is at the end of its sheet's SHARE tab. |
| 112 | The species picker's filters: stage of evolution, base stat total, Legendary and Mythical, type. |
| 113, 115 | A campaign's page: one row per rule, each opening its rule alone; the creation link and its QR code under the rules once saved. |
| 114 | Starting level 5 and 3000 Pokédollars are shown before the game master sets them. |
| 117, 118 | Importing and removing a campaign follow the characters' screens: IMPORT in the list's foot, shown before kept, both copies when already here; removal confirmed with the file offered first. |
| 124, 125 | Hosting a session: the join code in large letters with its QR code on the top screen, COPY THE LINK, the requests with the two-copies pick, the party with REMOVE behind a tap. |
| 126 | Joining a session: the code, the characters made for the campaign, the wait, the party, a sentence for each way of being out. |
| 128 | On the join screen, CREATE A CHARACTER sits under the characters to choose from, and is put forward when there is none. |
| 129 | In the species picker, KEEP ONLY THE SHOWN makes the Pokémon shown the playable ones in one tap; ADD THE SHOWN and REMOVE THE SHOWN build a list in several passes. |
| 127 | HOST A SESSION sits on a saved campaign's page, above its creation link. |
| 147 | The battle on a player's phone: a target, a Bag item's target, an ally for RUN or SWITCH are picked on the battlefield plan; the Bag is a list; an ask is answered on the ally's own phone; a Pokémon's sheet opens from the battlefield. Its wording in both languages is the board's. |
| 148 | WAIT hangs from the top left corner of the command screen. One tap locks it. |
| 149 | The party's order is a column down the left of the ball, with a tick on who has locked; a tap opens the party's list, which takes the commands' place once the player has locked. |
| 151 | The game master's console: the battlefield on top, the round below, a Pokémon opened by a tap; targets aimed on the battlefield. |
| 152 | On the hosting screen, a tap on an encounter shows LAUNCH and PREPARE. |
| 155, 156 | A round is told step by step on the top screen, with the list of what was said and SKIP below; the text's speed is slow, normal or fast, chosen in the Options. |
| 162 | The end of an encounter: one EXP field per character and one amount of Pokédollars for each, AWARD AND END; a player reads one sentence with what their character received. |
| 164 | An enemy's PP Ups: a row under its moves, each move from none to three, the PP it then has said under it. |
| 165, 167 | An Ability that acts is named by a band on the scene, from its Pokémon's side: a foe's from the right in red, an ally's from the left in blue. |
| 171, 175, 176 | In a fight, BAG lists the player's own items, then one titled list per teammate who is downed or dead ("Mousse’s Bag"), in the same scrolling list (`.dn-roster__group`). On the battlefield a dead Pokémon's tile lights up for a revival item, and for nothing else. |
| 177 | On the session screen, "Your character": one row per thing the player can do between two fights (POKÉMON CENTER, PLACE POINTS, EVOLVE, BAG), each shown only while it applies, BAG always; a notice with OK for what the game master gave or took. |
| 178 | Placing points: sliders that start where the sheet has each total, the stats as they would be on the top screen. PLACE and EVOLVE ask to confirm over the buttons, the safe answer highlighted. |
| 179 | The Bag outside a fight: a tapped item shows USE, HOLD or TAKE under it; who it is used on is a list of the party where those it would do nothing for are dimmed. The Pokémon Center: the Ability, then the moves with the known ones first. |
| 180 | The hosting screen: a tapped member shows REST, GIVE OR TAKE and REMOVE FROM THE SESSION; GIVE OR TAKE is a page of its own with the character on the top screen. |
| 181, 185 to 188 | A battle sprite that is not there shows MissingNo., animated, at its own 45 × 50 pixels; mirrored for a Pokémon seen from behind. |
| 182, 183 | The home screen said how far the app is from working offline, in a line under the ways in, and offered a new version above them. Since decisions 221 and 222 that state is in the Options only, and the home's offer is the menu's UPDATE button. |
| 191 to 194 | The app's emblem was the den, its light animated (replaced by decision 212). |
| 209 | The app's still icons (a browser's tab, an iPhone, Android) are the pink grid ball seen from the front, with a margin, on the ground of the Pokémon Black icon: black, a chequer of blocks that darkens downwards. |
| 212 | The app's emblem inside the app is the pink grid ball of decision 209, rocking left and right then resting, as a Poké Ball shakes in the games. |
| 203 to 207, 210, 211 | The home's top screen is the title screen: the den in Showdown's meadow and nothing else, the app's name gilded a little above the middle. Each time the app starts its intro plays over a black bottom screen (the den in daylight, its light rising, a red bolt as the plain turns dark, the name, then rain and red lightning at uneven gaps); TOUCH TO START / TOUCHEZ POUR COMMENCER shows once the storm has come, and one tap at any moment puts the menu in its place, the storm going on above it. The Options hold it still ("Title screen animation", ON / OFF; OUI / NON). On the home screen this replaces the three Pokémon of decision 100 and the den's tile of decision 194. |
| 184, 195 | The credits are a screen of their own, opened by a CREDITS button in the Options (and no longer on the home: decision 221): the app's emblem, a sentence on what the project is, then people and teams, each with what of theirs is in the app and links to their pages. No list of packages. |
| 199, 200 | A type's label and a move's button: their white letters edged all around in the type's dark shade. |
| 196 to 198 | For contrast: the muted grey a shade lighter and the main button's band a shade deeper; text clear of a row's arrows, a selected or confirmed row's second line as bright as its first, the confirmed green a shade deeper; the panel beside a Pokémon darker with a lighter red for a raised stat, the PAR badge a shade deeper. |
| 214 to 216 | Every screen of the app is two separate DS screens, one over the other, each exactly 4:3 and each showing its own thing; together they are never taller than the window, which does not scroll, and a phone taller than them shows black above and below. What is longer than the bottom screen scrolls inside it. |
| 217 | A page that had no top screen (the Options, the credits, five screens that tell of a failure) shows the title screen's den there: at night, in the rain, without the name, without a bolt or a flash. |
| 218, 219 | The app always moves, as a video game does, and never feels like going from one page to another: the two screens stay, a screen that is the same on the next page carries on, and one that changes moves out and in. Never by a fade. |
| 220 | The loading screen: the menu's black with its plus marks on both screens, the rocking ball over the word on the bottom one. |
| 221 | The home's menu: a grid of four rows of two on the bottom screen. CHARACTERS (yellow, Pikachu) and CAMPAIGNS (red, Eternamax Eternatus since decision 231); JOIN (brown, Falinks) and OPTIONS (blue, Porygon); ACCOUNT and UPDATE; a row left empty; the notice in a line under the grid. One word a button, after its Pokémon, everything from the left. |
| 222 | UPDATE is a button of the menu: a dimmed grey, with Unown as a question mark, while no new version waits; lit, with Unown as an exclamation mark, once one does. |
| 223 | ACCOUNT (purple, Mega Starmie) opens a screen of its own, whose tools are to come: downloading what the device keeps, exporting and importing saves. |
| 224 | A menu button held down sinks, lights up, turns its rim white, and its Pokémon hops; let go, it springs back. |
| 230 | A menu button's background is a plate in its colour: two flat halves, the upper one a shade lighter, a faint checker on the lower one, in a party slot's rim. A round shadow under each Pokémon, as on the field. Pokémon and words larger. |
| 231 | CAMPAIGNS carries Eternamax Eternatus, in place of Mega Heatran. |
| 232 | A menu button's Pokémon is small, and as large and at the same place on every screen; Eternamax Eternatus a little smaller than the others. |
| 233 | UPDATE has the shape of the old button that offered a new version, pointed at both ends, as large as its cell; Unown is the last letter of its word, as tall as the letters: UPDATE ?, then UPDATE !. |
| 234 | The notice under the home's menu is a paragraph: justified, the last line from the left, words cut at the end of a line in the page's language. |

Any change to these is a new ruling. Anything the system does not cover yet (section 5, last paragraph) is shown on the board and ruled before it ships.
