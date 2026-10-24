import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

export const PROJECT_ID = 'techmigos-279f6';
export const PROJECT_NUMBER = '220055400039';
const cliRoot = process.env.FIREBASE_CLI_ROOT || path.join(process.env.APPDATA || '', 'npm/node_modules/firebase-tools');
const require = createRequire(path.join(cliRoot, 'package.json'));
const cliAuth = require('./lib/auth.js');
const cliApi = require('./lib/api.js');

export function installTemporaryADC() {
  const account = cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Sign in with firebase login first.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'techmigos-finance-adc-'));
  const file = path.join(directory, 'credentials.json');
  fs.writeFileSync(file, JSON.stringify({ type: 'authorized_user', client_id: cliApi.clientId(), client_secret: cliApi.clientSecret(), refresh_token: account.tokens.refresh_token }), { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
  const cleanup = () => { try { fs.unlinkSync(file); fs.rmdirSync(directory); } catch {} };
  process.once('exit', cleanup);
  return cleanup;
}

export async function cliCredential() {
  const account = cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Sign in with firebase login first.');
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']);
  return { access_token: token.access_token, expires_in: Math.max(60, Math.floor(((token.expires_at || Date.now() + 3500000) - Date.now()) / 1000)) };
}

export async function googleRequest(url, options = {}) {
  const token = await cliCredential();
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60000), headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google API ${response.status}: ${body.error?.message || 'Request failed'}`);
  return body;
}
