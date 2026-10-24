import fs from 'node:fs';
import { createRequire } from 'node:module';
import { installTemporaryADC, PROJECT_ID } from './cli-context.mjs';
import { COLLECTIONS, validateState, buildTeamView } from '../../functions/domain.js';
import { settlePaidInvoices } from '../../functions/invoice-payments.js';

const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Usage: node scripts/firebase/reconcile-paid-invoices.mjs [--apply]');
if (process.env.FIRESTORE_EMULATOR_HOST) throw Error('This maintenance command requires the live Firebase project.');
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { initializeFirestore, FieldValue } = require('firebase-admin/firestore');
const cleanup = installTemporaryADC();
try {
  const db = initializeFirestore(initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() }, 'reconcile-paid-invoices'), { preferRest: true });
  const result = await db.runTransaction(async tx => {
    const keys = Object.keys(COLLECTIONS);
    const [meta, settings, ...collections] = await Promise.all([tx.get(db.doc('finance_workspace/main')), tx.get(db.doc('finance_settings/main')), ...keys.map(key => tx.get(db.collection(COLLECTIONS[key])))]);
    if (!meta.exists || !Number.isSafeInteger(meta.data().revision)) throw Error('Finance workspace revision is unavailable.');
    const before = validateState({ version: 4, settings: settings.data(), ...Object.fromEntries(keys.map((key, index) => [key, collections[index].docs.map(doc => doc.data())])) });
    const { state, receipts } = settlePaidInvoices(before);validateState(state);
    const changed = state.invoices.filter((invoice, index) => invoice.status !== before.invoices[index].status);
    const revision = meta.data().revision + 1;
    if (apply && changed.length) {
      if (receipts.length + changed.length + state.teams.length + 1 > 450) throw Error('Too many records for one reconciliation.');
      fs.mkdirSync('.backend-export', { recursive: true });
      try { fs.writeFileSync(`.backend-export/pre-paid-invoice-reconciliation-${process.pid}.json`, JSON.stringify({ revision: meta.data().revision, state: before }, null, 2), { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      for (const invoice of changed) tx.set(db.doc(`finance_invoices/${invoice.id}`), invoice);
      for (const receipt of receipts) tx.create(db.doc(`finance_transactions/${receipt.id}`), receipt);
      for (const team of state.teams) {
        const view = { ...buildTeamView(state, team.id), revision };
        if (Buffer.byteLength(JSON.stringify(view)) > 800000) throw Error('Team projection exceeds the safe size limit.');
        tx.set(db.doc(`finance_team_views/${team.id}`), view);
      }
      tx.update(meta.ref, { revision, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'paid-invoice-reconciliation' });
    }
    return { projectId: PROJECT_ID, applied: apply, normalizedPaidInvoices: changed.length, addedReceipts: receipts.length, addedIncome: receipts.reduce((total, receipt) => total + receipt.amount, 0), projects: state.projects.map(project => ({ id: project.id, addedIncome: receipts.filter(receipt => receipt.projectId === project.id).reduce((total, receipt) => total + receipt.amount, 0) })), receiptIds: receipts.map(receipt => receipt.id), historicalPaymentDate: 'Invoice issue date; actual historical payment date was not provided.' };
  });
  if (apply) {
    const receipts = await Promise.all(result.receiptIds.map(id => db.doc(`finance_transactions/${id}`).get()));
    if (receipts.some(doc => !doc.exists || doc.data().type !== 'income' || doc.data().status !== 'Received')) throw Error('Reconciliation read-back failed.');
    fs.mkdirSync('reports', { recursive: true });fs.writeFileSync('reports/firebase-paid-invoices.json', JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
} finally { cleanup(); }
