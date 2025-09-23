import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxThreads: 1,       // Disable parallelism to reduce memory spikes
    minThreads: 1,
    hookTimeout: 30000,
    testTimeout: 60000,
    environment:'jsdom',
  },
});
