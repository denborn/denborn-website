---
paths:
  - "src/**/*.{tsx,jsx,css}"
  - "public/**/*.{html,css}"
---
# Accessibility — RGAA, WCAG, WAI-ARIA

- Target WCAG 2.2 AA best practices; consult the applicable official French RGAA reference (checked RGAA 4.1.2) and recheck its version before release. Do not claim RGAA conformance without a manual audit.
- Prefer native semantic `button`, `a`, `label`, `input`, `select`, `dialog`, proper headings and landmarks; **no ARIA is better than incorrect ARIA**. Never use clickable `div` for basic controls.
- All actions usable by keyboard and touch; clear visible focus, meaningful labels, predictable tab order, Escape handling for modals, no keyboard traps, correct focus restore.
- Sprite icons are decorative when adjacent text names the Pokémon/move/item (`alt=""`); image-only controls need accessible names. Pokemon identity, turn status and target info must be announced as text, not color or sprite alone.
- Live combat notifications should be concise and appropriately prioritized (`aria-live="polite"` for updates, assertive only for urgent actionable errors). Do not continuously announce clock ticks.
- Turn timer has an accessible remaining-time text and pause state; users need sufficient time, but **do not alter game timer rules without owner approval**. Surface an accessibility owner decision if time-limit exceptions are needed.
- Target selection, position reordering and initiative swaps must work with non-drag methods and screen reader announcement; never require pixel drag precision.
- Maintain readable contrast including HP bars, move types and disabled states; 200%/400% zoom and mobile landscape must not hide controls.
- Motion accessibility includes reduced motion, avoiding flashes and providing stop/pause for nonessential looping animations.
- Test with browser keyboard, VoiceOver on iOS, TalkBack on Android, and a screen reader on desktop. `axe` helps automate checks but cannot prove conformance.

Sources: https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/ ; https://www.w3.org/TR/WCAG22/ ; https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
