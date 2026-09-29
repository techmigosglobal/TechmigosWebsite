import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { firebaseAuth, firebaseDb, firebaseFunctions, firebaseStorage } from './client.js';

const AUTH_READY = Symbol('firebase-auth-ready');

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.uid,
    user_metadata: user.displayName ? { name: user.displayName } : {},
  };
}

function firebaseError(error, fallback = 'Firebase request failed.') {
  const wrapped = new Error(error?.message || fallback);
  wrapped.code = error?.code;
  wrapped.details = error?.details;
  return wrapped;
}

function requireConfigured() {
  if (!firebaseAuth || !firebaseDb || !firebaseStorage) {
    throw new Error('Firebase is not configured for this deployment.');
  }
}

function isDateField(key) {
  return /(^|_)(at|login)$/i.test(key) || ['created_at', 'updated_at', 'last_login'].includes(key);
}

function toFirestoreValue(value, key = '') {
  if (value === undefined) return undefined;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value;
  if (typeof value === 'string' && isDateField(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  if (Array.isArray(value)) return value.map((item) => toFirestoreValue(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, toFirestoreValue(childValue, childKey)]));
  }
  return value;
}

function fromFirestoreValue(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(fromFirestoreValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fromFirestoreValue(child)]));
  return value;
}

function serializeSnapshot(snapshot) {
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...fromFirestoreValue(snapshot.data()) };
}

function normalizeObjectPath(bucket, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const urlMatch = raw.match(new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${bucket}/(.+)$`, 'i'));
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  if (raw.startsWith(`${bucket}/`)) return raw.slice(bucket.length + 1);
  return raw;
}

async function waitForAuth() {
  requireConfigured();
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  if (firebaseAuth[AUTH_READY]) return firebaseAuth[AUTH_READY];
  firebaseAuth[AUTH_READY] = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
  return firebaseAuth[AUTH_READY];
}

async function currentProfile() {
  const user = await waitForAuth();
  if (!user) return null;
  const snapshot = await getDocs(query(collection(firebaseDb, 'crm_profiles'), where('auth_user_id', '==', user.uid), limit(1)));
  return snapshot.empty ? null : serializeSnapshot(snapshot.docs[0]);
}

async function nextNumericId(table) {
  const snapshot = await getDocs(query(collection(firebaseDb, table), orderBy('id', 'desc'), limit(1)));
  return snapshot.empty ? 1 : Number(snapshot.docs[0].data().id || 0) + 1;
}

class FirebaseQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.max = null;
    this.operation = 'select';
    this.payload = null;
    this.fields = null;
  }

  select(fields = '*') { this.fields = fields; return this; }
  eq(field, value) { this.filters.push([field, '==', value]); return this; }
  in(field, values) { this.filters.push([field, 'in', values]); return this; }
  order(field, options = {}) { this.orders.push([field, options.ascending !== false]); return this; }
  limit(value) { this.max = Number(value); return this; }
  insert(payload) { this.operation = 'insert'; this.payload = Array.isArray(payload) ? payload : [payload]; return this; }
  update(payload) { this.operation = 'update'; this.payload = payload; return this; }
  delete() { this.operation = 'delete'; return this; }

  async maybeSingle() {
    const result = await this.execute();
    return { data: result.data?.[0] || null, error: result.error };
  }

  async single() {
    const result = await this.execute();
    if (result.error) return result;
    if (!result.data?.length) return { data: null, error: new Error(`No ${this.table} record matched.`) };
    return { data: result.data[0], error: null };
  }

  then(resolve, reject) { return this.execute().then(resolve, reject); }

  async execute() {
    try {
      requireConfigured();
      if (this.operation === 'insert') return { data: await this.insertRows(), error: null };
      const constraints = this.filters.map(([field, op, value]) => where(field, op, value));
      this.orders.forEach(([field, ascending]) => constraints.push(orderBy(field, ascending ? 'asc' : 'desc')));
      if (this.max !== null) constraints.push(limit(this.max));
      const snapshots = await getDocs(query(collection(firebaseDb, this.table), ...constraints));
      const rows = snapshots.docs.map(serializeSnapshot);
      if (this.operation === 'update') return { data: await this.updateRows(rows), error: null };
      if (this.operation === 'delete') return { data: await this.deleteRows(rows), error: null };
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: firebaseError(error) };
    }
  }

  async insertRows() {
    const rows = [];
    for (const original of this.payload) {
      const payload = { ...original };
      const publicCollection = ['contact_leads', 'newsletter_subscribers', 'career_applications'].includes(this.table);
      const generatedId = publicCollection && !firebaseAuth?.currentUser
        ? `public-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
        : await nextNumericId(this.table);
      const id = payload.id == null ? generatedId : payload.id;
      payload.id = Number.isFinite(Number(id)) ? Number(id) : id;
      const document = toFirestoreValue(payload);
      await setDoc(doc(firebaseDb, this.table, String(payload.id)), document);
      rows.push({ id: payload.id, ...fromFirestoreValue(document) });
    }
    return rows;
  }

  async updateRows(rows) {
    const output = [];
    for (const row of rows) {
      const patch = Object.fromEntries(Object.entries(this.payload).map(([key, value]) => [key, toFirestoreValue(value, key)]));
      await updateDoc(doc(firebaseDb, this.table, String(row.id)), patch);
      output.push({ ...row, ...fromFirestoreValue(patch) });
    }
    return output;
  }

  async deleteRows(rows) {
    for (const row of rows) await deleteDoc(doc(firebaseDb, this.table, String(row.id)));
    return rows;
  }
}

function storageClient() {
  return {
    from(bucket) {
      return {
        async upload(path, file, options = {}) {
          try {
            requireConfigured();
            await uploadBytes(ref(firebaseStorage, `${bucket}/${path}`), file, { contentType: options.contentType || file.type || 'application/octet-stream' });
            return { data: { path }, error: null };
          } catch (error) { return { data: null, error: firebaseError(error, 'Could not upload the file.') }; }
        },
        async createSignedUrl(path, expiresIn = 600) {
          try {
            requireConfigured();
            if (!firebaseFunctions) throw new Error('Firebase Functions is not configured.');
            const objectPath = normalizeObjectPath(bucket, path);
            const result = await httpsCallable(firebaseFunctions, 'storageDownload')({
              bucket,
              path: objectPath,
              expiresIn: Math.min(Math.max(Number(expiresIn) || 600, 60), 600),
            });
            const url = result.data?.url;
            if (!url) throw new Error('Firebase did not return a secure file URL.');
            return { data: { signedUrl: url }, error: null };
          } catch (error) { return { data: null, error: firebaseError(error, 'Could not resolve the file URL.') }; }
        },
        async remove(paths) {
          try {
            requireConfigured();
            await Promise.all((paths || []).map((path) => deleteObject(ref(firebaseStorage, `${bucket}/${normalizeObjectPath(bucket, path)}`))));
            return { data: paths || [], error: null };
          } catch (error) { return { data: null, error: firebaseError(error, 'Could not remove the file.') }; }
        },
      };
    },
  };
}

function authClient() {
  return {
    async getUser() {
      try { return { data: { user: normalizeUser(await waitForAuth()) }, error: null }; }
      catch (error) { return { data: { user: null }, error: firebaseError(error, 'Could not verify your session.') }; }
    },
    async getSession() {
      try {
        const user = await waitForAuth();
        return { data: { session: user ? { user: normalizeUser(user), access_token: await user.getIdToken() } : null }, error: null };
      } catch (error) { return { data: { session: null }, error: firebaseError(error) }; }
    },
    async signInWithPassword({ email, password }) {
      try {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        return { data: { user: normalizeUser(credential.user), session: { user: normalizeUser(credential.user), access_token: await credential.user.getIdToken() } }, error: null };
      } catch (error) { return { data: { user: null, session: null }, error: firebaseError(error, 'Email or password is incorrect.') }; }
    },
    async setSession() {
      const user = await waitForAuth();
      return { data: { user: normalizeUser(user), session: user ? { user: normalizeUser(user), access_token: await user.getIdToken() } : null }, error: null };
    },
    async signOut() {
      try {
        await signOut(firebaseAuth);
        firebaseAuth[AUTH_READY] = null;
        return { error: null };
      } catch (error) { return { error: firebaseError(error) }; }
    },
    async updateUser({ password }) { try { await updatePassword(firebaseAuth.currentUser, password); return { data: { user: normalizeUser(firebaseAuth.currentUser) }, error: null }; } catch (error) { return { data: null, error: firebaseError(error) }; } },
    async resetPasswordForEmail(email, options = {}) {
      try { await sendPasswordResetEmail(firebaseAuth, email, options.redirectTo ? { url: options.redirectTo } : undefined); return { error: null }; }
      catch (error) { return { error: firebaseError(error, 'Could not send a password reset email.') }; }
    },
    onAuthStateChange(callback) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user: normalizeUser(user) } : null));
      return { data: { subscription: { unsubscribe } } };
    },
  };
}

async function invokeAdminUsers(body) {
  if (body.operation === 'change_initial_password') {
    const user = await waitForAuth();
    if (!user) return { data: { error: 'Authentication required.' }, error: null };
    const profile = await currentProfile();
    if (!profile || !profile.must_change_password || !['active', 'pending'].includes(profile.status)) return { data: { error: 'This account is not awaiting an initial password change.' }, error: null };
    await updatePassword(user, String(body.password || ''));
    await updateDoc(doc(firebaseDb, 'crm_profiles', String(profile.id)), { must_change_password: false, status: profile.status === 'pending' ? 'active' : profile.status, updated_at: serverTimestamp() });
    await updateDoc(doc(firebaseDb, 'user_profiles', user.uid), { must_change_password: false, status: profile.status === 'pending' ? 'active' : profile.status, updated_at: serverTimestamp() });
    return { data: { ok: true }, error: null };
  }
  try {
    if (!firebaseFunctions) throw new Error('Firebase Functions is not configured.');
    const result = await httpsCallable(firebaseFunctions, 'adminUsers')(body);
    return { data: result.data, error: null };
  } catch (error) { return { data: null, error: firebaseError(error, 'Could not complete the admin user operation.') }; }
}

function rpcClient(name, args = {}) {
  return {
    async execute() {
      try {
        const profile = await currentProfile();
        if (name === 'record_crm_last_login' && profile) {
          await updateDoc(doc(firebaseDb, 'crm_profiles', String(profile.id)), { last_login: serverTimestamp(), updated_at: serverTimestamp() });
          return { data: null, error: null };
        }
        if (name === 'save_invoice_with_items') {
          const invoice = { ...(args.p_invoice || {}) };
          const items = Array.isArray(args.p_items) ? args.p_items : [];
          const invoiceId = invoice.id == null ? await nextNumericId('crm_invoices') : Number(invoice.id);
          invoice.id = invoiceId;
          await setDoc(doc(firebaseDb, 'crm_invoices', String(invoiceId)), toFirestoreValue({ ...invoice, updated_at: new Date() }), { merge: true });
          const oldItems = await getDocs(query(collection(firebaseDb, 'crm_invoice_items'), where('invoice_id', '==', invoiceId)));
          const batch = writeBatch(firebaseDb);
          oldItems.docs.forEach((item) => batch.delete(item.ref));
          let nextItemId = await nextNumericId('crm_invoice_items');
          const outputItems = items.map((item) => ({ ...item, id: item.id == null ? nextItemId++ : Number(item.id), invoice_id: invoiceId }));
          outputItems.forEach((item) => batch.set(doc(firebaseDb, 'crm_invoice_items', String(item.id)), toFirestoreValue({ ...item, created_at: item.created_at || new Date() })));
          await batch.commit();
          const saved = await getDoc(doc(firebaseDb, 'crm_invoices', String(invoiceId)));
          return { data: { invoice: serializeSnapshot(saved), items: outputItems }, error: null };
        }
        if (name === 'employee_update_project' || name === 'employee_update_ticket') {
          const table = name.endsWith('project') ? 'crm_projects' : 'crm_tickets';
          const id = Number(name.endsWith('project') ? args.p_project_id : args.p_ticket_id);
          await updateDoc(doc(firebaseDb, table, String(id)), toFirestoreValue(args.p_patch || {}));
          const saved = await getDoc(doc(firebaseDb, table, String(id)));
          return { data: serializeSnapshot(saved), error: null };
        }
        if (name === 'set_project_members') {
          const projectId = Number(args.p_project_id);
          const old = await getDocs(query(collection(firebaseDb, 'crm_project_members'), where('project_id', '==', projectId)));
          const batch = writeBatch(firebaseDb);
          old.docs.forEach((item) => batch.delete(item.ref));
          let next = await nextNumericId('crm_project_members');
          for (const profileId of args.p_profile_ids || []) {
            const id = next++;
            batch.set(doc(firebaseDb, 'crm_project_members', String(id)), { id, project_id: projectId, profile_id: Number(profileId), role: 'member', assigned_by: profile?.auth_user_id || null, created_at: serverTimestamp() });
          }
          await batch.commit();
          return { data: { ok: true }, error: null };
        }
        if (name === 'purge_confirmed_crm_records') {
          const batch = writeBatch(firebaseDb);
          for (const item of args.p_records || []) {
            const table = item.resource === 'clients' ? 'crm_clients' : 'crm_tickets';
            batch.delete(doc(firebaseDb, table, String(Number(item.id))));
          }
          await batch.commit();
          return { data: { deleted: args.p_records || [], reason: args.p_reason || '' }, error: null };
        }
        throw new Error(`Unsupported Firebase operation: ${name}`);
      } catch (error) { return { data: null, error: firebaseError(error) }; }
    },
    then(resolve, reject) { return this.execute().then(resolve, reject); },
  };
}

export function createFirebaseBridge() {
  return {
    auth: authClient(),
    storage: storageClient(),
    from(table) { return new FirebaseQuery(table); },
    rpc(name, args) { return rpcClient(name, args); },
    functions: {
      async invoke(name, { body = {} } = {}) {
        if (name === 'username-login') {
          try {
            const username = String(body.username || '').trim().toLowerCase();
            const alias = await getDoc(doc(firebaseDb, 'login_aliases', username));
            if (!alias.exists()) throw new Error('Username or password is incorrect.');
            const result = await authClient().signInWithPassword({ email: alias.data().email, password: body.password });
            if (result.error) return { data: null, error: result.error };
            return { data: { session: result.data.session }, error: null };
          } catch (error) { return { data: null, error: firebaseError(error, 'Username or password is incorrect.') }; }
        }
        if (name === 'admin-users') return invokeAdminUsers(body);
        return { data: null, error: new Error(`Unsupported Firebase function: ${name}`) };
      },
    },
  };
}
