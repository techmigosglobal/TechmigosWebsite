import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { COLLECTIONS, validateState, validateMember, buildTeamView, proofTeams } from './domain.js';
import { settlePaidInvoices } from './invoice-payments.js';

initializeApp();
const db = getFirestore();
const root = db.doc('finance_workspace/main');
const profiles = db.collection('finance_users');
const proofCollection = db.collection('finance_proofs');
const reject = (code, message) => { throw new HttpsError(code, message); };

async function profileFor(request, admin = false) {
  if (!request.auth) reject('unauthenticated', 'Sign in to continue.');
  const snapshot = await profiles.doc(request.auth.uid).get();
  const profile = snapshot.data();
  if (!profile?.active || (request.auth.token.auth_time || 0) < (profile.validAfter || 0)) reject('permission-denied', 'This account does not have active finance access.');
  if (admin && profile.role !== 'admin') reject('permission-denied', 'Administrator access is required.');
  return { ...profile, uid: snapshot.id };
}

async function readFinance(tx) {
  const keys = Object.keys(COLLECTIONS);
  const snapshots = await Promise.all(keys.map(key => tx.get(db.collection(COLLECTIONS[key]))));
  const settings = await tx.get(db.doc('finance_settings/main'));
  return { version: 4, ...Object.fromEntries(keys.map((key, index) => [key, snapshots[index].docs.map(doc => doc.data())])), settings: settings.data() || { businessName: 'Techmigos', businessEmail: '', businessPhone: '', businessAddress: '', currency: 'INR' } };
}

async function loadFinance(profile) {
  if (profile.role !== 'admin') {
    const view = await db.doc(`finance_team_views/${profile.teamId}`).get();
    return { profile, view: view.data() || { team: { id: profile.teamId, name: 'Your team' }, projects: [], payouts: [] } };
  }
  return db.runTransaction(async tx => {
    const meta = await tx.get(root);
    if (!meta.exists) reject('failed-precondition', 'Finance data has not been migrated yet.');
    return { profile, state: await readFinance(tx), revision: meta.data().revision };
  }, { readOnly: true });
}

async function saveFinance(input, uid) {
  let state;
  try {
    const paymentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    state = validateState(settlePaidInvoices(validateState(input.state), paymentDate).state);
  } catch (error) { reject('invalid-argument', error.message); }
  if (!Number.isInteger(input.revision) || input.revision < 0) reject('invalid-argument', 'Invalid workspace revision.');
  const requestedState = state;
  return db.runTransaction(async tx => {
    let state = structuredClone(requestedState);
    const meta = await tx.get(root);
    if ((meta.data()?.revision || 0) !== input.revision) reject('aborted', 'Another administrator updated this workspace. Reload the latest data and try again.');
    const before = await readFinance(tx);
    for (const project of state.projects) {
      const previous = before.projects.find(item => item.id === project.id);
      if (project.projectValue === undefined && previous?.projectValue !== undefined) project.projectValue = previous.projectValue;
      if (!previous && project.projectValue === undefined) reject('invalid-argument', 'Enter a fixed project value when creating a project.');
    }
    for (const invoice of state.invoices) {
      const previous = before.invoices.find(item => item.id === invoice.id);
      if (invoice.companyOnly === undefined && previous?.companyOnly !== undefined) invoice.companyOnly = previous.companyOnly;
    }
    for (const record of state.transactions) {
      const previous = before.transactions.find(item => item.id === record.id);
      if (record.type === 'income' && record.companyOnly === undefined && previous?.companyOnly !== undefined) record.companyOnly = previous.companyOnly;
    }
    try { state = validateState(settlePaidInvoices(state).state); } catch (error) { reject('invalid-argument', error.message); }
    const [users, proofs] = await Promise.all([tx.get(profiles), tx.get(proofCollection)]);
    const teamIds = new Set(state.teams.map(team => team.id));
    if (users.docs.some(doc => doc.data().role === 'member' && !teamIds.has(doc.data().teamId))) reject('failed-precondition', 'Reassign a team’s members before removing the team.');
    const proofIds = new Set(proofs.docs.map(doc => doc.id));
    if ([...state.transactions, ...state.invoices].some(record => record.proofIds.some(id => !proofIds.has(id)))) reject('failed-precondition', 'A referenced proof is missing. Upload it again before saving.');
    let writes = 1;
    for (const [key, collection] of Object.entries(COLLECTIONS)) {
      const previous = new Map(before[key].map(record => [record.id, record]));
      const next = new Map(state[key].map(record => [record.id, record]));
      for (const record of state[key]) {
        if (JSON.stringify(previous.get(record.id)) !== JSON.stringify(record)) { tx.set(db.doc(`${collection}/${record.id}`), record); writes++; }
      }
      for (const record of before[key]) if (!next.has(record.id)) { tx.delete(db.doc(`${collection}/${record.id}`)); writes++; }
    }
    if (JSON.stringify(before.settings) !== JSON.stringify(state.settings)) { tx.set(db.doc('finance_settings/main'), state.settings); writes++; }
    const revision = input.revision + 1;
    for (const team of state.teams) {
      const view = { ...buildTeamView(state, team.id), revision };
      if (Buffer.byteLength(JSON.stringify(view)) > 800000) reject('resource-exhausted', 'This team’s view is too large; archive older records before continuing.');
      tx.set(db.doc(`finance_team_views/${team.id}`), view); writes++;
    }
    for (const team of before.teams) if (!teamIds.has(team.id)) { tx.delete(db.doc(`finance_team_views/${team.id}`)); writes++; }
    for (const proof of proofs.docs) {
      const allowedTeams = proofTeams(state, proof.id);
      if (JSON.stringify(proof.data().teamIds || []) !== JSON.stringify(allowedTeams)) { tx.update(proof.ref, { teamIds: allowedTeams }); writes++; }
    }
    if (writes > 450) reject('resource-exhausted', 'Too many records changed at once. Import this backup in smaller batches.');
    tx.set(root, { revision, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return { revision, state };
  });
}

async function manageMember(input) {
  let member;
  try { member = validateMember(input); } catch (error) { reject('invalid-argument', error.message); }
  const team = await db.doc(`finance_teams/${member.teamId}`).get();
  if (!team.exists) reject('invalid-argument', 'Choose an existing team.');
  const uid = member.uid || `fin_${createHash('sha256').update(member.requestId).digest('hex').slice(0, 28)}`;
  const ref = profiles.doc(uid);
  const previous = (await ref.get()).data();
  if (previous?.role === 'admin') reject('permission-denied', 'Administrator accounts cannot be changed from Teams.');
  if (member.uid && !previous) reject('not-found', 'This member no longer exists.');
  let created = false;
  try {
    let user;
    try { user = await getAuth().getUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    if (!user) {
      await getAuth().createUser({ uid, email: member.email, password: member.password, displayName: member.name, disabled: !member.active });
      created = true;
    } else {
      if (!previous && member.uid) reject('permission-denied', 'This account is not managed by finance.');
      await getAuth().updateUser(uid, { email: member.email, displayName: member.name, disabled: !member.active, ...(member.password ? { password: member.password } : {}) });
    }
    const validAfter = previous && (member.password || !member.active) ? Math.floor(Date.now() / 1000) : previous?.validAfter || 0;
    await db.runTransaction(async tx => {
      const currentTeam = await tx.get(team.ref);
      const meta = await tx.get(root);
      if (!currentTeam.exists) reject('failed-precondition', 'This team was removed. Choose another team.');
      tx.set(ref, { uid, name: member.name, email: member.email, teamId: member.teamId, role: 'member', active: member.active, validAfter, updatedAt: FieldValue.serverTimestamp() });
      tx.update(root, { revision: (meta.data()?.revision || 0) + 1, updatedAt: FieldValue.serverTimestamp() });
    });
    if (previous && (member.password || !member.active)) await getAuth().revokeRefreshTokens(uid);
    return { uid };
  } catch (error) {
    if (created) await getAuth().deleteUser(uid).catch(() => {});
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') reject('already-exists', 'This email already has a login. Use another email.');
    reject('internal', 'The member account could not be saved. Try again.');
  }
}

async function registerProof(input, uid) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id || '') || typeof input.name !== 'string' || !input.name || input.name.length > 250) reject('invalid-argument', 'Invalid proof details.');
  const storagePath = `finance/proofs/${input.id}/file`;
  const [metadata] = await getStorage().bucket().file(storagePath).getMetadata();
  if (Number(metadata.size) > 25 * 1024 * 1024) reject('invalid-argument', 'Proofs must be no larger than 25 MB.');
  const proof = { id: input.id, name: input.name, size: Number(metadata.size), mime: String(metadata.contentType || 'application/octet-stream').slice(0, 150), storagePath, addedAt: new Date().toISOString(), ownerUid: uid, teamIds: [] };
  await proofCollection.doc(input.id).create(proof);
  return proof;
}

async function removeProof(id) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id || '')) reject('invalid-argument', 'Invalid proof ID.');
  await db.runTransaction(async tx => {
    const state = await readFinance(tx);
    if ([...state.transactions, ...state.invoices].some(record => record.proofIds.includes(id))) reject('failed-precondition', 'Remove this proof from its transaction before deleting it.');
    tx.delete(proofCollection.doc(id));
  });
  await getStorage().bucket().file(`finance/proofs/${id}/file`).delete({ ignoreNotFound: true });
  return { deleted: true };
}

export const financeApi = onCall({ region: 'asia-south1', maxInstances: 3, memory: '256MiB', timeoutSeconds: 60 }, async request => {
  const action = request.data?.action;
  const profile = await profileFor(request, action !== 'load');
  if (action === 'load') return loadFinance(profile);
  if (action === 'save') return saveFinance(request.data, profile.uid);
  if (action === 'member') return manageMember(request.data.member);
  if (action === 'members') return { members: (await profiles.get()).docs.map(doc => ({ ...doc.data(), uid: doc.id })) };
  if (action === 'registerProof') return registerProof(request.data, profile.uid);
  if (action === 'removeProof') return removeProof(request.data.id);
  if (action === 'initial') return { state: (await db.doc('finance_initial/main').get()).data()?.state };
  reject('invalid-argument', 'Unknown finance action.');
});
