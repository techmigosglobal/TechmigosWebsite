import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { installTemporaryADC, PROJECT_ID } from './cli-context.mjs';
import { COLLECTIONS, validateState, buildTeamView } from '../../functions/domain.js';
import { calculateProjectMetrics } from '../../functions/project-finance.js';

let apply = false, valuesFile = '';
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--apply') apply = true;
  else if (args[index] === '--values-file' && args[index+1]) valuesFile = args[++index];
  else throw Error('Usage: node scripts/firebase/set-fixed-project-values.mjs --values-file <private-json> [--apply]');
}
if (!valuesFile) throw Error('Provide a private JSON file of explicit project values.');
const requested = JSON.parse(fs.readFileSync(valuesFile, 'utf8'));
if (!Array.isArray(requested) || !requested.length || requested.length > 100 || new Set(requested.map(item=>item?.id)).size !== requested.length
  || requested.some(item=>!item||Object.keys(item).some(key=>!['id','name','value'].includes(key))||typeof item.id!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(item.id)||typeof item.name!=='string'||!item.name||item.name.length>100||!Number.isFinite(item.value)||item.value<=0)) throw Error('Invalid explicit project-value request.');
if (process.env.FIRESTORE_EMULATOR_HOST) throw Error('This maintenance operation requires the live Firebase project.');
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { initializeFirestore, FieldValue } = require('firebase-admin/firestore');
const cleanup = installTemporaryADC();
const ledgerHash = state => createHash('sha256').update(JSON.stringify({ transactions: state.transactions, invoices: state.invoices })).digest('hex');
try {
  const db = initializeFirestore(initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() }, 'fixed-project-values'), { preferRest: true });
  const result = await db.runTransaction(async tx => {
    const keys = Object.keys(COLLECTIONS);
    const [meta, settings, ...collections] = await Promise.all([tx.get(db.doc('finance_workspace/main')), tx.get(db.doc('finance_settings/main')), ...keys.map(key => tx.get(db.collection(COLLECTIONS[key])))]);
    if (!meta.exists || !Number.isSafeInteger(meta.data().revision)) throw Error('Finance revision is unavailable.');
    const before = validateState({ version: 4, settings: settings.data(), ...Object.fromEntries(keys.map((key, index) => [key, collections[index].docs.map(doc => doc.data())])) });
    const state = structuredClone(before), changed = [];
    for (const item of requested) {
      const project = state.projects.find(project => project.id === item.id);
      if (!project || project.name !== item.name) throw Error(`Verify the requested project: ${item.name}.`);
      if (project.projectValue === item.value) continue;
      project.projectValue = item.value;changed.push(project);
    }
    validateState(state);
    if (ledgerHash(before) !== ledgerHash(state)) throw Error('This operation must preserve all financial records.');
    if (apply && changed.length) {
      fs.mkdirSync('.backend-export', { recursive: true });
      try { fs.writeFileSync(`.backend-export/pre-fixed-project-values-${process.pid}.json`, JSON.stringify({ revision: meta.data().revision, state: before }, null, 2), { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      const revision = meta.data().revision + 1;
      for (const project of changed) tx.set(db.doc(`finance_projects/${project.id}`), project);
      for (const team of state.teams) tx.set(db.doc(`finance_team_views/${team.id}`), { ...buildTeamView(state, team.id), revision });
      tx.update(meta.ref, { revision, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'fixed-project-values' });
    }
    return { projectId: PROJECT_ID, applied: apply, changed: changed.length, ledgerUnchanged: true, ledgerHash: ledgerHash(before), projects: requested.map(item => {const m=calculateProjectMetrics(state,item.id);return { id:item.id, projectValue:m.projectValue, companyProjectShare:m.companyShare, teams:m.shares.map(share=>({team:share.teamName,pct:share.pct,entitled:share.allotted,paid:share.paid,remaining:share.remaining})) };}) };
  });
  if (apply) {
    const [transactions, invoices, ...projects] = await Promise.all([db.collection('finance_transactions').get(), db.collection('finance_invoices').get(), ...requested.map(item => db.doc(`finance_projects/${item.id}`).get())]);
    const hash = ledgerHash({ transactions: transactions.docs.map(doc=>doc.data()), invoices: invoices.docs.map(doc=>doc.data()) });
    if (hash !== result.ledgerHash || projects.some((doc,index)=>doc.data()?.projectValue!==requested[index].value)) throw Error('Post-update verification failed; inspect the private backup.');
    fs.mkdirSync('reports', { recursive: true });fs.writeFileSync('reports/firebase-fixed-project-values.json', JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
} finally { cleanup(); }
