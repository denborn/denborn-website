import { defineConfig, devices } from '@playwright/test'
import { CAMERA_PICTURE, CAMPAIGN_CAMERA_PICTURE } from './tests/e2e/camera.ts'

const PORT = 4173
const LOCAL_URL = `http://localhost:${PORT}`

// Set E2E_BASE_URL to run the same tests against a deployed site, for example
//   E2E_BASE_URL=https://denborn-website.example.workers.dev pnpm test:e2e
const REMOTE_URL = process.env.E2E_BASE_URL

/** What Chromium is started with to play a video file in the place of a camera, its use granted unasked. */
const cameraShowing = (picture: string): string[] => ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${picture}`]

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
  // Writes the picture the pretend camera plays.
  globalSetup: './tests/e2e/global-setup.ts',
  projects: [
    { name: 'phone', testIgnore: /scan(-campaign)?\.spec\.ts$/, use: { ...devices['Pixel 7'] } },
    {
      // The same phone with a camera: Chromium plays a video file in the place of one, and grants its use unasked.
      name: 'phone-camera',
      testMatch: /scan\.spec\.ts$/,
      use: { ...devices['Pixel 7'], launchOptions: { args: cameraShowing(CAMERA_PICTURE) } },
    },
    {
      // And with a campaign's creation link before its camera: a browser plays one file, so this is a browser of its own.
      name: 'phone-camera-campaign',
      testMatch: /scan-campaign\.spec\.ts$/,
      use: { ...devices['Pixel 7'], launchOptions: { args: cameraShowing(CAMPAIGN_CAMERA_PICTURE) } },
    },
  ],
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
