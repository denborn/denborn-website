import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Storybook only: the app's plugins for Cloudflare and the service worker are left out on purpose.
export default defineConfig({ plugins: [react()] })
