---
paths:
  - "src/**/*.{tsx,css}"
  - "public/**/*.css"
---
# Pixel-art UI, responsiveness and visual quality

- Build a coherent Gen 5-inspired visual language: pixel-art sprites, appropriate pixel-perfect scaling, game-style panels, battle lines, typography and item icons. Do not use generic Lucide/emoji/stock icons as replacements when Pokémon-style sprites exist.
- UI assets and combat logic are separate. Use a versioned sprite manifest, not guessed filename interpolation for forms or genders.
- Distinguish player and GM views; prioritize the active player's six moves, Bag, Run and Switch actions over decorative elements.
- Optimize for 320px-wide devices, tablet and desktop; use flexible CSS layout and safe-area insets for iPhone home-screen mode.
- Use native legible text for all essential game data; pixel fonts can be headings but not tiny critical numeric text.
- Provide clear hover/focus/pressed/selected/locked/cooldown/disabled/error states. Non-color signals required.
- Preload only likely-needed battle assets, use dimensions to prevent layout shift, consider devicePixelRatio and `image-rendering: pixelated` only when appropriate for source images.
- Keep the combat timeline responsive without blocking commands on transitions, extra sound or sprite loading.
- Check animation smoothness and hit target size on real touch hardware, not only desktop browser devtools.
