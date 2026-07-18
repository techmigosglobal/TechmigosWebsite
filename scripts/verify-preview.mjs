import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';

const previewUrl = process.argv[2]?.replace(/\/$/, '');
if (!previewUrl || !/^https:\/\//.test(previewUrl)) {
  throw new Error('Usage: bun scripts/verify-preview.mjs https://preview.example.com');
}

const siteOrigin = 'https://www.techmigos.com';
const artifactDir = process.env.PREVIEW_ARTIFACT_DIR || '/tmp/techmigos-preview-audit';
const bypassCookie = process.env.PREVIEW_BYPASS_COOKIE || '';
const privatePrefixes = ['/client/', '/company/', '/login/'];
const mobileRepresentativeRoutes = ['/', '/services', '/portfolio', '/portfolio/focus-today', '/about', '/blog', '/contact', '/careers', '/privacy', '/terms', '/support'];
const screenshotRoutes = ['/', '/services', '/portfolio/focus-today', '/about', '/contact', '/careers'];
const failures = [];
const report = { previewUrl, desktopRoutes: 0, mobileRoutes: 0, navigation: {}, screenshots: [] };

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile() && entry.name === 'index.html') files.push(fullPath);
  }
  return files;
}

function routeFor(file) {
  const relative = path.relative(path.join(process.cwd(), 'dist'), file).replace(/\\/g, '/');
  return `/${relative.replace(/index\.html$/, '')}`.replace(/\/$/, '') || '/';
}

function nameFor(route) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
}

const generatedRoutes = (await walk(path.join(process.cwd(), 'dist')))
  .map(routeFor)
  .filter((route) => !privatePrefixes.some((prefix) => `${route}/`.startsWith(prefix)))
  .sort();

async function newPreviewContext(browser, options = {}) {
  const context = await browser.newContext(options);
  if (bypassCookie) {
    const separator = bypassCookie.indexOf('=');
    if (separator <= 0) throw new Error('PREVIEW_BYPASS_COOKIE must be supplied as name=value');
    await context.addCookies([{
      name: bypassCookie.slice(0, separator),
      value: bypassCookie.slice(separator + 1),
      domain: new URL(previewUrl).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }]);
  }
  return context;
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(400);
}

async function inspectRoute(page, route, mode) {
  const responseFailures = [];
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const onResponse = (response) => {
    const status = response.status();
    const resourceType = response.request().resourceType();
    if (status >= 400 && resourceType !== 'document') responseFailures.push(`${status} ${response.url()}`);
  };
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onRequestFailed = (request) => {
    const errorText = request.failure()?.errorText ?? 'failed';
    const url = request.url();
    const isVercelPreviewInternal = url.includes('/.well-known/vercel/jwe') || url.startsWith('https://vercel.live/login/validate');
    if (errorText === 'net::ERR_ABORTED' || isVercelPreviewInternal) return;
    requestFailures.push(`${errorText} ${url}`);
  };
  page.on('response', onResponse);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  try {
    const response = await page.goto(`${previewUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (!response || !response.ok()) failures.push(`${mode} ${route}: document response was ${response?.status() ?? 'missing'}`);
    await settle(page);

    const details = await page.evaluate((expectedCanonical) => {
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => {
        try { JSON.parse(node.textContent || ''); return true; } catch { return false; }
      });
      return {
        canonical,
        expectedCanonical,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        jsonLdValid: jsonLd.length > 0 && jsonLd.every(Boolean),
      };
    }, `${siteOrigin}${route === '/' ? '/' : `${route}/`}`);

    if (details.canonical !== details.expectedCanonical) failures.push(`${mode} ${route}: canonical was ${details.canonical || 'missing'}`);
    if (!details.jsonLdValid) failures.push(`${mode} ${route}: JSON-LD was missing or invalid`);
    if (details.overflow) failures.push(`${mode} ${route}: horizontal overflow detected`);
    if (responseFailures.length) failures.push(`${mode} ${route}: failed assets: ${responseFailures.join(', ')}`);
    if (consoleErrors.length) failures.push(`${mode} ${route}: console errors: ${consoleErrors.join(' | ')}`);
    if (pageErrors.length) failures.push(`${mode} ${route}: page errors: ${pageErrors.join(' | ')}`);
    if (requestFailures.length) failures.push(`${mode} ${route}: failed requests: ${requestFailures.join(' | ')}`);

    if (route === '/') {
      report.navigation[mode] = await page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0];
        return timing ? {
          transferSize: timing.transferSize,
          domContentLoadedMs: Math.round(timing.domContentLoadedEventEnd),
          loadMs: Math.round(timing.loadEventEnd),
        } : null;
      });
    }
  } finally {
    page.off('response', onResponse);
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
  }
}

async function inspectContactValidation(page) {
  await page.goto(`${previewUrl}/contact`, { waitUntil: 'domcontentloaded' });
  const result = await page.locator('#contact-form').evaluate((form) => ({
    valid: form.checkValidity(),
    reported: form.reportValidity(),
    action: form.getAttribute('action'),
  }));
  if (result.valid || result.reported || result.action) failures.push('contact: required-field validation did not block an empty submission');
}

async function inspectPreviewMeta(context) {
  const page = await context.newPage();
  const root = await page.goto(`${previewUrl}/`, { waitUntil: 'domcontentloaded' });
  const robots = await page.request.get(`${previewUrl}/robots.txt`);
  const sitemap = await page.request.get(`${previewUrl}/sitemap-index.xml`);
  const speedInsights = await page.request.get(`${previewUrl}/_vercel/speed-insights/script.js`);
  const missing = await page.goto(`${previewUrl}/preview-route-that-must-not-exist`, { waitUntil: 'domcontentloaded' });
  const missingNoIndex = await page.locator('meta[name="robots"]').getAttribute('content');
  const robotsText = await robots.text();
  const sitemapText = await sitemap.text();
  const xRobots = root?.headers()['x-robots-tag'] || '';

  if (!xRobots.toLowerCase().includes('noindex')) failures.push(`preview: x-robots-tag must include noindex, received ${xRobots || 'missing'}`);
  if (!robots.ok() || !robotsText.includes('Sitemap: https://www.techmigos.com/sitemap-index.xml')) failures.push('preview: robots.txt was not served with the production sitemap reference');
  if (!sitemap.ok() || sitemapText.includes(previewUrl) || !sitemapText.includes(siteOrigin)) failures.push('preview: sitemap did not retain production-domain URLs');
  if (!speedInsights.ok()) failures.push(`preview: Speed Insights script returned ${speedInsights.status()}`);
  if (missing?.status() !== 404 || !missingNoIndex?.includes('noindex')) failures.push(`preview: 404 route was not correctly noindexed (status ${missing?.status() ?? 'missing'})`);
  await page.close();
}

await fs.mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const metadata = await newPreviewContext(browser);
  await inspectPreviewMeta(metadata);
  await metadata.close();
  const desktop = await newPreviewContext(browser, { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const desktopPage = await desktop.newPage();
  for (const route of generatedRoutes) await inspectRoute(desktopPage, route, 'desktop');
  report.desktopRoutes = generatedRoutes.length;
  await inspectContactValidation(desktopPage);

  for (const route of screenshotRoutes) {
    await desktopPage.goto(`${previewUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(desktopPage);
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    await desktopPage.waitForTimeout(100);
    const file = path.join(artifactDir, `desktop-${nameFor(route)}.png`);
    await desktopPage.screenshot({ path: file, fullPage: false });
    report.screenshots.push(file);
  }
  await desktop.close();

  const mobile = await newPreviewContext(browser, { ...devices['iPhone 13'], reducedMotion: 'reduce' });
  const mobilePage = await mobile.newPage();
  for (const route of mobileRepresentativeRoutes) await inspectRoute(mobilePage, route, 'mobile');
  report.mobileRoutes = mobileRepresentativeRoutes.length;
  for (const route of screenshotRoutes) {
    await mobilePage.goto(`${previewUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(mobilePage);
    await mobilePage.evaluate(() => window.scrollTo(0, 0));
    await mobilePage.waitForTimeout(100);
    const file = path.join(artifactDir, `mobile-${nameFor(route)}.png`);
    await mobilePage.screenshot({ path: file, fullPage: false });
    report.screenshots.push(file);
  }
  await mobile.close();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(artifactDir, 'report.json'), `${JSON.stringify({ ...report, failures }, null, 2)}\n`);
if (failures.length) {
  console.error('Preview verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Preview verification passed: ${report.desktopRoutes} desktop routes, ${report.mobileRoutes} mobile representative routes.`);
console.log(`Artifacts: ${artifactDir}`);
console.log(JSON.stringify(report.navigation));
