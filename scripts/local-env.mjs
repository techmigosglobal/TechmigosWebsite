import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJsonEnv(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return {};
  const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value ?? '')]),
  );
}

function readDotEnv(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

export function loadLocalEnv() {
  return {
    ...readDotEnv('.env'),
    ...readJsonEnv('env.json'),
    ...process.env,
  };
}
