---
paths:
  - "src/features/gm/**/*.{ts,tsx}"
  - "src/features/characters/**/*.{ts,tsx}"
  - "src/features/campaigns/**/*.{ts,tsx}"
---
# GM and player experiences

- GM may create campaign, set rulings/level/species allowances, generate an **offline-usable** character-creation link, collect player characters, prepare encounters, set enemy Pokémon/positions, launch/end combat, manually choose enemy actions and manual extra turns, pause timer, save/export/reload.
- Player creation works with no GM connection and no backend stored record; creation settings are encoded in a self-contained safe link/data pack reference, with bounded URL size. Local characters can be imported by sheet QR and JSON file and later joined to a campaign.
- Keep live room code/QR separate from offline character-creation rules link. Host must be online to conduct a live battle; opening a rules link must not create a live room.
- Player UI includes six Moves, Bag, Run and Switch, visible enemy positions and player-owned info; GM UI includes prepared encounter launch, all combat states and enemy action entry.
- Character sheet export mirrors the same character data used by in-app calculations; print/QR text should present roleplay reminder and playable reference without demanding a smartphone during narrative moments.
- Validate campaign rules against species/forms/levels before character export. On sync never silently overwrite another copy; reconcile owner and version first.
- Present pending GM actions and disconnections with honest states and non-blocking recoverable UX. Never pretend that a player action was accepted before GM confirmation.
