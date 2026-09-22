#!/usr/bin/env node
// Loads db/rest-data/*.jsonl into a target Supabase project through PostgREST
// with the service role key. Used when no pg_dump is available (degraded
// export) or as a table-level re-sync after a partial restore.
//
// Usage:
//   node scripts/rest-load.mjs --url <target-url> --service-key-file <file> [--data db/rest-data] [--tables a,b]

import fs from 'node:fs';
import path from 'node:path';

// Parents before children; unknown tables are appended alphabetically.
const TABLE_ORDER = [
  'crm_clients',
  'crm_profiles',
  'crm_projects',
  'crm_project_members',
  'crm_project_folders',
  'crm_project_files',
  'crm_tickets',
  'crm_ticket_messages',
  'crm_invoices',
  'crm_invoice_items',
  'crm_finances',
  'crm_activities',
  'crm_settings',
  'crm_leads',
  'crm_deals',
  'crm_followups',
  'crm_campaigns',
  'contact_leads',
  'newsletter_subscribers',
  'career_applications',
  'todos',
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

function serviceKey(args) {
  if (args['service-key-file']) return fs.readFileSync(String(args['service-key-file']), 'utf8').trim();
  if (args['service-key']) return String(args['service-key']).trim();
  if (process.env.TARGET_SERVICE_ROLE_KEY) return process.env.TARGET_SERVICE_ROLE_KEY.trim();
  throw new Error('A target service role key is required.');
}

function chunk(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = String(args.url || process.env.TARGET_SUPABASE_URL || '').replace(/\/$/, '');
  if (!url) throw new Error('--url (or TARGET_SUPABASE_URL) is required.');
  const key = serviceKey(args);
  const dataDir = path.resolve(String(args.data || 'db/rest-data'));
  const filter = typeof args.tables === 'string' ? args.tables.split(',').map((value) => value.trim()) : null;

  const files = fs.readdirSync(dataDir).filter((name) => name.endsWith('.jsonl')).map((name) => name.replace(/\.jsonl$/, ''));
  const tables = [...TABLE_ORDER.filter((table) => files.includes(table)), ...files.filter((table) => !TABLE_ORDER.includes(table)).sort()];
  const selected = filter ? tables.filter((table) => filter.includes(table)) : tables;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  let inserted = 0;
  const failures = [];
  for (const table of selected) {
    const rows = fs
      .readFileSync(path.join(dataDir, `${table}.jsonl`), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    if (!rows.length) continue;
    let tableInserted = 0;
    for (const batch of chunk(rows, 500)) {
      const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        const text = await response.text();
        failures.push({ table, count: batch.length, error: `${response.status} ${text.slice(0, 300)}` });
        break;
      }
      tableInserted += batch.length;
    }
    inserted += tableInserted;
    console.log(`  ${table}: ${tableInserted}/${rows.length} rows`);
  }

  console.log(`Inserted ${inserted} rows.`);
  if (failures.length) {
    fs.writeFileSync('rest-load-failures.json', `${JSON.stringify(failures, null, 2)}\n`);
    console.error(`Failed tables: ${failures.map((failure) => failure.table).join(', ')} (see rest-load-failures.json)`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`data load failed: ${error.message}`);
  process.exitCode = 1;
});
