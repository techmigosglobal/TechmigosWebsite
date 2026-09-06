import { test, expect } from '@playwright/test';

test('login screen exposes the invite-only portal flow', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/TechMigos/);
  await expect(page.getByLabel(/username or email/i)).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('unauthenticated company and client routes return to login', async ({ page }) => {
  for (const path of ['/company', '/client']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\/|$)/);
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
