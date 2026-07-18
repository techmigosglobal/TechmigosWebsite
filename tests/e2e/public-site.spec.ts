import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = ['/', '/services', '/services/web', '/portfolio', '/portfolio/focus-today', '/about', '/blog', '/contact', '/careers', '/privacy', '/terms'];

for (const route of publicRoutes) {
  test(`${route} renders a complete public document`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveTitle(/TechMigos/);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('body')).toBeVisible();
  });
}

test('core public routes have no automatically detectable serious accessibility violations', async ({ page }) => {
  for (const route of ['/', '/services', '/portfolio', '/contact']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  }
});
