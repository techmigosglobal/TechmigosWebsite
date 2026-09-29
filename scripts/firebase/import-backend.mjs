#!/usr/bin/env node
// Imports the verified TechMigos Supabase export into Firebase.
//
// The importer is deliberately idempotent: Firestore documents use the source
// numeric IDs, Auth users use their source UUIDs, and Storage objects keep their
// bucket/path names under the Firebase default bucket.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'techmigos-279f6';
const SOURCE_BUNDLE = path.resolve(process.env.SOURCE_BUNDLE || path.join(process.cwd(), '.backend-export/techmigos-complete-backup-20260922T170520Z/bundle'));
const DATABASE = '(default)';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents`;
const identityBase = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`;
const storageBase = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`;
const storageUploadBase = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o`;
const firestoreDocumentBase = `projects/${PROJECT_ID}/databases/${DATABASE}/documents`;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}
function log(message) { console.log(`[firebase-import] ${message}`); }

function accessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'x-goog-user-project': PROJECT_ID,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (options.raw) {
    if (!response.ok) {
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch { body = text; }
      const message = body?.error?.message || body?.error?.status || body?.message || String(body || response.statusText);
      throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${message}`);
    }
    return { body: null, response };
  }
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.error?.status || body?.message || String(body || response.statusText);
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${message}`);
  }
  return { body, response };
}

function isDateKey(key) { return /(^|_)(at|login)$/i.test(key) || ['created_at', 'updated_at', 'last_login'].includes(key); }
function firestoreValue(value, key = '') {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string' && isDateKey(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return { timestampValue: date.toISOString() };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => firestoreValue(item, key)) } };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, firestoreValue(childValue, childKey)])) } };
  return { stringValue: String(value) };
}

function firestoreFields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, firestoreValue(value, key)]));
}

function decodeFirestoreValue(value) {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, decodeFirestoreValue(child)]));
  return null;
}

function decodeDocument(document) {
  if (!document) return null;
  const id = document.name.split('/').pop();
  return { id, ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)])) };
}

async function commitDocuments(documents) {
  for (let offset = 0; offset < documents.length; offset += 400) {
    const chunk = documents.slice(offset, offset + 400);
    await request(`${firestoreBase}:commit`, {
      method: 'POST',
      body: JSON.stringify({ writes: chunk.map(({ collection: collectionName, id, data }) => ({
        update: { name: `${firestoreDocumentBase}/${collectionName}/${encodeURIComponent(String(id))}`, fields: firestoreFields(data) },
      })) }),
    });
  }
}

async function listCollection(collectionName) {
  const result = await request(`${firestoreBase}/${collectionName}?pageSize=1000`);
  return (result.body?.documents || []).map(decodeDocument);
}

function sourceProofPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/finance-proofs\/(.+)$/i);
  return match ? decodeURIComponent(match[1]) : raw.replace(/^finance-proofs\//i, '');
}

function safeObjectFile(bucket, objectPath) {
  const root = path.resolve(SOURCE_BUNDLE, 'storage', bucket);
  const file = path.resolve(root, objectPath);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) throw new Error(`Missing source object: ${bucket}/${objectPath}`);
  return file;
}

async function importAuthUsers(users, profiles) {
  const profileByAuthId = new Map(profiles.map((profile) => [profile.auth_user_id, profile]));
  const payload = users.map((user) => {
    const profile = profileByAuthId.get(user.id);
    return {
      localId: user.id,
      email: user.email,
      displayName: user.user_metadata?.name || profile?.name || user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      disabled: profile?.status === 'inactive',
    };
  });
  if (!payload.length) return;
  const result = await request(`${identityBase}/accounts:batchCreate`, {
    method: 'POST',
    body: JSON.stringify({ users: payload, allowOverwrite: true, sanityCheck: true }),
  });
  if (result.body?.errors?.length) throw new Error(`Auth import returned ${result.body.errors.length} errors: ${JSON.stringify(result.body.errors.slice(0, 3))}`);
  log(`Auth users imported: ${payload.length} (password hashes were unavailable; users need password reset) `);
}

async function uploadStorageObjects(storageManifest) {
  const results = [];
  for (const object of storageManifest.objects) {
    const file = safeObjectFile(object.bucket, object.path);
    const bytes = fs.readFileSync(file);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== object.sha256 || bytes.length !== object.size) throw new Error(`Source checksum mismatch: ${object.bucket}/${object.path}`);
    const name = `${object.bucket}/${object.path}`;
    await request(`${storageUploadBase}?uploadType=media&name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': object.contentType, 'Content-Length': String(bytes.length) },
      body: bytes,
    });
    const downloaded = await request(`${storageBase}/${encodeURIComponent(name)}?alt=media`, { raw: true, headers: { Accept: '*/*' } });
    const downloadedBytes = Buffer.from(await downloaded.response.arrayBuffer());
    const downloadedDigest = crypto.createHash('sha256').update(downloadedBytes).digest('hex');
    if (downloadedDigest !== digest || downloadedBytes.length !== bytes.length) throw new Error(`Target checksum mismatch: ${name}`);
    results.push({ ...object, firebasePath: name, verified: true });
    log(`Storage verified: ${name} (${bytes.length} bytes)`);
  }
  return results;
}

async function main() {
  if (!fs.existsSync(SOURCE_BUNDLE)) throw new Error(`Source bundle not found: ${SOURCE_BUNDLE}`);
  const restRoot = path.join(SOURCE_BUNDLE, 'db', 'rest-data');
  const manifest = readJson(path.join(restRoot, 'manifest.json'));
  const authExport = readJson(path.join(SOURCE_BUNDLE, 'db', 'auth-users.json'));
  const storageManifest = readJson(path.join(SOURCE_BUNDLE, 'storage', 'storage-manifest.json'));
  const tableNames = Object.keys(manifest.counts);
  const tableRows = new Map(tableNames.map((table) => [table, readJsonl(path.join(restRoot, `${table}.jsonl`))]));
  const profiles = tableRows.get('crm_profiles') || [];
  const proofRows = (tableRows.get('crm_finances') || []).map((row) => ({
    ...row,
    proof_url: sourceProofPath(row.proof_url),
  }));
  tableRows.set('crm_finances', proofRows);

  log(`Target: ${PROJECT_ID}; source tables: ${tableNames.length}; source rows: ${tableNames.reduce((sum, table) => sum + tableRows.get(table).length, 0)}`);
  await importAuthUsers(authExport.users || [], profiles);

  const documents = [];
  for (const table of tableNames) {
    for (const row of tableRows.get(table)) documents.push({ collection: table, id: row.id, data: row });
  }
  for (const profile of profiles) {
    documents.push({ collection: 'user_profiles', id: profile.auth_user_id, data: { ...profile, profile_id: profile.id } });
    if (profile.username && profile.email) documents.push({ collection: 'login_aliases', id: profile.username.toLowerCase(), data: { email: profile.email, user_id: profile.auth_user_id, profile_id: profile.id } });
  }
  for (const object of storageManifest.objects) {
    const key = `${object.bucket}__${Buffer.from(object.path).toString('base64url')}`;
    documents.push({ collection: 'storage_objects', id: key, data: object });
  }
  await commitDocuments(documents);
  log(`Firestore documents written: ${documents.length}`);

  const verifiedObjects = await uploadStorageObjects(storageManifest);
  const proofLinks = proofRows.filter((row) => row.proof_url).map((row) => ({
    collection: 'migration_proof_links',
    id: row.id,
    data: { finance_id: row.id, source_path: row.proof_url, firebase_path: `finance-proofs/${row.proof_url}`, sha256: storageManifest.objects.find((object) => object.bucket === 'finance-proofs' && object.path === row.proof_url)?.sha256 || null },
  }));
  await commitDocuments(proofLinks);

  const meta = {
    sourceBundle: path.basename(SOURCE_BUNDLE),
    importedAt: new Date().toISOString(),
    sourceTables: tableNames.length,
    sourceRows: tableNames.reduce((sum, table) => sum + tableRows.get(table).length, 0),
    sourceAuthUsers: authExport.users?.length || 0,
    sourceStorageObjects: storageManifest.objects.length,
    verifiedStorageObjects: verifiedObjects.length,
    sourceStorageBytes: storageManifest.totals.bytes,
    financeProofRows: proofRows.filter((row) => row.proof_url).length,
    financeProofLinksVerified: proofLinks.filter((link) => link.data.sha256).length,
    targetProject: PROJECT_ID,
  };
  await commitDocuments([{ collection: 'migration_meta', id: 'supabase-to-firebase', data: meta }]);

  for (const table of tableNames.concat(['user_profiles', 'login_aliases', 'storage_objects'])) {
    const actual = (await listCollection(table)).length;
    const expected = tableNames.includes(table) ? tableRows.get(table).length : table === 'user_profiles' ? profiles.length : table === 'login_aliases' ? profiles.filter((profile) => profile.username && profile.email).length : storageManifest.objects.length;
    if (actual < expected) throw new Error(`Verification failed for ${table}: expected ${expected}, found ${actual}`);
    log(`Firestore verified: ${table} ${actual}/${expected}`);
  }
  const finance = await listCollection('crm_finances');
  const proofCount = finance.filter((row) => row.proof_url).length;
  if (proofCount !== proofLinks.length) throw new Error(`Finance proof linkage mismatch: ${proofCount} rows vs ${proofLinks.length} links`);
  log(`Finance proof linkage verified: ${proofCount} records; ${verifiedObjects.length} objects byte-verified`);
  fs.writeFileSync(path.join(SOURCE_BUNDLE, 'firebase-import-report.json'), `${JSON.stringify({ ...meta, verifiedObjects, proofLinks }, null, 2)}\n`);
  log(`Report: ${path.join(SOURCE_BUNDLE, 'firebase-import-report.json')}`);
}

main().catch((error) => {
  console.error(`[firebase-import] FAILED: ${error.message}`);
  process.exitCode = 1;
});
