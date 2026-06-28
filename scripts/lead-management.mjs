import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './local-env.mjs';

const env = loadLocalEnv();

const command = process.argv[2] || 'list';

function optionValue(name, fallback) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.split('=').slice(1).join('=');
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const tableArg = optionValue('table', '');
const limitArg = Number(optionValue('limit', '50'));
const baseUrl = (env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || 'https://lzlflnjrtxovzrniwmyq.supabase.co').replace(/\/$/, '');
const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
const tables = tableArg ? [tableArg] : ['contact_leads', 'newsletter_subscribers', 'career_applications'];

if (!apiKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

async function getRecords(table) {
  const url = `${baseUrl}/api/database/records/${table}?order=created_at.desc&limit=${limitArg}`;
  const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!response.ok) {
    throw new Error(`${table}: ${response.status} ${await response.text()}`);
  }
  return await response.json();
}

function toCsv(rows) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
}

const allRows = [];
for (const table of tables) {
  const rows = await getRecords(table);
  rows.forEach((row) => allRows.push({ table, ...row }));
}

if (command === 'export') {
  const outDir = path.join(process.cwd(), 'exports');
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `leads-${stamp}.json`);
  const csvPath = path.join(outDir, `leads-${stamp}.csv`);
  await fs.writeFile(jsonPath, JSON.stringify(allRows, null, 2));
  await fs.writeFile(csvPath, toCsv(allRows));
  console.log(`Exported ${allRows.length} leads to ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), csvPath)}.`);
} else {
  const rows = allRows
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, limitArg);

  if (rows.length === 0) {
    console.log('No leads found.');
  } else {
    rows.forEach((row) => {
      console.log(`${row.created_at || ''} | ${row.table} | ${row.name || ''} | ${row.email || ''} | ${row.status || ''} | notify=${row.notification_status || ''}`);
    });
  }
}
