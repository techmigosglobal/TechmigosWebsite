#!/usr/bin/env node
// Repoints the TechMigos frontend and helper scripts at a different Supabase
// project. The project reference, URL and publishable key are hardcoded in
// several files, so cloning the backend without this step leaves the site
// talking to the original project.
//
// Usage:
//   node scripts/backend/update-frontend-ref.mjs \
//     --url https://<new-ref>.supabase.co \
//     --publishable-key sb_publishable_... \
//     [--ref <new-ref>] [--old-ref <current-ref>] [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const TARGET_FILES = [
  'vercel.json',
  '.env.example',
  'env.example.json',
  '.env.local',
  'src/layouts/BaseLayout.astro',
  'scripts/lead-management.mjs',
  'scripts/provision-portal-user.mjs',
  'scripts/prepare-live-identities.mjs',
  'scripts/cleanup-live-identities.mjs',
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    const hasValue = next !== undefined && !next.startsWith('--');
    args[key] = hasValue ? next : true;
    if (hasValue) index += 1;
  }
  return args;
}

function detectCurrentRef() {
  const envPath = path.join(ROOT, 'env.example.json');
  if (!fs.existsSync(envPath)) return '';
  try {
    const parsed = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    const match = String(parsed.PUBLIC_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const newUrl = String(args.url || '').replace(/\/$/, '');
  if (!newUrl) throw new Error('--url is required, for example --url https://abcdefghijklmnop.supabase.co');
  const newRef = String(args.ref || (newUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '');
  if (!newRef) throw new Error('Could not derive a project ref from --url; pass --ref explicitly.');
  const oldRef = String(args['old-ref'] || detectCurrentRef());
  if (!oldRef) throw new Error('Could not detect the current project ref; pass --old-ref explicitly.');
  const newKey = String(args['publishable-key'] || '');
  const dryRun = Boolean(args['dry-run']);

  const oldUrl = `https://${oldRef}.supabase.co`;
  const replacements = [];
  if (oldRef !== newRef) replacements.push([oldUrl, newUrl]);
  if (newKey) {
    replacements.push([/sb_publishable_[A-Za-z0-9_-]+/g, newKey]);
    replacements.push([/"PUBLIC_SUPABASE_KEY":\s*"[^"]*"/g, `"PUBLIC_SUPABASE_KEY": "${newKey}"`]);
  }

  const changed = [];
  for (const relative of TARGET_FILES) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) continue;
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    for (const [pattern, value] of replacements) {
      updated = typeof pattern === 'string' ? updated.split(pattern).join(value) : updated.replace(pattern, value);
    }
    if (updated === original) continue;
    changed.push(relative);
    if (!dryRun) fs.writeFileSync(file, updated);
  }

  if (!changed.length) {
    console.log(`No files needed changes (already pointing at ${newRef}).`);
    return;
  }
  for (const file of changed) console.log(`${dryRun ? 'would update' : 'updated'} ${file}`);
  console.log('');
  console.log('Next: update the target project values too —');
  console.log('  - Supabase Auth Site URL and redirect URLs (change-password, reset-password)');
  console.log('  - Edge Function secret SITE_URL and ALLOWED_ORIGINS');
  console.log('  - Vercel environment variables for the new deployment');
  console.log('  - vercel.json Content-Security-Policy connect-src now points at the new project');
}

try {
  main();
} catch (error) {
  console.error(`update failed: ${error.message}`);
  process.exitCode = 1;
}
