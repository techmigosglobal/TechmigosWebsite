import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { extractNpmPackageVersions } from '../scripts/audit-osv-lockfile.mjs';

test('OSV lockfile audit extracts and deduplicates scoped and nested npm package versions', () => {
  const coordinates = extractNpmPackageVersions({
    lockfileVersion: 3,
    packages: {
      '': { name: 'fixture', version: '1.0.0' },
      'node_modules/astro': { version: '7.3.3' },
      'node_modules/@scope/pkg': { version: '1.2.3' },
      'node_modules/astro/node_modules/@scope/pkg': { version: '1.2.3' },
      'node_modules/alias': { name: '@real/pkg', version: '4.5.6' },
      'node_modules/link': { link: true },
    },
  });

  assert.deepEqual(coordinates, [
    { package: { ecosystem: 'npm', name: 'astro' }, version: '7.3.3' },
    { package: { ecosystem: 'npm', name: '@scope/pkg' }, version: '1.2.3' },
    { package: { ecosystem: 'npm', name: '@real/pkg' }, version: '4.5.6' },
  ]);
});

test('OSV lockfile audit rejects unsupported or empty lockfiles instead of reporting a false clean scan', () => {
  assert.throws(() => extractNpmPackageVersions({ lockfileVersion: 1 }), /v2 or v3/);
  assert.throws(() => extractNpmPackageVersions({ lockfileVersion: 3, packages: {} }), /no versioned npm packages/);
});

test('scheduled site audit invokes real validation and keeps independent security scans running after npm audit fails', () => {
  const workflow = readFileSync(new URL('../.github/workflows/weekly-seo-audit.yml', import.meta.url), 'utf8');
  assert.match(workflow, /node scripts\/validate-site\.mjs/);
  assert.match(workflow, /npm run security:audit/);
  assert.match(workflow, /OSV lockfile audit\s+if: always\(\)\s+run: npm run security:osv/);
  assert.match(workflow, /Source security scan\s+if: always\(\)\s+run: npm run security:scan/);
  assert.doesNotMatch(workflow, /npm run seo:audit|upload-artifact@/);
  assert.match(workflow, /contents: read/);
});
