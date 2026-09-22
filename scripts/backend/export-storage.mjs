#!/usr/bin/env node
// Supabase Storage export/restore helper for the TechMigos backend clone kit.
//
// Export mode (default):
//   node scripts/backend/export-storage.mjs --url <project-url> --service-key-file <file> --out <dir>
// Restore mode:
//   node scripts/backend/export-storage.mjs --mode restore --url <target-url> --service-key-file <file> \
//     --in <dir> [--create-buckets]
//
// The script never prints secret keys. It writes a manifest with one entry per
// object (bucket, path, size, mime type, checksum) so a restore can verify that
// every object arrived.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_BUCKET_KEEP = new Set(['resumes', 'invoice-signatures', 'finance-proofs', 'project-files']);

function parseArgs(argv) {
  const args = { mode: 'export', download: true };
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

export function readServiceKey(args) {
  const fromFile = args['service-key-file'];
  if (typeof fromFile === 'string' && fromFile) return fs.readFileSync(fromFile, 'utf8').trim();
  const direct = args['service-key'];
  if (typeof direct === 'string' && direct) return direct.trim();
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fromEnv) return fromEnv.trim();
  throw new Error('A service role key is required (--service-key-file or --service-key or SUPABASE_SERVICE_ROLE_KEY).');
}

export function createStorageClient(url, serviceKey) {
  const base = String(url).replace(/\/$/, '');
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function request(pathname, options = {}) {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
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
      throw new Error(`${options.method || 'GET'} ${pathname} failed (${response.status}): ${message}`);
    }
    return body;
  }

  return {
    request,
    async listBuckets() {
      return (await request('/storage/v1/bucket')) || [];
    },
    async createBucket(name, options) {
      return request('/storage/v1/bucket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...options }),
      });
    },
    async listObjects(bucket, prefix = '') {
      const search = new URLSearchParams({ limit: '1000', offset: '0' });
      if (prefix) search.set('prefix', prefix);
      const entries = (await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
      })) || [];
      return entries;
    },
    async downloadObject(bucket, objectPath) {
      const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`, { headers });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Download failed for ${bucket}/${objectPath} (${response.status}): ${text.slice(0, 200)}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    async uploadObject(bucket, objectPath, buffer, contentType) {
      const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': contentType || 'application/octet-stream',
          'x-upsert': 'true',
          'cache-control': '3600',
        },
        body: buffer,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed for ${bucket}/${objectPath} (${response.status}): ${text.slice(0, 200)}`);
      }
      return response.json().catch(() => ({}));
    },
  };
}

function encodePath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

export function safeLocalPath(root, bucket, objectPath) {
  const cleaned = objectPath
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[\u0000-\u001f]/g, '_'))
    .join('/');
  const target = path.resolve(root, bucket, cleaned);
  const allowedRoot = path.resolve(root);
  if (!target.startsWith(allowedRoot + path.sep)) throw new Error(`Refusing to write outside the export root: ${objectPath}`);
  return target;
}

async function listAllObjects(storage, bucket, prefix = '') {
  const entries = await storage.listObjects(bucket, prefix);
  const files = [];
  for (const entry of entries) {
    if (!entry || !entry.name) continue;
    const fullPath = prefix ? `${prefix}${entry.name}` : entry.name;
    const isFolder = !entry.id && (!entry.metadata || entry.metadata === null);
    if (isFolder) {
      files.push(...(await listAllObjects(storage, bucket, `${fullPath}/`)));
    } else {
      files.push({ path: fullPath, metadata: entry.metadata || {} });
    }
  }
  return files;
}

export async function exportStorage({ url, serviceKey, outDir, buckets }) {
  const storage = createStorageClient(url, serviceKey);
  const allBuckets = await storage.listBuckets();
  const wanted = buckets && buckets.length
    ? allBuckets.filter((bucket) => buckets.includes(bucket.name))
    : allBuckets;
  const missingExpected = [...DEFAULT_BUCKET_KEEP].filter((name) => !allBuckets.some((bucket) => bucket.name === name));
  if (missingExpected.length && !buckets) {
    console.warn(`  note: buckets declared by the migrations but absent in this project: ${missingExpected.join(', ')}`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { exportedAt: new Date().toISOString(), projectUrl: url, buckets: [], objects: [], totals: { buckets: 0, objects: 0, bytes: 0 } };

  for (const bucket of wanted) {
    const record = {
      name: bucket.name,
      public: Boolean(bucket.public),
      fileSizeLimit: bucket.file_size_limit ?? null,
      allowedMimeTypes: bucket.allowed_mime_types ?? null,
      objectCount: 0,
    };
    const objects = await listAllObjects(storage, bucket.name);
    for (const object of objects) {
      const buffer = await storage.downloadObject(bucket.name, object.path);
      const target = safeLocalPath(outDir, bucket.name, object.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);
      const contentType = object.metadata?.mimetype || 'application/octet-stream';
      manifest.objects.push({
        bucket: bucket.name,
        path: object.path,
        size: buffer.length,
        contentType,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      });
      record.objectCount += 1;
      manifest.totals.objects += 1;
      manifest.totals.bytes += buffer.length;
      process.stdout.write(`  ${bucket.name}/${object.path} (${buffer.length} bytes)\n`);
    }
    manifest.buckets.push(record);
    manifest.totals.buckets += 1;
  }

  fs.writeFileSync(path.join(outDir, 'storage-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function restoreStorage({ url, serviceKey, inDir, createBuckets = false }) {
  const manifestPath = path.join(inDir, 'storage-manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing storage manifest: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const storage = createStorageClient(url, serviceKey);

  const existing = new Set((await storage.listBuckets()).map((bucket) => bucket.name));
  for (const bucket of manifest.buckets) {
    if (existing.has(bucket.name)) continue;
    if (!createBuckets) throw new Error(`Target project is missing bucket "${bucket.name}". Re-run with --create-buckets.`);
    await storage.createBucket(bucket.name, {
      public: bucket.public,
      file_size_limit: bucket.fileSizeLimit ?? null,
      allowed_mime_types: bucket.allowedMimeTypes ?? null,
    });
  }

  const failures = [];
  for (const object of manifest.objects) {
    const localPath = safeLocalPath(inDir, object.bucket, object.path);
    if (!fs.existsSync(localPath)) {
      failures.push({ ...object, error: 'local file missing' });
      continue;
    }
    const buffer = fs.readFileSync(localPath);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    if (sha256 !== object.sha256) {
      failures.push({ ...object, error: 'checksum mismatch' });
      continue;
    }
    try {
      await storage.uploadObject(object.bucket, object.path, buffer, object.contentType);
    } catch (error) {
      failures.push({ ...object, error: error.message });
    }
  }
  return { restored: manifest.objects.length - failures.length, total: manifest.objects.length, failures };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || 'export');
  const url = String(args.url || process.env.SUPABASE_URL || '');
  if (!url) throw new Error('--url (or SUPABASE_URL) is required.');
  const serviceKey = readServiceKey(args);

  if (mode === 'restore') {
    const result = await restoreStorage({ url, serviceKey, inDir: String(args.in || 'storage'), createBuckets: Boolean(args['create-buckets']) });
    console.log(`Restored ${result.restored}/${result.total} storage objects${result.failures.length ? ` (${result.failures.length} failed)` : ''}.`);
    if (result.failures.length) {
      fs.writeFileSync('storage-restore-failures.json', `${JSON.stringify(result.failures, null, 2)}\n`);
      process.exitCode = 1;
    }
    return;
  }

  const bucketFilter = typeof args.buckets === 'string' ? args.buckets.split(',').map((value) => value.trim()).filter(Boolean) : null;
  const manifest = await exportStorage({ url, serviceKey, outDir: String(args.out || 'storage'), buckets: bucketFilter });
  console.log(`Exported ${manifest.totals.objects} objects from ${manifest.totals.buckets} buckets (${manifest.totals.bytes} bytes).`);
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`storage export failed: ${error.message}`);
    process.exitCode = 1;
  });
}
