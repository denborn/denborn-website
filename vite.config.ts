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

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __ENGINE_VERSION__: JSON.stringify(pkg.dependencies['@pkmn/sim']),
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
        // Workbox's defaults skip images and anything over 2 MiB, which would leave
        // the sprites and the battle engine chunk out of the offline cache.
        // (The plugin adds the web manifest itself.)
        globPatterns: ['**/*.{js,css,html,wasm,json,svg,png,gif,woff2}'],
        maximumFileSizeToCacheInBytes: 24 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/ws\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
