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

test('login page loads the bundled Supabase auth runtime', async ({ page }) => {
  await page.goto('/login');
  await page.waitForFunction(() => Boolean(window.tmSupabase), null, { timeout: 10_000 });
});

test('password recovery is available without opening the workspace', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  await expect(page.getByLabel(/work email/i)).toBeVisible();
});

test('login and recovery stay keyboard-accessible without horizontal overflow', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    await page.goto('/login');
    await expect(page.getByLabel(/username or email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/reset-password');
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to main content/i })).toBeFocused();
});

test('company workspace exposes the supported route documents', async ({ request }) => {
  const companyRoutes = [
    '/company', '/company/projects', '/company/files', '/company/support',
    '/company/finance', '/company/analytics', '/company/reports',
    '/company/users', '/company/settings',
  ];
  for (const path of companyRoutes) {
    const response = await request.get(path);
    expect(response.status(), `${path} should render`).toBe(200);
  }
});

test('unauthenticated company routes return to login', async ({ page }) => {
  for (const path of [
    '/company', '/company/projects', '/company/files', '/company/support',
    '/company/finance', '/company/analytics', '/company/reports',
    '/company/users', '/company/settings',
  ]) {
    await visitProtectedRoute(page, path);
  }
});

const roleCases = [
  { label: 'Admin', role: 'admin', email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD, destination: '/company' },
  { label: 'Employee', role: 'employee', email: process.env.CRM_EMPLOYEE_EMAIL, password: process.env.CRM_EMPLOYEE_PASSWORD, destination: '/company' },
  { label: 'Client', role: 'client', email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD, destination: '/client' },
];

const requireLiveIdentities = process.env.CRM_LIVE_REQUIRED === '1';

function skipOrRequireLiveIdentity(testContext, identity, description) {
  if (identity.email && identity.password) return;
  const variables = `CRM_${identity.role.toUpperCase()}_EMAIL and CRM_${identity.role.toUpperCase()}_PASSWORD`;
  if (requireLiveIdentities) throw new Error(`Live workflow gate requires ${variables} for ${description}.`);
  testContext.skip(true, `Set ${variables} to run ${description}.`);
}

for (const roleCase of roleCases) {
  test(`${roleCase.label} role follows the live workspace access policy`, async ({ page }) => {
    skipOrRequireLiveIdentity(test, roleCase, `the hosted ${roleCase.label} identity check`);
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
  const dimensions = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const overflowingElements = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          position: getComputedStyle(element).position,
        };
      })
      .filter((element) => element.width > 0 && element.position !== 'fixed' && element.right > viewportWidth + 1)
      .slice(0, 8);
    const layout = ['.crm-app', '.crm-main', '.crm-topbar', '.crm-search', '#crm-search', '.crm-top-actions']
      .map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          minWidth: style.minWidth,
          gridTemplateColumns: style.gridTemplateColumns,
          paddingInline: `${style.paddingLeft} ${style.paddingRight}`,
          boxSizing: style.boxSizing,
        };
      }).filter(Boolean);
    return { documentWidth: document.documentElement.scrollWidth, viewportWidth, overflowingElements, layout };
  });
  expect(dimensions.documentWidth, `Unexpected horizontal overflow: ${JSON.stringify(dimensions)}`)
    .toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

const companyRoutePaths = [
  '/company', '/company/projects', '/company/files', '/company/support',
  '/company/finance', '/company/analytics', '/company/reports',
  '/company/users', '/company/settings',
];

test('authenticated Admin sees the unified company workspace', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'admin');
  skipOrRequireLiveIdentity(test, identity, 'the live Admin parity check');

  await signInRole(page, identity);
  await expect(page).toHaveURL(/\/company(?:\/|$)/);
  await expect(page.locator('[data-nav-key="finance"]')).toBeVisible();
  await expect(page.locator('[data-nav-key]')).toHaveCount(9);

  for (const path of companyRoutePaths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crm-app')).toBeVisible();
    await expect(page.locator('.crm-app')).toHaveAttribute('data-crm-active-tab', path === '/company' ? 'dashboard' : path.split('/').pop());
  }

  for (const width of [1440, 1230, 1024, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 1086 });
    await expectNoHorizontalOverflow(page);
    if (process.env.CRM_CAPTURE_WORKSPACE_SCREENSHOTS === '1') {
      await page.screenshot({ path: test.info().outputPath(`admin-finance-${width}.png`), fullPage: true });
    }
  }
  await expect(page.locator('.crm-app')).toBeVisible();
});

test('authenticated Employee sees assigned-work navigation', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'employee');
  skipOrRequireLiveIdentity(test, identity, 'the live Employee parity check');

  await signInRole(page, identity);
  await expect(page).toHaveURL(/\/company(?:\/|$)/);
  await expect(page.locator('[data-nav-key="projects"]')).toBeVisible();
  await expect(page.locator('[data-nav-key="finance"]')).toBeHidden();
  await expect(page.locator('[data-nav-key="users"]')).toBeHidden();
  await expect(page.locator('[data-nav-key="settings"]')).toBeHidden();
  for (const path of ['/company', '/company/projects', '/company/files', '/company/support', '/company/analytics', '/company/reports']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.crm-app')).toBeVisible();
  }
  for (const path of ['/company/finance', '/company/users', '/company/settings']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/company(?:\/|$)/);
  }
});

test('authenticated Client sees the client project portal', async ({ page }) => {
  const identity = roleCases.find((item) => item.role === 'client');
  skipOrRequireLiveIdentity(test, identity, 'the live Client parity check');

  await signInRole(page, identity);
  await expect(page).toHaveURL(/\/client(?:\/|$)/);
  await expect(page.getByRole('heading', { name: /project workspace/i })).toBeVisible();
  await expect(page.locator('#projects-list')).toBeVisible();
  await expect(page.locator('#invoices-list')).toBeVisible();
  await expect(page.locator('#tickets-list')).toBeVisible();
  await expect(page.locator('#ticket-form')).toBeVisible();
});
