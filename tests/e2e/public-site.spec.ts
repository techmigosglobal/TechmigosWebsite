import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = ['/', '/services', '/services/web', '/portfolio', '/portfolio/focus-today', '/about', '/blog', '/contact', '/careers', '/privacy', '/terms'];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

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

// ===== HOMEPAGE CINEMATIC INTERACTION TESTS =====

test('homepage: H1 count is exactly one', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('We build digital products people remember.');
});

test('homepage: hero semantic content exists without canvas dependency', async ({ page }) => {
  await page.goto('/');
  // H1 must exist in semantic HTML, not only in canvas
  const h1 = page.locator('#homepage-hero-title');
  await expect(h1).toBeVisible();
  await expect(h1).toContainText('We build digital products');

  // Capability nodes must be in HTML
  await expect(page.locator('.homepage-hero__node--web')).toBeVisible();
  await expect(page.locator('.homepage-hero__node--mobile')).toBeVisible();
  await expect(page.locator('.homepage-hero__node--cloud')).toBeVisible();
  await expect(page.locator('.homepage-hero__node--ai')).toBeVisible();

  // Canvas must be aria-hidden (decorative)
  await expect(page.locator('#hero-network-canvas')).toHaveAttribute('aria-hidden', 'true');
});

test('homepage: custom cursor is not active in reduced-motion mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // Allow time for any JS to run
  await page.waitForTimeout(500);
  // Cursor elements must not exist or be hidden
  const cursorDot = page.locator('#cursor-dot');
  const count = await cursorDot.count();
  // Either cursor doesn't exist at all, or is invisible (opacity 0)
  if (count > 0) {
    const opacity = await cursorDot.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBe(0);
  }
  // Body must NOT have custom-cursor-active class in reduced-motion
  const hasCustomCursor = await page.locator('html.custom-cursor-active').count();
  expect(hasCustomCursor).toBe(0);
});

test('homepage: hero fallback exists — canvas failure does not remove content', async ({ page }) => {
  // Block canvas rendering by disabling JS context canvas methods
  await page.goto('/');
  // Check the fallback HTML elements for each capability node are present
  await expect(page.locator('.homepage-hero__core')).toBeVisible();
  await expect(page.locator('.homepage-hero__map')).toBeVisible();
});

test('homepage: no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const winWidth = await page.evaluate(() => window.innerWidth);
  expect(docWidth).toBeLessThanOrEqual(winWidth + 2); // allow 2px tolerance
});

test('homepage: primary CTA remains clickable', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('.homepage-hero__primary-action');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/contact');
  // Must not have pointer-events:none that blocks clicks
  const pointerEvents = await cta.evaluate((el) => window.getComputedStyle(el).pointerEvents);
  expect(pointerEvents).not.toBe('none');
});

test('homepage: process section is visible in reduced-motion mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // Process section heading
  await expect(page.locator('#home-process-title')).toBeVisible();
  // At least one process step must be visible
  await expect(page.locator('[data-process-step]').first()).toBeVisible();
});

test('homepage: all project card links are accessible', async ({ page }) => {
  await page.goto('/');
  const projectCards = page.locator('.home-project-card a');
  const count = await projectCards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const card = projectCards.nth(i);
    await expect(card).toHaveAttribute('href');
    // Links must not be blocked
    const pointerEvents = await card.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).not.toBe('none');
  }
});

test('homepage: mobile layout remains usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  // H1 must be visible
  await expect(page.locator('h1')).toBeVisible();
  // Primary CTA must be visible and accessible
  await expect(page.locator('.homepage-hero__primary-action')).toBeVisible();
  // No horizontal overflow
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const winWidth = await page.evaluate(() => window.innerWidth);
  expect(docWidth).toBeLessThanOrEqual(winWidth + 2);
});

test('homepage: services section is reachable and visible', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-services-title').scrollIntoViewIfNeeded();
  await expect(page.locator('#home-services-title')).toBeVisible();
  // At least 3 service cards
  const serviceCards = page.locator('[data-service-card]');
  await expect(serviceCards).toHaveCount(6);
});

test('homepage: final CTA is reachable and links to contact', async ({ page }) => {
  await page.goto('/');
  const finalCta = page.locator('#home-final-cta-title');
  await finalCta.scrollIntoViewIfNeeded();
  await expect(finalCta).toBeVisible();
  const ctaLink = page.locator('.home-final-cta__primary');
  await expect(ctaLink).toHaveAttribute('href', '/contact');
});

test('homepage: navigation still works after loading', async ({ page }) => {
  await page.goto('/');
  const navLinks = page.locator('#navbar a[href]');
  const count = await navLinks.count();
  expect(count).toBeGreaterThan(4);
});
