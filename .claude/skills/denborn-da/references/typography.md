# Type

## The games

- Names and levels in the HP boxes: capitals about 7 to 8 px tall, white `#f3f3f3` with a 1 px outline `#181818`.
- Messages: capitals about 10 px tall, lines 16 px apart, white with a 1 px grey shadow down and right, two lines in a band 45 px tall.
- "Lv." and "HP" are small gold labels; HP numbers and the "HP" on the plate are slanted.
- Command labels are capitals with a dark outline; FIGHT is larger, red.

## The candidates (none chosen yet)

All SIL Open Font License 1.1, installed from Fontsource as development dependencies for the board only. Measured in Chromium at 100 px: capital height, x-height, average letter width in a French sentence.

| Font | Capitals | x-height | Width | `--dn-font-scale` | Notes |
|---|---|---|---|---|---|
| DotGothic16 | 81.5 | 56.8 | 51.1 | 1 | Thin one-pixel strokes, closest to the games' weight; Latin letters sit in fixed cells, so spacing is uneven ("Lév iator"). |
| VT323 | 56 | 40 | 40.9 | 1.4 | Heavier and very readable; a terminal face. |
| Pixelify Sans | 63.1 | 45 | 49.7 | 1.25 | Stylised; "a" reads as "o" at small sizes. |
| Tiny5 | 62.5 | 50 | 44.3 | 1.3 | Five-pixel capitals: coarse at these sizes. |

The scale gives each the same capital height as DotGothic16 at scale 1, which matches the games' sizes at the kit's 10 and 12.

When the owner chooses: set `--dn-font` and `--dn-font-scale` in `tokens.css`, move that font's package to `dependencies`, import only its `latin` and `latin-ext` files, remove the other three, credit it in `CREDITS.md`, and re-check every story.

## French

Accents are where pixel fonts fail. Every text piece is checked with: é è ê ë à â ç ù û ü î ï ô œ É È À Ç Œ « » and the narrow space before ! and ?. French runs about a fifth longer than English: check buttons and the message band in French first.
