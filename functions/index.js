import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();

const db = getFirestore();
const auth = getAuth();
const REGION = 'asia-south1';
const ROLES = new Set(['company_admin', 'company_member', 'client']);
const STATUSES = new Set(['active', 'inactive', 'pending']);

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

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
  }
  return value;
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
    const username = clean(body.username)?.toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid email is required.');
    if (!ROLES.has(role)) throw new Error('Choose a valid CRM role.');
    if (!STATUSES.has(status)) throw new Error('Choose a valid account status.');
    if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Username must contain 3-64 lowercase letters, numbers, dots, underscores, or hyphens.');
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
    if (!ROLES.has(role) || !STATUSES.has(status)) throw new Error('Choose a valid role and status.');
    if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Username must contain 3-64 lowercase letters, numbers, dots, underscores, or hyphens.');
    await auth.updateUser(uid, { email, displayName: name, disabled: status === 'inactive' });
    await writeProfile({ id, uid, email, name, role, status, clientId: body.client_id, department: clean(body.department) ?? existing.department, username, mustChangePassword: Boolean(existing.must_change_password), preserveCreatedAt: true });
    if (existing.username && existing.username.toLowerCase() !== username) await db.doc(`login_aliases/${existing.username.toLowerCase()}`).delete();
    return { profile: { ...existing, id, auth_user_id: uid, email, name, role, status, client_id: role === 'client' ? Number(body.client_id ?? existing.client_id) : null, department: clean(body.department) ?? existing.department, username } };
  }

  throw new Error(`Unsupported user operation: ${operation}`);
});

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
