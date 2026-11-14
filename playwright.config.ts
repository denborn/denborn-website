import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const LOCAL_URL = `http://localhost:${PORT}`

// Set E2E_BASE_URL to run the same tests against a deployed site, for example
//   E2E_BASE_URL=https://denborn-website.example.workers.dev pnpm test:e2e
const REMOTE_URL = process.env.E2E_BASE_URL

// By default the tests run against the production build served by `vite preview`,
// which runs the real Worker and Durable Object in workerd. Build first (`pnpm verify` does).
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  // Generous: against the live site a first visit downloads about 14 MB before the app is ready offline.
  timeout: 180_000,
  use: {
    baseURL: REMOTE_URL ?? LOCAL_URL,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  ...(REMOTE_URL === undefined && {
    webServer: {
      // Vite is started directly, not through pnpm: a wrapper process would be killed
      // alone and leave Vite and workerd running, which keeps the test run from exiting.
      command: `node node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
      url: LOCAL_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  }),
})
