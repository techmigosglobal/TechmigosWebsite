import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const privatePrefixes = ['/client/', '/company/', '/login/', '/support/'];
const failures = [];

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

function attribute(html, name) {
  return html.match(new RegExp(`<meta name="${name}" content="([^"]+)"`))?.[1] ?? '';
}

for (const file of await walk(dist)) {
  const route = routeFor(file);
  if (privatePrefixes.some((prefix) => route.startsWith(prefix))) continue;
  const html = await fs.readFile(file, 'utf8');
  if (/<meta name="robots" content="noindex, nofollow"/.test(html)) continue;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  const description = attribute(html, 'description');
  const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? '';

  if (title.length < 30 || title.length > 70) failures.push(`${route}: title is outside 30–70 characters.`);
  if (description.length < 80 || description.length > 180) failures.push(`${route}: description is outside 80–180 characters.`);
  if (h1Count !== 1) failures.push(`${route}: expected exactly one H1, found ${h1Count}.`);
  if (canonical !== `https://www.techmigos.com${route}`) failures.push(`${route}: canonical does not match its public URL.`);

  for (const node of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(node[1]); } catch { failures.push(`${route}: invalid JSON-LD.`); }
  }
}

if (failures.length) {
  console.error('Public SEO validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Public SEO validation passed.');
