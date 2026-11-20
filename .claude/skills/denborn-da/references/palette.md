# Measured colours

Read with `tools/sheet-colors.ts` on the sheets in `tmp/`. The token names are those of `src/ui/tokens.css`, which is the single source of truth for values; this file records where each was read, so that it can be checked again.

## B2W2 "HP Bars" sheet

| What | Value | Token |
|---|---|---|
| Box frame | `#101010` | `--dn-ink` |
| Black 2 box body, two-colour checker | `#181818`, `#303030` | `--dn-panel`, `--dn-panel-2` |
| Hard shadow under and right of a box (2 px) | `#495151` | `--dn-panel-edge` |
| White 2 box body | `#c6c6c6`, `#adadad` | `--dn-panel-light`, `--dn-panel-light-2` |
| Text, and its shadow | `#f3f3f3`, `#9a929a` | `--dn-text`, `--dn-text-shadow` |
| Outline around names over the scene | `#181818` | `--dn-ink-soft` |
| HP green, light and shade | `#00fb49`, `#008a28` | `--dn-hp-high*` |
| HP yellow | `#f3b200`, `#9a6110` | `--dn-hp-mid*` |
| HP red | `#fb3041`, `#922030` | `--dn-hp-low*` |
| EXP | `#00baf3`, `#00799a` | `--dn-exp*` |
| "Lv." and "HP" gold | `#f3b200`, `#9a6110` | `--dn-label-gold*` |
| Male mark, female mark (example boxes) | `#00baf3`, `#fb3041` | `--dn-male`, `--dn-female` |
| Status: SLP, PSN, bad PSN (and its text), BRN, FRZ, PAR | `#4a4a4a`, `#6b2942`, `#391042` (`#d631de`), `#b50000`, `#005a8c`, `#ad6b00` (used: `#a56600`, see "Moved for contrast") | `--dn-status-*` |

Example boxes (sheet rows 254 to 273): the name and level sit just above a plate 9 px tall for the foe, 13 px for the player (with the HP numbers); frame 1 px, shadow 2 px.

## BW "Party Screen" sheet

Read at the middle row of each slot (y = 222, 270, 318), at x = 10 (left band), 60 (middle), 118 (right band), and about 130 px further right on the first row for the selected slot.

| State | Left band | Middle | Right band | Outline |
|---|---|---|---|---|
| Normal | `#386890` | `#002038` | `#004060` | `#88f8f0` |
| Selected | `#00a8f8` | `#086890` | `#0088d8` | white over `#48f8f0` (the kit draws white) |
| Fainted (Denborn: downed) | `#a84028` | `#601810` | `#801010` | `#f88898` |
| Confirmed | `#10d8b0` | `#088068` (used: `#087a63`) | `#08c0a0` | white |

The bands are split by two arrowheads pointing left; the corners are cut at 45°.

## B2W2 "Options Screen" sheet

| What | Value | Token |
|---|---|---|
| Backdrop, and its plus marks | `#000000`, `#183931` | `--dn-backdrop`, `--dn-backdrop-mark` |
| Unselected button, and its text | `#393952`, `#9c9cad` (used: `#a8a8b8`) | `--dn-option`, `--dn-text-muted` |
| Selected button, upper band and body | `#088cb5` (used: `#07749a`), `#085a8c` | `--dn-option-selected-band`, `--dn-option-selected` |
| Selected button's outline | `#63b5b5` | `--dn-select-line` |

## BW "Battle HUD" sheet

| What | Value | Token |
|---|---|---|
| Tile greys | `#393939`, `#424242`, `#313131`, `#292929` | `--dn-tile*` |
| Tile rim | white; thin lines `#737373` | `--dn-text`, `--dn-tile-line` |
| Labels: FIGHT, BAG, RUN, POKéMON | `#ce0039`, `#ffb529`, `#29bdf7`, `#73ff52` | `--dn-cmd-*` |
| Touch-screen background | `#4a3939`, `#423131` | `--dn-shell*` |
| Ball red, and its lighter crescent | `#9c0021`, `#b50029` | `--dn-ball-red*` |
| Ball white, and its lighter crescent | `#cecee7`, `#dedee7` | `--dn-ball-white*` |
| Message band (example screen, sheet rows 465 to 467) | scene × 0.4; top line adds red 73, second line red 31 | `--dn-message-*` (black, `#7a0200` and `#340200` at 60%) |

BW's own HP bar colours (green `#00ff4a` / `#00bd21`, yellow `#eaff00` / `#adbd00`, red `#ff0000` / `#bd0000`) were measured too and are not used: the HUD follows Black 2.

## Types

Fill and shade of each BW type label, as published in PokéAPI's sprite repository; Fairy from Showdown's label. Values in `tokens.css` (`--dn-type-*`).

## Moved for contrast (2026-11-16, decisions 196 to 198)

Four measured colours fell short of 4.5 to 1 with the text they carry, and were moved a shade. The tables above keep what was measured; the tokens hold what is used.

| Token | Measured | Used | Why |
|---|---|---|---|
| `--dn-text-muted` | `#9c9cad` | `#a8a8b8` | 4.1 to 1 on an unselected button's grey; now 4.8 |
| `--dn-option-selected-band` | `#088cb5` | `#07749a` | white text crossed it at 3.5; now 4.8 |
| `--dn-slot-ok` | `#088068` | `#087a63` | white text at 4.4; now 4.8 |
| `--dn-status-par` | `#ad6b00` | `#a56600` | its white letters at 4.3; now 4.7 |

A row's arrows (`…-band`, `…-tail`) are brighter than its middle and are not moved: text keeps clear of them instead. Before adding a text colour or a ground, work out their contrast; axe cannot see a ground painted by `::before` or `::after`.

## The Pokédex (decision 287)

Measured on Xtreme1992's rip of Black and White's Pokédex (`tmp/DS _ DSi - Pokemon Black _ White - Miscellaneous - Pokedex.zip`, `pokedexbg/example_bottom.png`, drawn at twice its size). The shapes are kept; the green is turned to blue and what is lit is red, as the owner asked.

| What | Measured | Denborn's |
|---|---|---|
| A square of the grid, 8 pixels; its lines, 1 pixel | `#08b57b`, `#008463` | `--dn-dex-ground` `#0860a8`, `--dn-dex-ground-line` `#004a8c` |
| The dark band across the top | `#315a10` | `--dn-dex-ground-deep` `#062c52` |
| A row: 21 tall on a pitch of 24, a point of 4 at its left end, a slant of 7 at its right one (a pixel in every three rows) | `#181818` | `--dn-dex-bar`, the same; lit, `--dn-dex-bar-lit` `#0a3a6b` in a rim `--dn-dex-bar-line` `#8cc8ff`, Denborn's own |
| The brackets round an icon: 3 wide, 4 deep, 19 tall, in three greens | `#397b08`, `#94ef18`, `#63b510` | `--dn-dex-bracket-dark` `#0a4f94`, `--dn-dex-bracket-light` `#8cc8ff`, `--dn-dex-bracket` `#1a8cff`; red (`--dn-dex-accent`) on a lit row |
| The plate behind the sprite: a checker of two greys between two bright lines | `#6b6b6b`, `#636363`, dots `#848484` | `--dn-dex-slab` `#52637b`, `--dn-dex-slab-2` `#44546b` |
| The rail: 5 pixels, dark, light, dark | `#007352`, `#292929`, `#08b57b` | the grid's line, `--dn-dex-chrome`, `--dn-dex-bracket` |
| The bar of keys, under a black line; a key's mark | `#292929`, `#b5b5b5` | `--dn-dex-chrome`, `--dn-dex-key`, the same |
| Keys lit as the way on is, in other colours (decision 298): a lighter upper half, a darker lower one | blue: the selected party slot's `#0088d8`; the games have no grey key | `--dn-dex-key-blue-light` `#0078c0` (a shade deeper, for 4.5 to 1), `--dn-dex-key-blue` `#003c78`, rim `--dn-dex-bar-line`; grey: a checker of `--dn-dex-key-grey-light` `#737373` and `--dn-dex-key-grey-light-2` `#5a5a5a` over `--dn-dex-key-grey` `#393939`, rim `--dn-menu-grey-line`. Denborn's own |
| The row that makes a new campaign (decision 299) | the selected slot's greens, `#088068` measured, rim `#10d8b0` | lit: `--dn-slot-ok` `#087a63`, rim `--dn-slot-ok-band`; at rest `--dn-dex-fresh` `#0b3a2c` in a rim `--dn-slot-ok`, Denborn's own |
| The bar's red cross and blue arrow | `#ff3921`, `#088cff` | `--dn-dex-accent`, `--dn-dex-blue`, the same |
| The Poké Ball mark of a row | `#e73131`, shade `#8c3131` | not drawn: a lamp in its place, `--dn-dex-accent` once lit, shade `--dn-dex-accent-shade` |
| Text on a row and its shadow | `#dedede`, `#848484` | the kit's `--dn-text` |

Contrast of white text (`--dn-text`): 5.8 to 1 on the grid, 16 on a row, 10.3 on a lit row, 12.7 on the deep blue, 13.1 on the bar of keys. The quiet text (`--dn-text-muted`) reaches 4.5 only on the dark ones (7.6 on a row, 6.0 on the deep blue), not on the grid (2.8): words on the grid stand on a dark plate. The Pokédex's case is the great ball's reds (`--dn-ball-red`), as the menu's red button. The six roleplay colours (`--dn-attr-*`) are six type labels' fills and shades (Fire, Grass, Dragon, Water, Psychic, Electric), lettered as a type label is.

