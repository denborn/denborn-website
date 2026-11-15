import { defineConfig } from 'vitest/config'

// Three projects, all run by `pnpm test`:
//   unit    pure rules, codecs, reducers (Node)
//   engine  battle rules proven against the real @pkmn/sim (Node)
//   worker  the relay, inside the Workers runtime (workerd)
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: ['src/battle/**', 'src/features/battle/**'],
        },
      },
      {
        test: {
          name: 'engine',
          environment: 'node',
          // The fight's table logic is proven on the real engine too.
          include: ['src/battle/**/*.test.ts', 'src/features/battle/**/*.test.ts'],
        },
      },
      './vitest.worker.config.ts',
    ],
  },
})
