import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook is the design system's board: every piece of the Denborn DA kit,
 * its colours, type and motion, shown alone. It is a development tool only;
 * nothing here is part of the app that is deployed.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-vite',
    // Its own Vite config: the app's one starts the Cloudflare runtime and builds the service worker.
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  // The sprites and icons downloaded by `pnpm data` (not in git).
  staticDirs: ['../public'],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
}

export default config
