import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const bannedPatterns = [
  'appshowcase',
  'php-backend',
  '/api/admin',
  'NEXT_PUBLIC_SUPABASE',
  '/showcase',
  'SchoolDesk',
  'school-desk',
];

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.astro', '.tmp-npm-cache', 'exports', 'reports']);
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
  return path.relative(root, file);
}

const requiredFiles = [
  'dist/index.html',
  'dist/robots.txt',
  'dist/sitemap.xml',
  'dist/sitemap-index.xml',
  'src/db/supabase.js',
  'scripts/provision-portal-user.mjs',
  'dist/login/index.html',
  'dist/company/index.html',
  'dist/client/index.html',
];

const failures = [];
for (const file of requiredFiles) {
  try {
    await fs.access(path.join(root, file));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

for (const file of await walk(root)) {
  if (relative(file) === 'scripts/validate-site.mjs') continue;
  const contents = await fs.readFile(file, 'utf8');
  for (const pattern of bannedPatterns) {
    if (contents.includes(pattern)) {
      failures.push(`Forbidden reference "${pattern}" found in ${relative(file)}`);
    }
  }
}

const htmlFiles = (await walk(path.join(root, 'dist'))).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  if (!/<title>[^<]{10,70}<\/title>/.test(html)) {
    failures.push(`Missing or weak title in ${relative(file)}`);
  }
  if (!/<meta name="description" content="[^"]{80,180}"/.test(html)) {
    failures.push(`Missing or weak meta description in ${relative(file)}`);
  }
  if (!/<link rel="canonical" href="https:\/\/www\.techmigos\.com/.test(html)) {
    failures.push(`Missing canonical URL in ${relative(file)}`);
  }
}

if (failures.length > 0) {
  console.error('Validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validation passed for ${htmlFiles.length} HTML pages.`);
