import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OSV_QUERYBATCH_URL = 'https://api.osv.dev/v1/querybatch';
const BATCH_SIZE = 200;

export function extractNpmPackageVersions(lockfile) {
  if (![2, 3].includes(lockfile?.lockfileVersion) || !lockfile.packages || typeof lockfile.packages !== 'object') {
    throw new Error('Expected an npm package-lock v2 or v3 with a packages map.');
  }

  const coordinates = new Map();
  for (const [packagePath, entry] of Object.entries(lockfile.packages)) {
    if (!packagePath || !packagePath.includes('node_modules/') || !entry?.version) continue;
    const installedName = packagePath.split('node_modules/').at(-1);
    const packageName = entry.name || (installedName.startsWith('@')
      ? installedName.split('/').slice(0, 2).join('/')
      : installedName.split('/')[0]);
    if (!packageName) throw new Error(`Could not derive an npm package name from ${packagePath}.`);
    const key = `${packageName}\0${entry.version}`;
    coordinates.set(key, { package: { ecosystem: 'npm', name: packageName }, version: String(entry.version) });
  }
  if (!coordinates.size) throw new Error('The package-lock contains no versioned npm packages to audit.');
  return [...coordinates.values()];
}

async function queryOsv(queries) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(OSV_QUERYBATCH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queries }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`OSV querybatch returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (!Array.isArray(payload.results) || payload.results.length !== queries.length) {
        throw new Error('OSV returned a result count that did not match the submitted package queries.');
      }
      return payload.results;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('OSV package audit failed.');
}

export async function auditNpmPackageVersions(coordinates) {
  const findings = [];
  for (let offset = 0; offset < coordinates.length; offset += BATCH_SIZE) {
    const batch = coordinates.slice(offset, offset + BATCH_SIZE);
    const results = await queryOsv(batch);
    for (let index = 0; index < batch.length; index += 1) {
      let result = results[index];
      const vulnerabilities = [...(result.vulns || [])];
      while (result.next_page_token) {
        [result] = await queryOsv([{ ...batch[index], page_token: result.next_page_token }]);
        vulnerabilities.push(...(result.vulns || []));
      }
      if (vulnerabilities.length) {
        findings.push({
          name: batch[index].package.name,
          version: batch[index].version,
          ids: [...new Set(vulnerabilities.map(({ id }) => id).filter(Boolean))],
        });
      }
    }
  }
  return findings;
}

async function main() {
  const lockfilePath = path.resolve(process.cwd(), 'package-lock.json');
  const lockfile = JSON.parse(await fs.readFile(lockfilePath, 'utf8'));
  const coordinates = extractNpmPackageVersions(lockfile);
  const findings = await auditNpmPackageVersions(coordinates);
  console.log(`OSV checked ${coordinates.length} unique locked npm package versions.`);
  if (findings.length) {
    console.error(`Found advisories for ${findings.length} package versions:`);
    for (const finding of findings) {
      console.error(`- ${finding.name}@${finding.version}: ${finding.ids.join(', ') || 'advisory without an ID'}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('No known OSV advisories found. This supplements, but does not replace, npm audit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'OSV package audit failed.');
    process.exitCode = 2;
  });
}
