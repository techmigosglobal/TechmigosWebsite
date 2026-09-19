import { defineConfig, devices } from '@playwright/test';

const liveRun = process.env.CRM_LIVE_REQUIRED === '1';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: liveRun ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321',
    trace: liveRun ? 'off' : 'retain-on-failure',
    screenshot: liveRun ? 'off' : 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/usr/bin/google-chrome' },
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run build && node scripts/playwright-static-server.mjs',
    url: 'http://127.0.0.1:4321/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
