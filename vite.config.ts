import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

interface PackageJson {
  version: string
  dependencies: Record<string, string>
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as PackageJson
// The artwork's version: the lock file names every sprite with its checksum, so other artwork gives another value.
const spritesVersion = createHash('sha256').update(readFileSync(new URL('./data-sources/sprites.lock.json', import.meta.url))).digest('hex').slice(0, 12)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __ENGINE_VERSION__: JSON.stringify(pkg.dependencies['@pkmn/sim']),
    __SPRITES_VERSION__: JSON.stringify(spritesVersion),
  },
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      // A new version waits until the user accepts it; it is never applied mid-battle.
      registerType: 'prompt',
      injectRegister: false,
      // The glob below already covers the icons; listing them twice duplicates precache entries.
      includeManifestIcons: false,
      manifest: {
        name: 'Denborn',
        short_name: 'Denborn',
        description: 'A fan-made Pokémon tabletop RPG companion.',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#101018',
        theme_color: '#101018',
        // Provisional icon; the real set comes with the art direction (milestone 3).
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // The first stage of working offline (decision 181): the app, the game data, the icon sheets and the
        // battle engine. Workbox's defaults skip images and anything over 2 MiB, which would leave the engine out.
        // (The plugin adds the web manifest itself.)
        globPatterns: ['**/*.{js,css,html,wasm,json,svg,png,gif,woff2}'],
        // The second stage: the battle sprites, some 350 files, are not part of the install. The page fetches them
        // in the background into a cache of their own (src/pwa/sprite-cache.ts), and this route serves them from it.
        globIgnores: ['**/node_modules/**/*', 'sprites/**/*.gif'],
        runtimeCaching: [{ urlPattern: /\/sprites\/.+\.gif$/, handler: 'CacheFirst', options: { cacheName: `denborn-sprites-${spritesVersion}` } }],
        maximumFileSizeToCacheInBytes: 24 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/ws\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
