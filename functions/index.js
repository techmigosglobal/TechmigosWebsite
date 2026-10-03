import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();

const db = getFirestore();
const auth = getAuth();
const REGION = 'asia-south1';
const DEFAULT_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'techmigos-279f6'}.firebasestorage.app`;
const ROLES = new Set(['company_admin', 'company_member', 'client']);
const STATUSES = new Set(['active', 'inactive', 'pending']);
const FIRESTORE_BATCH_LIMIT = 450;

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth.uid;
}

async function callerProfile(uid) {
  const snapshot = await db.collection('crm_profiles').where('auth_user_id', '==', uid).limit(1).get();
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

async function requireAdmin(request) {
  const uid = requireAuth(request);
  const profile = await callerProfile(uid);
  if (!profile || profile.role !== 'company_admin' || profile.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only active company administrators can manage users.');
  }
  return profile;
}

const PRIVATE_STORAGE_BUCKETS = new Set(['finance-proofs', 'invoice-signatures', 'project-files']);

function normalizePrivateStoragePath(bucket, value) {
  let objectPath = String(value || '').trim().replace(/^\/+/, '');
  if (objectPath.startsWith(`${bucket}/`)) objectPath = objectPath.slice(bucket.length + 1);
  const segments = objectPath.split('/');
  if (!objectPath || objectPath.includes('\\') || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new HttpsError('invalid-argument', 'Invalid private storage path.');
  }
  return objectPath;
}

function canReadPrivateStorage(profile, bucket) {
  if (!profile || profile.status !== 'active') return false;
  if (bucket === 'project-files') return profile.role === 'company_admin' || profile.role === 'company_member';
  return profile.role === 'company_admin';
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
  }
  return value;
}

function normalizeUsername(value, fallback = 'user') {
  const source = String(value || fallback).trim().toLowerCase();
  let username = source.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  if (username.length < 3) username = 'user';
  return username;
}

async function uniqueUsername(value, profileId = null) {
  const base = normalizeUsername(value);
  let candidate = base;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const alias = await db.doc(`login_aliases/${candidate}`).get();
    if (!alias.exists || String(alias.data()?.profile_id || '') === String(profileId || '')) return candidate;
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, 64 - suffixText.length)}${suffixText}`;
  }
  throw new HttpsError('already-exists', 'Could not generate a unique username.');
}

async function nextProfileId() {
  const snapshot = await db.collection('crm_profiles').orderBy('id', 'desc').limit(1).get();
  return snapshot.empty ? 1 : Number(snapshot.docs[0].data().id || 0) + 1;
}

function profileData({ id, uid, email, name, role, status, clientId, department, username, mustChangePassword }) {
  return {
    id,
    auth_user_id: uid,
    email,
    name,
    role,
    status,
    client_id: role === 'client' ? (clientId == null || clientId === '' ? null : Number(clientId)) : null,
    department: department || '',
    username,
    must_change_password: Boolean(mustChangePassword),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function writeProfile({ id, uid, email, name, role, status, clientId, department, username, mustChangePassword, preserveCreatedAt = false }) {
  const data = profileData({ id, uid, email, name, role, status, clientId, department, username, mustChangePassword });
  if (preserveCreatedAt) delete data.created_at;
  const batch = db.batch();
  batch.set(db.doc(`crm_profiles/${id}`), data, { merge: true });
  batch.set(db.doc(`user_profiles/${uid}`), { ...data, profile_id: id }, { merge: true });
  batch.set(db.doc(`login_aliases/${String(username).toLowerCase()}`), { email, user_id: uid, profile_id: id }, { merge: true });
  await batch.commit();
}

async function commitFirestoreOperations(operations) {
  for (let offset = 0; offset < operations.length; offset += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    operations.slice(offset, offset + FIRESTORE_BATCH_LIMIT).forEach((operation) => {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else batch.update(operation.ref, operation.data);
    });
    await batch.commit();
  }
}

async function profileSnapshotById(profileId) {
  const id = Number(profileId);
  const direct = await db.doc(`crm_profiles/${id}`).get();
  if (direct.exists) return direct;
  const matches = await db.collection('crm_profiles').where('id', '==', id).limit(1).get();
  return matches.empty ? null : matches.docs[0];
}

async function deleteProfileAccount(profileId, callerUid) {
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpsError('invalid-argument', 'A valid profile id is required.');
  const profileSnapshot = await profileSnapshotById(id);
  // A cached directory can outlive a profile that was already removed. Treat
  // that retry as successful so the caller can refresh and discard the stale row.
  if (!profileSnapshot) return { ok: true, profile_id: id, already_deleted: true };
  const profileRef = profileSnapshot.ref;
  const profile = profileSnapshot.data();
  const uid = clean(profile.auth_user_id);
  if (!uid) throw new HttpsError('failed-precondition', 'This profile has no linked authentication account.');
  if (uid === callerUid) throw new HttpsError('failed-precondition', 'You cannot delete the administrator account currently in use.');

  const [aliases, memberships, assignedTickets, ownedProjects] = await Promise.all([
    db.collection('login_aliases').where('user_id', '==', uid).get(),
    db.collection('crm_project_members').where('profile_id', '==', id).get(),
    db.collection('crm_tickets').where('assigned_user_id', '==', uid).get(),
    db.collection('crm_projects').where('owner_user_id', '==', uid).get(),
  ]);

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw new HttpsError('internal', 'Could not delete the Firebase authentication account.');
  }

  const operations = [
    { type: 'delete', ref: profileRef },
    { type: 'delete', ref: db.doc(`user_profiles/${uid}`) },
    ...aliases.docs.map((snapshot) => ({ type: 'delete', ref: snapshot.ref })),
    ...memberships.docs.map((snapshot) => ({ type: 'delete', ref: snapshot.ref })),
    ...assignedTickets.docs.map((snapshot) => ({ type: 'update', ref: snapshot.ref, data: { assigned_user_id: null, assigned_to: '', updated_at: FieldValue.serverTimestamp() } })),
    ...ownedProjects.docs.map((snapshot) => ({ type: 'update', ref: snapshot.ref, data: { owner_user_id: '', project_manager: '', updated_at: FieldValue.serverTimestamp() } })),
  ];
  try {
    await commitFirestoreOperations(operations);
  } catch (error) {
    throw new HttpsError('internal', 'The authentication account was deleted, but directory cleanup did not finish. Retry the deletion or contact support.');
  }

  return {
    ok: true,
    profile_id: id,
    deleted_auth_user_id: uid,
    removed_aliases: aliases.size,
    removed_project_memberships: memberships.size,
    unassigned_tickets: assignedTickets.size,
    unassigned_projects: ownedProjects.size,
  };
}

export const adminUsers = onCall({ region: REGION }, async (request) => {
  const body = request.data || {};
  const operation = String(body.operation || '');

  if (operation === 'change_initial_password') {
    const uid = requireAuth(request);
    const profile = await callerProfile(uid);
    if (!profile || !profile.must_change_password || !['active', 'pending'].includes(profile.status)) {
      return { error: 'This account is not awaiting an initial password change.' };
    }
    const password = validatePassword(body.password);
    await auth.updateUser(uid, { password, disabled: false });
    const nextStatus = profile.status === 'pending' ? 'active' : profile.status;
    await db.doc(`crm_profiles/${profile.id}`).set({ must_change_password: false, status: nextStatus, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    await db.doc(`user_profiles/${uid}`).set({ must_change_password: false, status: nextStatus, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  await requireAdmin(request);

  if (operation === 'provision' || operation === 'invite') {
    const email = clean(body.email)?.toLowerCase();
    const name = clean(body.name) || email;
    const role = clean(body.role) || 'company_member';
    const status = clean(body.status) || (operation === 'invite' ? 'pending' : 'active');
    const usernameInput = clean(body.username);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('invalid-argument', 'A valid email is required.');
    if (!ROLES.has(role)) throw new HttpsError('invalid-argument', 'Choose a valid CRM role.');
    if (!STATUSES.has(status)) throw new HttpsError('invalid-argument', 'Choose a valid account status.');
    const username = await uniqueUsername(usernameInput || email.split('@')[0] || name);
    const password = operation === 'provision' ? validatePassword(body.password || `${cryptoRandom()}A!`) : undefined;
    const user = await auth.createUser({ email, displayName: name, ...(password ? { password } : {}), emailVerified: operation === 'provision', disabled: status === 'inactive' });
    const id = await nextProfileId();
    await writeProfile({ id, uid: user.uid, email, name, role, status, clientId: body.client_id, department: clean(body.department), username, mustChangePassword: operation === 'invite' });
    return { profile: { id, auth_user_id: user.uid, email, name, role, status, client_id: role === 'client' ? Number(body.client_id) : null, department: clean(body.department) || '', username, must_change_password: operation === 'invite' }, invite_requires_password_reset: operation === 'invite' };
  }

  if (operation === 'update_profile') {
    const id = Number(body.profile_id);
    const existingSnapshot = await db.doc(`crm_profiles/${id}`).get();
    if (!existingSnapshot.exists) throw new Error('Profile not found.');
    const existing = existingSnapshot.data();
    const uid = existing.auth_user_id;
    const email = clean(body.email) || existing.email;
    const name = clean(body.name) || existing.name;
    const role = clean(body.role) || existing.role;
    const status = clean(body.status) || existing.status;
    const username = clean(body.username)?.toLowerCase() || existing.username;
    if (!ROLES.has(role) || !STATUSES.has(status)) throw new HttpsError('invalid-argument', 'Choose a valid role and status.');
    const normalizedUsername = await uniqueUsername(username || email.split('@')[0] || name, id);
    await auth.updateUser(uid, { email, displayName: name, disabled: status === 'inactive' });
    await writeProfile({ id, uid, email, name, role, status, clientId: body.client_id, department: clean(body.department) ?? existing.department, username: normalizedUsername, mustChangePassword: Boolean(existing.must_change_password), preserveCreatedAt: true });
    if (existing.username && existing.username.toLowerCase() !== normalizedUsername) await db.doc(`login_aliases/${existing.username.toLowerCase()}`).delete();
    return { profile: { ...existing, id, auth_user_id: uid, email, name, role, status, client_id: role === 'client' ? Number(body.client_id ?? existing.client_id) : null, department: clean(body.department) ?? existing.department, username: normalizedUsername } };
  }

  if (operation === 'delete_profile') {
    return deleteProfileAccount(body.profile_id, request.auth.uid);
  }

  throw new Error(`Unsupported user operation: ${operation}`);
});

function numericId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpsError('invalid-argument', `${label} must be a valid positive integer.`);
  return id;
}

function paymentStatus(value) {
  const status = String(value || 'pending').trim().toLowerCase();
  if (!['pending', 'paid', 'cancelled'].includes(status)) throw new HttpsError('invalid-argument', 'Choose pending, paid, or cancelled for a team payment.');
  return status;
}

async function teamById(teamId) {
  const snapshot = await db.doc(`crm_teams/${teamId}`).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'The selected team was not found.');
  return snapshot;
}

async function projectById(projectId) {
  const snapshot = await db.doc(`crm_projects/${projectId}`).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'The selected project was not found.');
  return snapshot;
}

async function rebuildProjectMemberships(projectId, teamIds, caller) {
  const memberships = await db.collection('crm_project_members').where('project_id', '==', projectId).get();
  const projectTeams = await db.collection('crm_project_teams').where('project_id', '==', projectId).get();
  const teams = [];
  const memberSources = new Map();
  for (const teamId of teamIds) {
    const team = await teamById(teamId);
    teams.push(team);
    const members = await db.collection('crm_team_members').where('team_id', '==', teamId).get();
    members.docs.forEach((member) => {
      const profileId = Number(member.data().profile_id);
      if (!Number.isSafeInteger(profileId) || profileId < 1) return;
      const sources = memberSources.get(profileId) || [];
      sources.push(teamId);
      memberSources.set(profileId, sources);
    });
  }
  const batch = db.batch();
  projectTeams.docs.forEach((snapshot) => batch.delete(snapshot.ref));
  memberships.docs.forEach((snapshot) => batch.delete(snapshot.ref));
  let nextProjectTeamId = await nextNumericId('crm_project_teams');
  let nextMemberId = await nextNumericId('crm_project_members');
  const now = FieldValue.serverTimestamp();
  const memberNames = [];
  for (const profileId of memberSources.keys()) {
    const profileSnapshot = await db.doc(`crm_profiles/${profileId}`).get();
    if (profileSnapshot.exists) memberNames.push(String(profileSnapshot.data().name || profileSnapshot.data().email || `Profile #${profileId}`));
  }
  batch.update(db.doc(`crm_projects/${projectId}`), {
    team_ids: teamIds,
    team_names: teams.map((team) => String(team.data().name || team.id)),
    team_member_names: memberNames,
    updated_at: now,
  });
  teams.forEach((team) => {
    batch.set(db.doc(`crm_project_teams/${nextProjectTeamId}`), {
      id: nextProjectTeamId++, project_id: projectId, team_id: Number(team.data().id || team.id), assigned_by: caller.id || caller.auth_user_id, created_at: now,
    });
  });
  memberSources.forEach((sourceTeamIds, profileId) => {
    batch.set(db.doc(`crm_project_members/${nextMemberId}`), {
      id: nextMemberId++, project_id: projectId, profile_id: profileId, role: 'member', source_team_ids: [...new Set(sourceTeamIds)], assigned_by: caller.id || caller.auth_user_id, created_at: now,
    });
  });
  await batch.commit();
  return { team_ids: teamIds, member_ids: [...memberSources.keys()] };
}

export const adminTeams = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request);
  const body = request.data || {};
  const operation = String(body.operation || '');
  const actor = caller.id || caller.auth_user_id;

  if (operation === 'create_team') {
    const name = clean(body.name);
    if (!name || name.length > 120) throw new HttpsError('invalid-argument', 'Team name is required and must be 120 characters or fewer.');
    const id = await nextNumericId('crm_teams');
    const data = { id, name, description: clean(body.description) || '', status: clean(body.status) || 'active', created_by: actor, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() };
    await db.doc(`crm_teams/${id}`).set(data);
    return { team: { id, name: data.name, description: data.description, status: data.status, created_by: data.created_by } };
  }

  if (operation === 'update_team') {
    const id = numericId(body.team_id, 'Team id');
    await teamById(id);
    const patch = {};
    if (body.name !== undefined) {
      const name = clean(body.name);
      if (!name || name.length > 120) throw new HttpsError('invalid-argument', 'Team name is required and must be 120 characters or fewer.');
      patch.name = name;
    }
    if (body.description !== undefined) patch.description = clean(body.description) || '';
    if (body.status !== undefined && !['active', 'archived'].includes(String(body.status))) throw new HttpsError('invalid-argument', 'Choose active or archived for a team.');
    if (body.status !== undefined) patch.status = String(body.status);
    if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'No team changes were supplied.');
    patch.updated_at = FieldValue.serverTimestamp();
    await db.doc(`crm_teams/${id}`).set(patch, { merge: true });
    return { ok: true, team_id: id };
  }

  if (operation === 'delete_team') {
    const id = numericId(body.team_id, 'Team id');
    await teamById(id);
    const [members, assignments, payments] = await Promise.all([
      db.collection('crm_team_members').where('team_id', '==', id).get(),
      db.collection('crm_project_teams').where('team_id', '==', id).get(),
      db.collection('crm_team_project_payments').where('team_id', '==', id).get(),
    ]);
    const batch = db.batch();
    members.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    assignments.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    payments.docs.forEach((snapshot) => {
      batch.delete(snapshot.ref);
      if (snapshot.data().finance_id) batch.delete(db.doc(`crm_finances/${snapshot.data().finance_id}`));
    });
    batch.delete(db.doc(`crm_teams/${id}`));
    await batch.commit();
    for (const assignment of assignments.docs) await rebuildProjectMemberships(Number(assignment.data().project_id), [], caller);
    return { ok: true, team_id: id };
  }

  if (operation === 'set_team_members') {
    const teamId = numericId(body.team_id, 'Team id');
    await teamById(teamId);
    const profileIds = [...new Set((body.profile_ids || []).map((value) => Number(value)).filter((value) => Number.isSafeInteger(value) && value > 0))];
    const existing = await db.collection('crm_team_members').where('team_id', '==', teamId).get();
    const batch = db.batch();
    existing.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    let nextId = await nextNumericId('crm_team_members');
    profileIds.forEach((profileId) => batch.set(db.doc(`crm_team_members/${nextId}`), { id: nextId++, team_id: teamId, profile_id: profileId, role: 'member', assigned_by: actor, created_at: FieldValue.serverTimestamp() }));
    await batch.commit();
    const assignments = await db.collection('crm_project_teams').where('team_id', '==', teamId).get();
    for (const assignment of assignments.docs) {
      const projectId = Number(assignment.data().project_id);
      const projectAssignments = await db.collection('crm_project_teams').where('project_id', '==', projectId).get();
      await rebuildProjectMemberships(projectId, projectAssignments.docs.map((item) => Number(item.data().team_id)), caller);
    }
    return { ok: true, team_id: teamId, profile_ids: profileIds };
  }

  if (operation === 'set_project_teams') {
    const projectId = numericId(body.project_id, 'Project id');
    await projectById(projectId);
    const teamIds = [...new Set((body.team_ids || []).map((value) => Number(value)).filter((value) => Number.isSafeInteger(value) && value > 0))];
    const result = await rebuildProjectMemberships(projectId, teamIds, caller);
    return { ok: true, project_id: projectId, ...result };
  }

  if (['create_payment', 'update_payment', 'mark_payment_paid', 'delete_payment'].includes(operation)) {
    const paymentId = operation === 'create_payment' ? null : numericId(body.payment_id, 'Payment id');
    const existingSnapshot = paymentId ? await db.doc(`crm_team_project_payments/${paymentId}`).get() : null;
    if (paymentId && !existingSnapshot.exists) throw new HttpsError('not-found', 'The team payment was not found.');
    const existing = existingSnapshot?.data() || {};
    if (operation === 'delete_payment') {
      const batch = db.batch();
      batch.delete(db.doc(`crm_team_project_payments/${paymentId}`));
      if (existing.finance_id) batch.delete(db.doc(`crm_finances/${existing.finance_id}`));
      await batch.commit();
      return { ok: true, payment_id: paymentId };
    }
    const projectId = numericId(body.project_id ?? existing.project_id, 'Project id');
    const teamId = numericId(body.team_id ?? existing.team_id, 'Team id');
    await projectById(projectId);
    await teamById(teamId);
    const status = operation === 'mark_payment_paid' ? 'paid' : paymentStatus(body.status ?? existing.status);
    const amount = Number(body.amount ?? existing.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError('invalid-argument', 'Payment amount must be greater than zero.');
    const paidAt = body.paid_at ?? existing.paid_at ?? (status === 'paid' ? new Date().toISOString().slice(0, 10) : null);
    if (status === 'paid' && !paidAt) throw new HttpsError('invalid-argument', 'A paid date is required when marking a payment paid.');
    const id = paymentId || await nextNumericId('crm_team_project_payments');
    const financeId = Number(existing.finance_id || await nextNumericId('crm_finances'));
    const payment = {
      id, project_id: projectId, team_id: teamId, milestone_name: clean(body.milestone_name ?? existing.milestone_name) || 'Project milestone', target_date: clean(body.target_date ?? existing.target_date) || null, completed_date: clean(body.completed_date ?? existing.completed_date) || null,
      amount, status, paid_at: status === 'paid' ? paidAt : null, payment_method: clean(body.payment_method ?? existing.payment_method) || '', reference_id: clean(body.reference_id ?? existing.reference_id) || '', proof_url: clean(body.proof_url ?? existing.proof_url) || '', notes: clean(body.notes ?? existing.notes) || '', finance_id: financeId, created_by: existing.created_by || actor, created_at: existing.created_at || FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
    };
    const projectName = (await projectById(projectId)).data().name || `Project #${projectId}`;
    const teamName = (await teamById(teamId)).data().name || `Team #${teamId}`;
    const finance = { id: financeId, project_id: projectId, project: projectName, transaction_date: payment.completed_date || payment.paid_at || new Date().toISOString().slice(0, 10), transaction_type: 'salary', title: `${teamName} · ${payment.milestone_name}`, amount, status: status === 'paid' ? 'paid' : status, payment_method: payment.payment_method, reference_id: payment.reference_id, proof_url: payment.proof_url, notes: payment.notes, source: 'team_project_payment', updated_at: FieldValue.serverTimestamp(), created_at: existing.created_at || FieldValue.serverTimestamp() };
    const batch = db.batch();
    batch.set(db.doc(`crm_team_project_payments/${id}`), payment, { merge: true });
    batch.set(db.doc(`crm_finances/${financeId}`), finance, { merge: true });
    await batch.commit();
    return { ok: true, payment: { id, project_id: projectId, team_id: teamId, milestone_name: payment.milestone_name, target_date: payment.target_date, completed_date: payment.completed_date, amount, status, paid_at: payment.paid_at, payment_method: payment.payment_method, reference_id: payment.reference_id, proof_url: payment.proof_url, notes: payment.notes, finance_id: financeId } };
  }

  throw new HttpsError('invalid-argument', `Unsupported team operation: ${operation}`);
});

// Storage objects restored through the GCS API do not have Firebase download
// tokens. Issue short-lived, authenticated URLs through Admin SDK so private
// finance proofs remain private and restored objects work the same as new ones.
export const storageDownload = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const profile = await callerProfile(uid);
  const bucket = clean(request.data?.bucket)?.toLowerCase();
  if (!PRIVATE_STORAGE_BUCKETS.has(bucket) || !canReadPrivateStorage(profile, bucket)) {
    throw new HttpsError('permission-denied', 'You do not have permission to access this private file.');
  }
  const objectPath = normalizePrivateStoragePath(bucket, request.data?.path);
  const file = getStorage().bucket(DEFAULT_STORAGE_BUCKET).file(`${bucket}/${objectPath}`);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'The requested private file was not found.');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: expiresAt });
  return { url, expiresAt };
});

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
