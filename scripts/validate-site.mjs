import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputOnly = process.argv.includes('--output-only');
const siteOrigin = process.env.PUBLIC_SITE_URL?.trim() || 'https://www.techmigos.com';
const bannedPatterns = [
  'appshowcase',
  'php-backend',
  '/api/admin',
  'NEXT_PUBLIC_FIREBASE',
  '/showcase',
  'SchoolDesk',
  'school-desk',
];

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.astro', '.kilo', '.tmp-npm-cache', 'exports', 'reports']);
const textExts = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yml',
  '.yaml',
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (textExts.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

const requiredFiles = [
  'dist/robots.txt',
  'dist/index.html',
  'dist/contact/index.html',
  'dist/support/index.html',
  'dist/login/index.html',
  'dist/finance/index.html',
];

const removedRoutes = [
  'dist/reset-password',
  'dist/change-password',
  'dist/client',
  'dist/company',
];

const failures = [];
for (const file of requiredFiles) {
  try {
    await fs.access(path.join(root, file));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

for (const route of removedRoutes) {
  try {
    await fs.access(path.join(root, route));
    failures.push(`Removed authenticated route still exists: ${route}`);
  } catch {
    // Expected: authenticated portal output was removed.
  }
}

if (!outputOnly) {
  for (const file of await walk(root)) {
    if (relative(file) === 'scripts/validate-site.mjs') continue;
    const contents = await fs.readFile(file, 'utf8');
    for (const pattern of bannedPatterns) {
      if (contents.includes(pattern)) {
        failures.push(`Forbidden reference "${pattern}" found in ${relative(file)}`);
      }
    }
  }
}

const htmlFiles = (await walk(path.join(root, 'dist'))).filter((file) => file.endsWith('.html'));
const blogEntries = (await fs.readdir(path.join(root, 'dist', 'blog'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== 'index')
  .length;
if (blogEntries < 21) {
  failures.push(`Expected at least 21 published blog routes but found ${blogEntries}`);
}
const sitemapXml = await fs.readFile(path.join(root, 'dist', 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const remainingSitemapUrls = new Set(sitemapUrls);
if (remainingSitemapUrls.size !== sitemapUrls.length) failures.push('Sitemap contains duplicate URLs');
const sitemapBlogEntries = sitemapUrls.filter((url) => /\/blog\/[^/]+$/.test(url)).length;
if (sitemapBlogEntries < 21) {
  failures.push(`Expected at least 21 blog URLs in sitemap but found ${sitemapBlogEntries}`);
}
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const documentHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const route = '/' + relative(file).slice('dist/'.length).replace(/(?:\/)?index\.html$/, '');
  if (route === '/portfolio' || route.startsWith('/portfolio/')) {
    const target = route.replace(/^\/portfolio/, '/work');
    const refresh = documentHtml.match(/<meta\b[^>]*http-equiv="refresh"[^>]*content="0;\s*url=([^"]+)"/i)?.[1];
    if (refresh !== target || !sitemapUrls.includes(new URL(target, siteOrigin).href)) {
      failures.push(`Invalid Work redirect for ${route} (expected ${target}, found ${refresh || 'none'})`);
    }
    continue;
  }
  const mainLandmarkCount = (documentHtml.match(/<main\b/g) || []).length;
  if (mainLandmarkCount !== 1) {
    failures.push(`Expected exactly one main landmark but found ${mainLandmarkCount} in ${relative(file)}`);
  }
  if (!/<title>[^<]{10,70}<\/title>/.test(html)) {
    failures.push(`Missing or weak title in ${relative(file)}`);
  }
  if (!/<meta name="description" content="[^"]{80,180}"/.test(html)) {
    failures.push(`Missing or weak meta description in ${relative(file)}`);
  }
  const canonical = documentHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const expectedUrl = new URL(route, siteOrigin).href;
  const isNoIndex = /<meta name="robots" content="[^\"]*\bnoindex\b/i.test(documentHtml);
  if (!canonical || (!isNoIndex && canonical !== expectedUrl)) {
    failures.push(`Invalid canonical URL in ${relative(file)} (expected ${expectedUrl}, found ${canonical || 'none'})`);
  }
  const inSitemap = remainingSitemapUrls.delete(expectedUrl);
  if (isNoIndex && inSitemap) {
    failures.push(`Noindex route included in sitemap: ${expectedUrl}`);
  } else if (!isNoIndex && !inSitemap) {
    failures.push(`Indexable route missing from sitemap: ${expectedUrl}`);
  }
}

for (const url of remainingSitemapUrls) {
  failures.push(`Sitemap URL has no matching output route: ${url}`);
}

if (failures.length > 0) {
  console.error('Validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validation passed for ${htmlFiles.length} HTML pages.`);
