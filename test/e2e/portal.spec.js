import { test, expect } from '@playwright/test';

async function visitProtectedRoute(page, path) {
  // The portal redirects on the client as soon as auth state is read. Chromium
  // may report that navigation as aborted even though the redirect succeeded.
  await page.goto(path, { waitUntil: 'domcontentloaded' }).catch((error) => {
    if (!String(error?.message || error).includes('ERR_ABORTED')) throw error;
  });
  await expect(page).toHaveURL(/\/login(?:\/|$)/);
}

test('login screen exposes the invite-only portal flow', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/TechMigos/);
  await expect(page.getByLabel(/username or email/i)).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
});

test('password recovery is available without opening the workspace', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  await expect(page.getByLabel(/work email/i)).toBeVisible();
});

test('report and internal-file routes remain protected from unauthenticated users', async ({ page }) => {
  for (const path of ['/company/files', '/company/reports', '/company/user-management', '/company/settings']) {
    await visitProtectedRoute(page, path);
  }
});

test('unauthenticated company and client routes return to login', async ({ page }) => {
  for (const path of ['/company', '/company/files', '/client']) {
    await visitProtectedRoute(page, path);
  }
});

const roleCases = [
  { label: 'Admin', role: 'admin', email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD, destination: '/company' },
  { label: 'Employee', role: 'employee', email: process.env.CRM_EMPLOYEE_EMAIL, password: process.env.CRM_EMPLOYEE_PASSWORD, destination: '/company' },
  { label: 'Client', role: 'client', email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD, destination: '/client' },
];

for (const roleCase of roleCases) {
  test(`${roleCase.label} role redirects to its portal`, async ({ page }) => {
    test.skip(!roleCase.email || !roleCase.password, `Set CRM_${roleCase.role.toUpperCase()}_EMAIL and CRM_${roleCase.role.toUpperCase()}_PASSWORD to run this hosted identity check.`);
    await page.goto('/login');
    await page.getByLabel(/username or email/i).fill(roleCase.email);
    await page.locator('#password').fill(roleCase.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`${roleCase.destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
  });
}
