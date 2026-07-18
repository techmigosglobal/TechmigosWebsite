import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const pages = new Set();
const links = [];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function routeFor(file) {
  const relative = path.relative(dist, file).replace(/\\/g, '/');
  return `/${relative.replace(/index\.html$/, '')}`.replace(/\/$/, '/') || '/';
}

const files = await walk(dist);
for (const file of files) pages.add(routeFor(file));

for (const file of files) {
  const route = routeFor(file);
  const html = await fs.readFile(file, 'utf8');
  for (const match of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const target = href.split(/[?#]/)[0];
    if (!target || target.endsWith('.xml') || target.startsWith('/api/')) continue;
    const normalized = target.endsWith('/') ? target : `${target}/`;
    if (!pages.has(normalized)) links.push(`${route} links to missing ${href}`);
  }
}

if (links.length) {
  console.error('Public link check failed:');
  links.forEach((link) => console.error(`- ${link}`));
  process.exit(1);
}

console.log(`Public link check passed for ${pages.size} generated pages.`);
