import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4321';
const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const previewBypassCookie = process.env.PREVIEW_BYPASS_COOKIE;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ...(previewBypassCookie ? { extraHTTPHeaders: { cookie: previewBypassCookie } } : {}),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  ...(isExternalTarget ? {} : { webServer: { command: 'bun run dev --host 127.0.0.1', url: baseURL, reuseExistingServer: !process.env.CI } }),
});
