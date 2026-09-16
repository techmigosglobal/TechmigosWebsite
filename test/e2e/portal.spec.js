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

test('only the Finance portal route remains in the frontend', async ({ page }) => {
  const removedRoutes = [
    '/', '/about', '/services', '/portfolio', '/blog', '/careers', '/contact', '/support',
    '/privacy', '/terms', '/client', '/company', '/company/dashboard', '/company/projects',
    '/company/files', '/company/tickets', '/company/analytics', '/company/reports',
    '/company/clients', '/company/employees', '/company/settings', '/company/users',
    '/company/user-management',
  ];
  for (const path of removedRoutes) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${path} should be removed`).toBe(404);
  }
});

test('unauthenticated Finance route returns to login', async ({ page }) => {
  await visitProtectedRoute(page, '/company/finance');
});

const roleCases = [
  { label: 'Admin', role: 'admin', email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD, destination: '/company/finance' },
  { label: 'Employee', role: 'employee', email: process.env.CRM_EMPLOYEE_EMAIL, password: process.env.CRM_EMPLOYEE_PASSWORD, destination: '/login' },
  { label: 'Client', role: 'client', email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD, destination: '/login' },
];

for (const roleCase of roleCases) {
  test(`${roleCase.label} role follows the Finance-only access policy`, async ({ page }) => {
    test.skip(!roleCase.email || !roleCase.password, `Set CRM_${roleCase.role.toUpperCase()}_EMAIL and CRM_${roleCase.role.toUpperCase()}_PASSWORD to run this hosted identity check.`);
    await page.goto('/login');
    await page.getByLabel(/username or email/i).fill(roleCase.email);
    await page.locator('#password').fill(roleCase.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`${roleCase.destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
  });
}

async function signInRole(page, roleCase) {
  await page.goto('/login');
  await page.getByLabel(/username or email/i).fill(roleCase.email);
  await page.locator('#password').fill(roleCase.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${roleCase.destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

test('authenticated Admin sees the retained Finance workspace', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'admin');
  test.skip(!identity.email || !identity.password, 'Set CRM_ADMIN_EMAIL and CRM_ADMIN_PASSWORD to run the live Admin parity check.');

  await signInRole(page, identity);
  await expect(page.getByRole('heading', { name: 'Financial Management' })).toBeVisible();
  await expect(page.locator('[data-nav-key="finance"]')).toBeVisible();
  await expect(page.locator('[data-nav-key]')).toHaveCount(1);

  for (const width of [1440, 1230, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 1086 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`admin-finance-${width}.png`), fullPage: true });
  }
  await expect(page.locator('.acc-tab-nav')).toBeVisible();
  await expect(page.locator('.crm-app:has(.finance-page)')).toBeVisible();
});

test('authenticated Employee cannot open the removed Finance-only frontend', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'employee');
  test.skip(!identity.email || !identity.password, 'Set CRM_EMPLOYEE_EMAIL and CRM_EMPLOYEE_PASSWORD to run the live Employee parity check.');

  await signInRole(page, identity);
  await expect(page).toHaveURL(/\/login(?:\/|$)/);
  await expect(page.getByText(/Finance workspace is available/i)).toBeVisible();
});

test('authenticated Client cannot open the removed non-Finance frontend', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'client');
  test.skip(!identity.email || !identity.password, 'Set CRM_CLIENT_EMAIL and CRM_CLIENT_PASSWORD to run the live Client parity check.');

  await signInRole(page, identity);
  await expect(page).toHaveURL(/\/login(?:\/|$)/);
  await expect(page.getByText(/Finance workspace is available/i)).toBeVisible();
});
