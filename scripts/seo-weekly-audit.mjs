import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function match(html, regex) {
  return html.match(regex)?.[1]?.trim() || '';
}

await fs.mkdir(reportsDir, { recursive: true });

const pages = [];
for (const file of await walk(dist)) {
  const html = await fs.readFile(file, 'utf8');
  const route = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  const title = match(html, /<title>([^<]+)<\/title>/);
  const description = match(html, /<meta name="description" content="([^"]+)"/);
  const canonical = match(html, /<link rel="canonical" href="([^"]+)"/);
  const noindex = /<meta name="robots" content="noindex, nofollow"/.test(html);
  const issues = [];

  if (title.length < 30 || title.length > 70) issues.push('Title should be 30-70 characters.');
  if (description.length < 80 || description.length > 180) {
    issues.push('Meta description should be 80-180 characters.');
  }
  if (!canonical.startsWith('https://www.techmigos.com/')) issues.push('Canonical URL is missing or non-canonical.');
  if (/Home \| TechMigos/.test(title)) issues.push('Homepage title could be more descriptive than "Home".');

  pages.push({ route, title, description, canonical, noindex, issues });
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    pages: pages.length,
    indexedPages: pages.filter((page) => !page.noindex).length,
    pagesWithIssues: pages.filter((page) => page.issues.length > 0).length,
  },
  recommendations: [
    'Review Google Search Console weekly for actual queries, CTR, indexing, and sitelink changes.',
    'Use the report issues list to update source page titles/descriptions before publishing.',
    'After major SEO changes, request indexing in Google Search Console for the affected URLs.',
  ],
  pages,
};

const outputPath = path.join(reportsDir, 'seo-audit.json');
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(`SEO audit written to ${path.relative(root, outputPath)}.`);
console.log(`${report.summary.pagesWithIssues} pages need metadata review.`);
