---
name: denborn-da
description: Denborn's art direction (Pokémon Black/White, Gen 5). Use whenever you build, change or review any Denborn screen, component, colour, font, icon, sprite use or animation, in src/ui or in a feature's interface, and before adding any new visual element.
---

# Denborn DA

Denborn looks and feels like Pokémon Black / White and Black 2 / White 2. The rule book is `DESIGN.md` at the root of the repository; the kit is `src/ui/`; the board is Storybook (`pnpm storybook`, port 6006). Read `DESIGN.md` first. This skill says how to work with it.

## Before you draw anything

1. **Look for it in the kit.** `src/ui/index.ts` lists every component. A screen is assembled from them, inside a `Screen`.
2. **If the kit lacks it, look at the games.** Find the piece on a reference sheet (`references/sources.md`), measure it (below), and redraw it in CSS or SVG. Never copy pixels from a sheet, and never commit a sheet.
3. **If the games have no such thing** (Agony, the GM's console, anything Denborn adds), design it in the same language, mark it "Denborn's own" in the tokens and in `DESIGN.md`, show it on the board, and ask the owner before it ships. The owner decides how things look; a missing reference is not permission to decide.

## Rules that are easy to break

- **Sizes in DS pixels**: `calc(N * var(--dn-u))`, text in `var(--dn-t)`. No px, rem or vw inside a `Screen`, except the 44 px touch target (`--dn-target`).
- **Tokens only**: no colour, duration or easing written in a component. Add a token, with where it was measured.
- **No words in components**: text comes through props, from the app's dictionaries (`src/i18n/`), in English and French. Wording the owner has not approved is shown on the board first.
- **Type labels are drawn** (`TypeLabel`), never an image: Showdown's are English only.
- **Sprites and icons come from Showdown** through `src/data/sprites.ts`. Never guess a file name; never use an emoji or a generic icon where a game graphic exists.
- **Pixel art on whole device pixels**: use the components' `scale`, never a CSS width on a sprite.
- **Shaped controls are painted by ::before and ::after**, so the element is never clipped and its focus ring shows. Do not put `clip-path` on something that can take focus.
- **Motion explains, never decides**: use the tokens and `src/ui/motion.ts`; give every animation its reduced-motion form; never wait for an animation before accepting input.
- **Every new piece gets a story**, at phone width first, in both languages.

## Measuring a reference sheet

The sheets are in `tmp/` (git-ignored; the owner put them there). To read colours or the rows of a shape:

```sh
node .claude/skills/denborn-da/tools/sheet-colors.ts "tmp/<sheet>.png"                 # size, most used colours
node .claude/skills/denborn-da/tools/sheet-colors.ts "tmp/<sheet>.png" x y w h         # one rectangle
node .claude/skills/denborn-da/tools/sheet-colors.ts "tmp/<sheet>.png" x y w h --rows  # each pixel row, left to right
```

Record what you measured in `references/palette.md` or `references/battle-layout.md`, then add the token.

## Checking your work

- `pnpm storybook`, then look at the story at phone width (about 390 to 412 px, and 320 px) and at tablet width, in English and French.
- Tab through it: the focus ring must show on every control. Turn on "reduce motion": nothing may slide, blink or animate, and nothing may be lost.
- `pnpm verify` before reporting.

## References

- `references/sources.md` — the sheets, what each shows, who ripped them, and which sources cannot be fetched.
- `references/palette.md` — every measured colour and where on the sheet it was read.
- `references/typography.md` — the games' letter sizes, the font and how it was chosen.
- `references/battle-layout.md` — the geometry of the games' battle screens and how Denborn maps it to a phone.
- `references/components.md` — how the kit is built and how to add to it.
- `references/motion.md` — the motion vocabulary and how to script it.
- `references/showdown-assets.md` — which graphics come from where, their sizes and how they are addressed.
