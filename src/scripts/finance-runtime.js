import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, browserSessionPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { doc, getDoc, onSnapshot, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { ref, uploadBytes, getBlob, deleteObject, connectStorageEmulator } from 'firebase/storage';
import { app, firebaseDb as db, firebaseStorage as storage } from '../lib/firebase/client.js';
import { calculateProjectMetrics, isCompanyInvoice } from '../../functions/project-finance.js';
import { splitExpense, transactionInProject, transactionsForProject } from '../../functions/expense-allocations.js';

window.FinanceProjectFinance = { calculate: calculateProjectMetrics, isCompanyInvoice, splitExpense, transactionInProject, transactionsForProject };

const auth = app ? getAuth(app) : null;
const functions = app ? getFunctions(app, 'asia-south1') : null;
if (import.meta.env.PUBLIC_FINANCE_EMULATORS === 'true' && import.meta.env.PUBLIC_FIREBASE_PROJECT_ID === 'demo-techmigos-finance' && ['localhost','127.0.0.1'].includes(location.hostname) && auth) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9097', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8187);
  connectFunctionsEmulator(functions, '127.0.0.1', 5007);
  connectStorageEmulator(storage, '127.0.0.1', 9197);
}
const call = async data => {
  if (!functions) throw new Error('Finance is not configured. Contact an administrator.');
  try { return (await httpsCallable(functions, 'financeApi')(data)).data; }
  catch (error) { throw new Error(error.code==='functions/internal'?'Unable to complete the request. Try again.':error.code==='functions/unauthenticated'?'Your session expired. Sign in again.':error.message || 'The change could not be saved. Try again.'); }
};
let profile = null;
let stopProfile = null;
let stopWorkspace = null;
const proofCache = new Map();

async function loadProfile(user) {
  if (!user) return null;
  const snapshot = await getDoc(doc(db, 'finance_users', user.uid));
  const value = snapshot.data();
  if (!value?.active) throw new Error('Your account does not have active finance access. Contact an administrator.');
  return { ...value, uid: user.uid };
}
async function logout() {
  stopWorkspace?.(); stopProfile?.(); proofCache.clear(); profile = null;
  document.querySelector('#app')?.replaceChildren();
  document.querySelector('#modalHost')?.replaceChildren();
  await signOut(auth);
  location.replace('/login');
}
const ready = auth ? (async () => {
  await setPersistence(auth, browserSessionPersistence);
  await auth.authStateReady();
  try { profile = await loadProfile(auth.currentUser); }
  catch { await signOut(auth); profile = null; }
  onAuthStateChanged(auth, user => {
    if (!user && location.pathname.replace(/\/$/, '') === '/finance') {
      document.querySelector('#app')?.replaceChildren();
      location.replace('/login');
    }
  });
  return profile;
})() : Promise.resolve(null);

window.TechmigosFinanceAuth = {
  ready,
  currentUser: () => profile,
  async signIn(email, password) {
    if (!auth) throw new Error('Finance is not configured. Contact an administrator.');
    await ready;
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      profile = await loadProfile(result.user);
      return true;
    } catch (error) {
      if (auth.currentUser && !profile) await signOut(auth);
      if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/user-disabled'].includes(error.code)) return false;
      throw error;
    }
  },
  async requireSession() {
    await ready;
    if (profile) return true;
    location.replace('/login'); return false;
  },
  signOut: logout,
};

window.FinanceBackend = {
  prepareApproval: (transactionId, reason, revision) => call({ action: 'prepareApproval', transactionId, reason, revision }),
  async finishApproval(id, blob) {
    const file = ref(storage, `finance/proofs/${id}/file`);
    await uploadBytes(file, blob, { contentType: 'application/pdf' });
    try { return await call({ action: 'finishApproval', id }); }
    catch (error) { await deleteObject(file).catch(() => {}); throw error; }
  },
  load: () => call({ action: 'load' }),
  save: (state, revision) => call({ action: 'save', state, revision }),
  members: async () => (await call({ action: 'members' })).members,
  member: member => call({ action: 'member', member }),
  initial: async () => (await call({ action: 'initial' })).state,
  subscribe(callback, onError) {
    const reference = profile.role === 'admin' ? doc(db, 'finance_workspace', 'main') : doc(db, 'finance_team_views', profile.teamId);
    stopWorkspace = onSnapshot(reference, snapshot => callback(snapshot.data()), onError);
    stopProfile = onSnapshot(doc(db, 'finance_users', profile.uid), snapshot => {
      const next = snapshot.data();
      if (!next?.active || next.role !== profile.role || next.teamId !== profile.teamId || next.validAfter !== profile.validAfter) {
        logout().catch(onError);
      } else { profile = { ...next, uid: profile.uid }; window.dispatchEvent(new Event('finance-profile-updated')); }
    }, () => logout().catch(onError));
    return () => { stopWorkspace?.(); stopProfile?.(); };
  },
  async proofOp(mode, value) {
    if (mode === 'put') {
      if (value.blob.size > 25 * 1024 * 1024) throw new Error('Proofs must be no larger than 25 MB.');
      const file = ref(storage, `finance/proofs/${value.id}/file`);
      const types={jpg:'image/jpeg',jpeg:'image/jpeg',jpe:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',avif:'image/avif',heic:'image/heic',tif:'image/tiff',tiff:'image/tiff',pdf:'application/pdf',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',flac:'audio/flac'};
      const inferred=types[value.name?.split('.').pop().toLowerCase()];
      const mime=value.mime&&value.mime!=='application/octet-stream'?value.mime:inferred||'application/octet-stream';
      await uploadBytes(file, value.blob, { contentType: mime });
      let metadata;
      try { metadata = await call({ action: 'registerProof', id: value.id, name: value.name }); }
      catch (error) { await deleteObject(file).catch(() => {}); throw error; }
      proofCache.set(value.id, { ...metadata, blob: new Blob([value.blob],{type:metadata.mime}) });
      return value.id;
    }
    if (mode === 'delete') {
      await call({ action: 'removeProof', id: value }); proofCache.delete(value); return;
    }
    if (mode === 'all') {
      const { getDocs, collection } = await import('firebase/firestore');
      const proofs = await getDocs(collection(db, 'finance_proofs'));
      return Promise.all(proofs.docs.map(item => window.FinanceBackend.proofOp('get', item.id)));
    }
    if (proofCache.has(value)) return proofCache.get(value);
    const snapshot = await getDoc(doc(db, 'finance_proofs', value));
    if (!snapshot.exists()) return null;
    const metadata = snapshot.data();
    const blob = await getBlob(ref(storage, metadata.storagePath), 25 * 1024 * 1024);
    const proof = { ...metadata, blob };
    proofCache.set(value, proof); return proof;
  },
};

function loginPage() {
  const form = document.querySelector('#finance-login');
  if (!form) return;
  const email = form.elements.namedItem('email');
  const password = form.elements.namedItem('password');
  const error = document.querySelector('#login-error');
  const submit = document.querySelector('#login-submit');
  const toggle = document.querySelector('#toggle-password');
  submit.disabled = true;
  ready.then(user => { if (user) location.replace('/finance'); else submit.disabled = false; });
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password'; toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(visible));
  });
  form.addEventListener('input', event => { error.textContent = ''; event.target.removeAttribute('aria-invalid'); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submit.disabled) return;
    error.textContent = ''; email.removeAttribute('aria-invalid'); password.removeAttribute('aria-invalid');
    const invalid = !email.validity.valid ? email : !password.value ? password : null;
    if (invalid) {
      error.textContent = invalid === email ? 'Enter a valid email address.' : 'Enter your password.';
      invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); return;
    }
    submit.disabled = true; submit.textContent = 'Signing in…'; form.setAttribute('aria-busy', 'true');
    try {
      if (await window.TechmigosFinanceAuth.signIn(email.value, password.value)) { password.value = ''; location.replace('/finance'); return; }
      error.textContent = 'Email or password is incorrect. Try again.'; password.value = ''; password.focus(); password.setAttribute('aria-invalid', 'true');
    } catch (failure) { error.textContent = failure.code === 'auth/network-request-failed' ? 'Unable to connect. Check your connection and try again.' : failure.code === 'auth/too-many-requests' ? 'Too many login attempts. Wait a moment and try again.' : failure.code === 'permission-denied' ? 'Your account does not have active finance access. Contact an administrator.' : failure.message; }
    finally { submit.disabled = false; submit.textContent = 'Login'; form.removeAttribute('aria-busy'); }
  });
}

if (location.pathname.replace(/\/$/, '') === '/login') loginPage();
else ready.then(() => window.dispatchEvent(new Event('finance-ready')));
