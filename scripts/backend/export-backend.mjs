#!/usr/bin/env node
// Builds a complete, cloneable TechMigos backend bundle and zips it.
//
// Usage:
//   node scripts/backend/export-backend.mjs [--label <name>] [--skip-storage] [--skip-rest-data]
//
// Credentials come from `.env.backend-export` (gitignored) or the environment.
// Nothing secret is written into the bundle: the service role key and the
// database URL are kept in `<stage>/secrets.private.env`, outside the zipped
// directory.
//
// Fidelity levels
//   full      SOURCE_DB_URL (or SOURCE_DB_PASSWORD) present: pg_dump of roles,
//             schema, data, auth (password hashes) and supabase_migrations.
//   degraded  No database credentials: migrations + functions + storage +
//             PostgREST row dumps + Auth Admin user list. Auth password hashes
//             and remote migration history cannot be exported in this mode.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const CLI = process.env.SUPABASE_CLI || 'supabase';

const args = parseArgs(process.argv.slice(2));
const created = new Date();
const stamp = created.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const label = String(args.label || 'techmigos-backend');
const stageName = `${label}-${stamp}`;
const STAGE = path.join(ROOT, '.backend-export', stageName);
const BUNDLE = path.join(STAGE, 'bundle');
const EXPORTS = path.join(ROOT, 'exports');
const steps = [];

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    const hasValue = next !== undefined && !next.startsWith('--');
    parsed[key] = hasValue ? next : true;
    if (hasValue) index += 1;
  }
  return parsed;
}

function log(message) {
  console.log(message);
}

function record(name, status, detail) {
  steps.push({ step: name, status, detail });
  if (status !== 'ok') log(`  ! ${name}: ${detail}`);
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const fileEnv = { ...loadEnvFile(path.join(ROOT, '.env.backend-export')), ...loadEnvFile(path.join(ROOT, '.env.local')) };
const env = (key, fallback = '') => String(process.env[key] ?? fileEnv[key] ?? fallback).trim();

const projectRef = env('SOURCE_PROJECT_REF', 'lzlflnjrtxovzrniwmyq');
const projectUrl = env('SOURCE_SUPABASE_URL', `https://${projectRef}.supabase.co`).replace(/\/$/, '');
const dbRegion = env('SOURCE_DB_REGION', 'ap-northeast-1');
const dbPassword = env('SOURCE_DB_PASSWORD');
const dbUrlOverride = env('SOURCE_DB_URL');

function buildDbUrl() {
  if (dbUrlOverride) return dbUrlOverride;
  if (!dbPassword) return '';
  const user = `postgres.${projectRef}`;
  const host = `aws-0-${dbRegion}.pooler.supabase.com`;
  return `postgresql://${user}:${encodeURIComponent(dbPassword)}@${host}:5432/postgres`;
}

const dbUrl = buildDbUrl();
const fidelity = dbUrl ? 'full' : 'degraded';

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
    input: options.input,
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) return { ok: false, stdout: result.stdout || '', stderr: result.error.message, status: -1 };
  return { ok: result.status === 0, stdout: result.stdout || '', stderr: result.stderr || '', status: result.status };
}

function supabase(commandArgs, options = {}) {
  return run(CLI, commandArgs, options);
}

function writeFile(relative, contents) {
  const target = path.join(BUNDLE, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function writeJson(relative, value) {
  writeFile(relative, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function listFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body ? body.message || body.error || JSON.stringify(body) : String(body);
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${message}`);
  }
  return { body, headers: response.headers };
}

async function resolveServiceKey() {
  const direct = env('SOURCE_SERVICE_ROLE_KEY');
  if (direct) return { key: direct, source: 'env' };
  const result = supabase(['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json', '--reveal']);
  if (!result.ok) return { key: '', source: '', error: result.stderr.trim().slice(0, 300) };
  try {
    const keys = JSON.parse(result.stdout);
    const service = keys.find((entry) => entry.name === 'service_role' && entry.api_key);
    if (!service) return { key: '', source: '', error: 'service_role key not present in CLI output' };
    return { key: service.api_key, source: 'cli' };
  } catch (error) {
    return { key: '', source: '', error: `could not parse CLI api-keys output: ${error.message}` };
  }
}

function copyTree(source, target, filter = () => true) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    const relative = path.relative(source, from).split(path.sep).join('/');
    if (!filter(relative, entry)) continue;
    if (entry.isDirectory()) copyTree(from, to, filter);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

async function exportTableData(serviceKey, table, spec) {
  const columns = Object.keys(spec.definitions?.[table]?.properties || {});
  const orderColumn = columns.includes('id') ? 'id' : columns.includes('created_at') ? 'created_at' : '';
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const search = new URLSearchParams({ select: '*' });
    if (orderColumn) search.set('order', `${orderColumn}.asc`);
    const url = `${projectUrl}/rest/v1/${table}?${search.toString()}`;
    const { body } = await fetchJson(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        'Range-Unit': 'items',
      },
    });
    const page = Array.isArray(body) ? body : [];
    rows.push(...page);
    if (page.length < pageSize) break;
    if (offset > 5_000_000) throw new Error(`row pagination exceeded for ${table}`);
  }
  return { columns, rows };
}

async function countRows(serviceKey, table) {
  const response = await fetch(`${projectUrl}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const range = response.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : null;
}

async function fetchAuthUsers(serviceKey) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { body } = await fetchJson(`${projectUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const pageUsers = body?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < 200) break;
  }
  return users;
}

async function main() {
  log(`TechMigos backend export (${fidelity} fidelity)`);
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(BUNDLE, { recursive: true });

  // 1. Supabase project source of truth: config, migrations, functions.
  copyTree(path.join(ROOT, 'supabase'), path.join(BUNDLE, 'supabase'), (relative) => {
    if (relative.startsWith('.temp') || relative.startsWith('.branches')) return false;
    if (relative.endsWith('.env.local')) return false;
    return true;
  });
  const migrationFiles = fs.readdirSync(path.join(BUNDLE, 'supabase', 'migrations')).filter((name) => name.endsWith('.sql')).sort();
  record('copy supabase/ (config, migrations, functions)', 'ok', `${migrationFiles.length} migrations copied`);

  const functionNames = fs.existsSync(path.join(BUNDLE, 'supabase', 'functions'))
    ? fs.readdirSync(path.join(BUNDLE, 'supabase', 'functions'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];
  record('copy edge functions', 'ok', functionNames.join(', ') || 'none');

  // 2. Hosted inventory: deployed functions and secret names/digests.
  const functionsList = supabase(['functions', 'list', '--project-ref', projectRef, '--output', 'json']);
  if (functionsList.ok) {
    try {
      writeJson('meta/functions.json', JSON.parse(functionsList.stdout));
      record('list deployed edge functions', 'ok', 'meta/functions.json');
    } catch (error) {
      record('list deployed edge functions', 'warn', `unparsable output: ${error.message}`);
    }
  } else {
    record('list deployed edge functions', 'warn', functionsList.stderr.trim().slice(0, 200));
  }

  const secretsList = supabase(['secrets', 'list', '--project-ref', projectRef, '--output', 'json']);
  if (secretsList.ok) {
    try {
      writeJson('meta/secrets.json', JSON.parse(secretsList.stdout));
      record('list edge function secrets', 'ok', 'names and digests only; values are never exported');
    } catch (error) {
      record('list edge function secrets', 'warn', `unparsable output: ${error.message}`);
    }
  } else {
    record('list edge function secrets', 'warn', secretsList.stderr.trim().slice(0, 200));
  }

  // 3. Database export.
  const service = await resolveServiceKey();
  if (!service.key) record('resolve service role key', 'warn', service.error || 'not available');
  else record('resolve service role key', 'ok', `via ${service.source}; stored outside the bundle`);

  const dbDir = path.join(BUNDLE, 'db');
  fs.mkdirSync(dbDir, { recursive: true });

  if (dbUrl) {
    const dumps = [
      { file: 'roles.sql', flags: ['--role-only'] },
      { file: 'schema.sql', flags: [] },
      { file: 'data.sql', flags: ['--data-only', '--use-copy', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes'] },
      { file: 'auth.sql', flags: ['--schema', 'auth'] },
      { file: 'migration-history.sql', flags: ['--schema', 'supabase_migrations'] },
    ];
    for (const dump of dumps) {
      const result = supabase(['db', 'dump', '--db-url', dbUrl, '-f', path.join(dbDir, dump.file), ...dump.flags]);
      if (result.ok && fs.existsSync(path.join(dbDir, dump.file))) {
        const size = fs.statSync(path.join(dbDir, dump.file)).size;
        record(`db dump ${dump.file}`, 'ok', `${size} bytes`);
      } else {
        record(`db dump ${dump.file}`, 'warn', (result.stderr || result.stdout).trim().slice(0, 300));
      }
    }

    const types = supabase(['gen', 'types', 'typescript', '--db-url', dbUrl]);
    if (types.ok && types.stdout.trim()) {
      writeFile('types/database.ts', types.stdout.endsWith('\n') ? types.stdout : `${types.stdout}\n`);
      record('generate TypeScript types', 'ok', 'types/database.ts');
    } else {
      record('generate TypeScript types', 'warn', types.stderr.trim().slice(0, 200));
    }

    const migrationList = supabase(['migration', 'list', '--db-url', dbUrl, '--output', 'json']);
    if (migrationList.ok) {
      try {
        writeJson('meta/migration-list.json', JSON.parse(migrationList.stdout));
        record('list remote migration history', 'ok', 'meta/migration-list.json');
      } catch (error) {
        record('list remote migration history', 'warn', `unparsable output: ${error.message}`);
      }
    } else {
      record('list remote migration history', 'warn', migrationList.stderr.trim().slice(0, 200));
    }
  } else {
    record('pg_dump database (roles/schema/data/auth/history)', 'skipped', 'set SOURCE_DB_URL or SOURCE_DB_PASSWORD in .env.backend-export for a full-fidelity dump');
    const types = supabase(['gen', 'types', 'typescript', '--project-id', projectRef]);
    if (types.ok && types.stdout.trim()) {
      writeFile('types/database.ts', types.stdout.endsWith('\n') ? types.stdout : `${types.stdout}\n`);
      record('generate TypeScript types', 'ok', 'types/database.ts (via project id)');
    } else {
      record('generate TypeScript types', 'warn', types.stderr.trim().slice(0, 200));
    }
  }

  // 4. PostgREST row export. Always written: it is the verification source and
  //    the restore path when no pg_dump is available.
  const counts = {};
  if (!args['skip-rest-data'] && service.key) {
    try {
      const spec = (await fetchJson(`${projectUrl}/rest/v1/`, { headers: { apikey: service.key, Authorization: `Bearer ${service.key}` } })).body;
      const tables = Object.keys(spec.definitions || {}).sort();
      const restDir = path.join(dbDir, 'rest-data');
      fs.mkdirSync(restDir, { recursive: true });
      let total = 0;
      for (const table of tables) {
        const { columns, rows } = await exportTableData(service.key, table, spec);
        fs.writeFileSync(path.join(restDir, `${table}.jsonl`), rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
        counts[table] = { exported: rows.length, columns };
        total += rows.length;
        log(`  ${table}: ${rows.length} rows`);
      }
      writeJson('db/rest-data/manifest.json', { exportedAt: new Date().toISOString(), tables: Object.keys(counts).length, rows: total, counts });
      record('export PostgREST row data', 'ok', `${total} rows across ${tables.length} tables`);

      const verified = {};
      let mismatches = 0;
      for (const table of tables) {
        const live = await countRows(service.key, table);
        verified[table] = { exported: counts[table].exported, live };
        if (live !== null && live !== counts[table].exported) mismatches += 1;
      }
      writeJson('meta/row-count-verification.json', { checkedAt: new Date().toISOString(), tables: verified, mismatches });
      record('verify exported row counts against live counts', mismatches ? 'warn' : 'ok', mismatches ? `${mismatches} table(s) differ` : 'all tables match');

      const users = await fetchAuthUsers(service.key);
      writeJson('db/auth-users.json', {
        exportedAt: new Date().toISOString(),
        passwordHashesIncluded: false,
        note: 'Auth Admin API users. Passwords cannot be read through the API; restore requires a password reset for each account unless db/auth.sql (pg_dump) is present.',
        count: users.length,
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          phone: user.phone,
          email_confirmed_at: user.email_confirmed_at,
          confirmed_at: user.confirmed_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
          banned_until: user.banned_until,
        })),
      });
      record('export Auth users (no password hashes)', 'ok', `${users.length} users`);
    } catch (error) {
      record('export PostgREST row data', 'warn', error.message.slice(0, 300));
    }
  } else {
    record('export PostgREST row data', 'skipped', service.key ? '--skip-rest-data' : 'no service role key');
  }

  // 5. Storage objects.
  if (!args['skip-storage'] && service.key) {
    try {
      const { exportStorage } = await import('./export-storage.mjs');
      const manifest = await exportStorage({ url: projectUrl, serviceKey: service.key, outDir: path.join(BUNDLE, 'storage') });
      record('export storage objects', 'ok', `${manifest.totals.objects} objects in ${manifest.totals.buckets} buckets (${manifest.totals.bytes} bytes)`);
    } catch (error) {
      record('export storage objects', 'warn', error.message.slice(0, 300));
    }
  } else {
    record('export storage objects', 'skipped', service.key ? '--skip-storage' : 'no service role key');
  }

  // 6. Bundle metadata, restore kit, manifest.
  copyTree(path.join(SCRIPT_DIR), path.join(BUNDLE, 'scripts'), (relative) => !relative.endsWith('.mjs.map'));
  fs.copyFileSync(path.join(SCRIPT_DIR, 'README.md'), path.join(BUNDLE, 'README.md'));
  const reviewDoc = path.join(ROOT, 'docs', 'WEB-APP-ANALYSIS.md');
  if (fs.existsSync(reviewDoc)) fs.copyFileSync(reviewDoc, path.join(BUNDLE, 'APP-REVIEW.md'));
  writeFile('.env.clone.example', [
    '# Values for the NEW project. Fill these in, then run scripts/restore-backend.sh.',
    'TARGET_PROJECT_REF=',
    'TARGET_SUPABASE_URL=',
    'TARGET_DB_URL=',
    'TARGET_PUBLISHABLE_KEY=',
    'TARGET_SERVICE_ROLE_KEY=',
    '',
  ].join('\n'));

  writeJson('meta/source-project.json', {
    projectRef,
    projectUrl,
    dbRegion,
    fidelity,
    exportedAt: created.toISOString(),
    supabaseCliVersion: (supabase(['--version']).stdout || '').trim(),
    nodeVersion: process.version,
    migrations: migrationFiles.length,
    localFunctionSources: functionNames,
  });

  const files = listFiles(BUNDLE);
  const checksums = files
    .filter((file) => file !== 'MANIFEST.json' && file !== 'sha256sums.txt')
    .map((file) => ({ file, bytes: fs.statSync(path.join(BUNDLE, file)).size, sha256: sha256(fs.readFileSync(path.join(BUNDLE, file))) }));

  writeJson('MANIFEST.json', {
    bundle: stageName,
    generatedAt: created.toISOString(),
    fidelity,
    source: { projectRef, projectUrl },
    steps,
    rowCounts: counts,
    fileCount: checksums.length,
    totalBytes: checksums.reduce((sum, entry) => sum + entry.bytes, 0),
    checksums,
    secretsExported: false,
    authPasswordHashesExported: fs.existsSync(path.join(dbDir, 'auth.sql')),
    databaseDumpsExported: fs.existsSync(path.join(dbDir, 'data.sql')),
  });
  writeFile('sha256sums.txt', checksums.map((entry) => `${entry.sha256}  ${entry.file}`).join('\n') + '\n');

  const privateEnv = path.join(STAGE, 'secrets.private.env');
  fs.writeFileSync(
    privateEnv,
    [
      `SOURCE_PROJECT_REF=${projectRef}`,
      `SOURCE_SUPABASE_URL=${projectUrl}`,
      `SOURCE_DB_REGION=${dbRegion}`,
      dbUrl ? `SOURCE_DB_URL=${dbUrl}` : 'SOURCE_DB_URL=',
      service.key ? `SOURCE_SERVICE_ROLE_KEY=${service.key}` : 'SOURCE_SERVICE_ROLE_KEY=',
      '',
    ].join('\n'),
    { mode: 0o600 },
  );

  fs.mkdirSync(EXPORTS, { recursive: true });
  const zipPath = path.join(EXPORTS, `${stageName}.zip`);
  fs.rmSync(zipPath, { force: true });
  const zip = run('zip', ['-q', '-r', zipPath, 'bundle'], { cwd: STAGE });
  if (zip.ok) record('zip bundle', 'ok', path.relative(ROOT, zipPath));
  else {
    const py = run('python3', ['-m', 'zipfile', '--create', zipPath, 'bundle'], { cwd: STAGE });
    record('zip bundle', py.ok ? 'ok' : 'warn', py.ok ? path.relative(ROOT, zipPath) : `zip and python3 both failed: ${zip.stderr.slice(0, 200)}`);
  }

  log('');
  log(`Fidelity: ${fidelity}`);
  log(`Bundle:   ${path.relative(ROOT, BUNDLE)}`);
  log(`Zip:      ${path.relative(ROOT, zipPath)}${fs.existsSync(zipPath) ? ` (${fs.statSync(zipPath).size} bytes)` : ''}`);
  log(`Secrets:  ${path.relative(ROOT, privateEnv)} (never inside the zip)`);
  const warnings = steps.filter((step) => step.status === 'warn');
  log(`Warnings: ${warnings.length}`);
  for (const warning of warnings) log(`  - ${warning.step}: ${warning.detail}`);

  if (fidelity === 'degraded') {
    log('');
    log('Degraded export: add SOURCE_DB_URL (or SOURCE_DB_PASSWORD + SOURCE_DB_REGION) to');
    log('.env.backend-export and re-run to capture auth password hashes, roles and migration history.');
  }
}

main().catch((error) => {
  console.error(`export failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
