import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { installTemporaryADC, googleRequest, PROJECT_ID, PROJECT_NUMBER } from './cli-context.mjs';
import { COLLECTIONS, validateState, buildTeamView, proofTeams } from '../../functions/domain.js';
import { loadLocalEnv } from '../local-env.mjs';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { initializeFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const source = process.argv[2];
if (!source) throw new Error('Pass the current full finance backup JSON path.');
const backup = JSON.parse(fs.readFileSync(source, 'utf8'));
if (backup.format !== 'TechmigosFinanceBackup-v1') throw new Error('Unsupported backup format.');
const state = validateState(backup.state);
const config = loadLocalEnv();
if (config.PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) throw new Error('Configured project does not match the requested project.');
const project = await googleRequest(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`);
if (project.projectNumber !== PROJECT_NUMBER) throw new Error('Firebase project number mismatch.');
const cleanup = installTemporaryADC();
const app = initializeApp({ projectId: PROJECT_ID, storageBucket: config.PUBLIC_FIREBASE_STORAGE_BUCKET, credential: applicationDefault() });
const db = initializeFirestore(app, { preferRest: true });
const auth = getAuth(app);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const preserved = path.resolve('.backend-export', `finance-before-migration-${stamp}.json`);
fs.mkdirSync(path.dirname(preserved), { recursive: true });
fs.copyFileSync(source, preserved);
const digest = createHash('sha256').update(JSON.stringify(backup)).digest('hex');
const initial = db.doc('finance_initial/main');
const previous = await initial.get();
if (previous.exists && previous.data().digest !== digest) throw new Error('A different migration already exists. Use the app’s reviewed restore workflow instead of replacing cloud data.');

const founders = [
  { name: 'Vinay', email: 'vinay@techmigos.com', password: process.env.FINANCE_VINAY_PASSWORD },
  { name: 'Vishal', email: 'vishal@techmigos.com', password: process.env.FINANCE_VISHAL_PASSWORD },
];
for (const founder of founders) {
  let user;
  try { user = await auth.getUserByEmail(founder.email); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  if (!user) {
    if (!founder.password) throw new Error(`Provide the bootstrap password for ${founder.name} through the environment.`);
    user = await auth.createUser({ email: founder.email, displayName: founder.name, password: founder.password });
  }
  const profileRef = db.doc(`finance_users/${user.uid}`);
  if (!(await profileRef.get()).exists) await profileRef.create({ uid: user.uid, name: founder.name, email: founder.email, role: 'admin', teamId: '', active: true, validAfter: 0, updatedAt: FieldValue.serverTimestamp() });
}

if (!previous.exists) {
  const meta = await db.doc('finance_workspace/main').get();
  if (meta.exists) throw new Error('Cloud finance data already exists; refusing to overwrite it.');
  const batch = db.batch();
  for (const [key, collection] of Object.entries(COLLECTIONS)) for (const record of state[key]) batch.create(db.doc(`${collection}/${record.id}`), record);
  batch.create(db.doc('finance_settings/main'), state.settings);
  for (const proof of backup.proofs || []) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(proof.id)) throw new Error('Invalid proof ID in backup.');
    const match = /^data:([^;,]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(proof.dataUrl || '');
    if (!match) throw new Error('Invalid proof content in backup.');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 25 * 1024 * 1024) throw new Error('A proof exceeds 25 MB.');
    const storagePath = `finance/proofs/${proof.id}/file`;
    await getStorage(app).bucket().file(storagePath).save(bytes, { contentType: match[1], resumable: false });
    batch.create(db.doc(`finance_proofs/${proof.id}`), { id: proof.id, name: proof.name, mime: match[1], size: bytes.length, storagePath, addedAt: proof.addedAt || new Date().toISOString(), ownerUid: 'migration', teamIds: proofTeams(state, proof.id) });
  }
  for (const team of state.teams) batch.create(db.doc(`finance_team_views/${team.id}`), { ...buildTeamView(state, team.id), revision: 1 });
  batch.create(db.doc('finance_workspace/main'), { revision: 1, updatedBy: 'migration', updatedAt: FieldValue.serverTimestamp() });
  batch.create(initial, { state, digest, exportedAt: backup.exportedAt, migratedAt: FieldValue.serverTimestamp() });
  await batch.commit();
}
const counts = {};
for (const [key, collection] of Object.entries(COLLECTIONS)) {
  const documents = await db.collection(collection).get();
  counts[key] = documents.size;
  if (!previous.exists && documents.size !== state[key].length) throw new Error(`Verification failed for ${key}.`);
}
const bucket = getStorage(app).bucket();
const [bucketMetadata] = await bucket.getMetadata();
const origins = ['http://127.0.0.1:4321', 'http://localhost:4321', 'http://127.0.0.1:4325', 'https://www.techmigos.com', 'https://techmigos.com'];
const cors = [...(bucketMetadata.cors || []).filter(rule => !rule.origin?.some(origin => origins.includes(origin))), { origin: origins, method: ['GET', 'HEAD'], responseHeader: ['Content-Type', 'Content-Length'], maxAgeSeconds: 3600 }];
await bucket.setCorsConfiguration(cors);
const report = { projectId: PROJECT_ID, projectNumber: PROJECT_NUMBER, counts, proofFiles: (backup.proofs || []).length, idempotent: previous.exists, verifiedAt: new Date().toISOString() };
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/firebase-finance-migration.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
cleanup();
