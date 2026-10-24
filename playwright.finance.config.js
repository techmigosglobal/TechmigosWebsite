import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  || (existsSync(localChrome) ? localChrome : undefined);

export default defineConfig({
  testDir: './test/e2e',
  testMatch: 'finance*.spec.js',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321',
    launchOptions: { executablePath },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run build && node scripts/playwright-static-server.mjs',
    url: 'http://127.0.0.1:4321/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
