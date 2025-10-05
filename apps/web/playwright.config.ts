import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',          // 👈 SOLO mirará esta carpeta
  timeout: 30_000,
  use: {
    headless: true,
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
