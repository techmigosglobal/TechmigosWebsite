import fs from 'node:fs';
import { createRequire } from 'node:module';
import { installTemporaryADC, PROJECT_ID } from './cli-context.mjs';

// This maintenance operation changes membership only, never account roles or passwords.
const assignments = [
  { email: 'vinay@techmigos.com', teamName: "Developer's Team" },
  { email: 'vishal@techmigos.com', teamName: "Operation's Team" },
];
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Usage: node scripts/firebase/assign-admin-teams.mjs [--apply]');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('This operation requires the live Firebase project.');
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { initializeFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const cleanup = installTemporaryADC();
try {
  const app = initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() }, 'assign-admin-teams');
  const db = initializeFirestore(app, { preferRest: true }), auth = getAuth(app);
  const accounts = await Promise.all(assignments.map(async assignment => ({ ...assignment, user: await auth.getUserByEmail(assignment.email) })));
  const result = await db.runTransaction(async tx => {
    const [teams, meta, ...profiles] = await Promise.all([
      tx.get(db.collection('finance_teams')),
      tx.get(db.doc('finance_workspace/main')),
      ...accounts.map(account => tx.get(db.doc(`finance_users/${account.user.uid}`))),
    ]);
    if (!meta.exists || !Number.isSafeInteger(meta.data().revision)) throw Error('Finance workspace revision is unavailable.');
    const planned = accounts.map((account, index) => {
      const matches = teams.docs.filter(doc => doc.data().name === account.teamName);
      if (matches.length !== 1) throw Error(`Expected exactly one team named ${account.teamName}.`);
      const profile = profiles[index], data = profile.data();
      if (!profile.exists || data.email !== account.email || data.role !== 'admin' || data.active !== true || account.user.disabled) throw Error(`Expected an active existing administrator: ${account.email}.`);
      return { profile, data, email: account.email, teamName: account.teamName, teamId: matches[0].id };
    });
    const changed = planned.filter(item => item.data.teamId !== item.teamId);
    if (apply && changed.length) {
      fs.mkdirSync('.backend-export', { recursive: true });
      // Exclusive creation preserves the original profiles if the transaction retries.
      const backup = `.backend-export/admin-teams-before-${process.pid}.json`;
      try { fs.writeFileSync(backup, JSON.stringify(planned.map(item => ({ uid: item.profile.id, ...item.data })), null, 2), { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      for (const item of changed) tx.update(item.profile.ref, { teamId: item.teamId, updatedAt: FieldValue.serverTimestamp() });
      tx.update(meta.ref, { revision: meta.data().revision + 1, updatedAt: FieldValue.serverTimestamp() });
    }
    return { projectId: PROJECT_ID, applied: apply, changed: changed.length, assignments: planned.map(item => ({ email: item.email, team: item.teamName, teamId: item.teamId, role: item.data.role })) };
  });
  if (apply) {
    const profiles = await Promise.all(accounts.map(account => db.doc(`finance_users/${account.user.uid}`).get()));
    if (profiles.some((profile, index) => profile.data()?.role !== 'admin' || profile.data()?.active !== true || profile.data()?.teamId !== result.assignments[index].teamId)) throw Error('Administrator membership verification failed.');
  }
  console.log(JSON.stringify(result, null, 2));
} finally { cleanup(); }
