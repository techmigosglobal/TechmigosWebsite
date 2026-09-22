#!/usr/bin/env node
// Verifies a restored project against the bundle's recorded row counts and
// storage manifest. Exit code 1 means at least one table or object differs.
//
// Usage:
//   node scripts/verify-backend.mjs --url <target-url> --service-key <key> [--report-only]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

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

async function countRows(url, key, table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number((response.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : null;
}

async function countStorage(url, key, bucket) {
  let total = 0;
  const queue = [''];
  while (queue.length) {
    const prefix = queue.shift();
    const response = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    });
    if (!response.ok) return null;
    const entries = (await response.json()) || [];
    for (const entry of entries) {
      const full = prefix ? `${prefix}${entry.name}` : entry.name;
      if (!entry.id && !entry.metadata) queue.push(`${full}/`);
      else total += 1;
    }
  }
  return total;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = String(args.url || process.env.TARGET_SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(args['service-key'] || process.env.TARGET_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) throw new Error('--url and --service-key (or TARGET_* env vars) are required.');

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'MANIFEST.json'), 'utf8'));
  const report = { checkedAt: new Date().toISOString(), url, tables: {}, storage: {}, differences: [] };

  for (const [table, info] of Object.entries(manifest.rowCounts || {})) {
    const live = await countRows(url, key, table);
    report.tables[table] = { expected: info.exported, actual: live };
    if (live === null) report.differences.push(`${table}: could not read target count (check grants/table existence)`);
    else if (live < info.exported) report.differences.push(`${table}: expected at least ${info.exported} rows, found ${live}`);
  }

  const storageManifestPath = path.join(ROOT, 'storage', 'storage-manifest.json');
  if (fs.existsSync(storageManifestPath)) {
    const storageManifest = JSON.parse(fs.readFileSync(storageManifestPath, 'utf8'));
    const perBucket = new Map();
    for (const object of storageManifest.objects) perBucket.set(object.bucket, (perBucket.get(object.bucket) || 0) + 1);
    for (const [bucket, expected] of perBucket) {
      const actual = await countStorage(url, key, bucket);
      report.storage[bucket] = { expected, actual };
      if (actual === null) report.differences.push(`bucket ${bucket}: not readable in the target project`);
      else if (actual < expected) report.differences.push(`bucket ${bucket}: expected at least ${expected} objects, found ${actual}`);
    }
  }

  fs.writeFileSync('verify-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Checked ${Object.keys(report.tables).length} tables and ${Object.keys(report.storage).length} buckets.`);
  if (report.differences.length) {
    for (const difference of report.differences) console.error(`  ! ${difference}`);
    console.error(`Differences: ${report.differences.length} (see verify-report.json)`);
    if (!args['report-only']) process.exitCode = 1;
  } else {
    console.log('All recorded row counts and storage objects are present.');
  }
}

main().catch((error) => {
  console.error(`verification failed: ${error.message}`);
  process.exitCode = 1;
});
