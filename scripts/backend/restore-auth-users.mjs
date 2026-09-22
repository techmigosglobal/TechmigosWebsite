#!/usr/bin/env node
// Recreates the TechMigos Auth users listed in db/auth-users.json on a target
// project. Only used when db/auth.sql (pg_dump of the auth schema) is absent,
// because the Auth API cannot read existing password hashes.
//
// Every recreated account gets a random temporary password and requires a
// password change, so users keep their UUID, email, metadata and CRM links but
// must reset their password through the normal recovery flow.
//
// Usage:
//   node scripts/restore-auth-users.mjs --url <target-url> --service-key-file <file> [--file db/auth-users.json]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

function randomPassword() {
  return `Tm!${crypto.randomBytes(12).toString('base64url')}9`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = String(args.url || process.env.TARGET_SUPABASE_URL || '').replace(/\/$/, '');
  if (!url) throw new Error('--url (or TARGET_SUPABASE_URL) is required.');
  const key = args['service-key-file']
    ? fs.readFileSync(String(args['service-key-file']), 'utf8').trim()
    : String(args['service-key'] || process.env.TARGET_SERVICE_ROLE_KEY || '').trim();
  if (!key) throw new Error('A target service role key is required.');

  const file = path.resolve(String(args.file || 'db/auth-users.json'));
  const exportPayload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (exportPayload.passwordHashesIncluded) {
    throw new Error('This export contains password hashes; restore the auth schema with db/auth.sql instead of recreating users.');
  }

  const created = [];
  const failures = [];
  for (const user of exportPayload.users) {
    const response = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        phone: user.phone || undefined,
        email_confirm: true,
        password: randomPassword(),
        app_metadata: user.app_metadata || {},
        user_metadata: user.user_metadata || {},
      }),
    });
    if (response.ok) created.push(user.id);
    else failures.push({ id: user.id, error: `${response.status} ${(await response.text()).slice(0, 200)}` });
  }

  console.log(`Recreated ${created.length}/${exportPayload.users.length} auth users.`);
  console.log('Each recreated account needs a password reset before sign-in.');
  if (failures.length) {
    fs.writeFileSync('auth-restore-failures.json', `${JSON.stringify(failures, null, 2)}\n`);
    console.error('Some users could not be recreated (see auth-restore-failures.json).');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`auth restore failed: ${error.message}`);
  process.exitCode = 1;
});
