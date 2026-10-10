#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { jsPDF } from 'jspdf';

// Read-only by default. --smoke --finance-id=<existing ID> uploads temporary
// objects using a disposable admin, verifies private previews, then deletes all
// temporary objects, the profile, and the Auth user. No finance row is changed.
process.loadEnvFile('.env.local');
const project = 'techmigos-279f6';
assert.equal(process.env.PUBLIC_FIREBASE_PROJECT_ID, project);
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
async function googleRequest(url, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(result.error?.message || `Google API returned ${response.status}`);
  return result;
}

const resource = await googleRequest(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}`);
const policy = await googleRequest(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:getIamPolicy`, {});
const member = `serviceAccount:service-${resource.projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;
const enabled = policy.bindings?.some((binding) => binding.role === 'roles/firebaserules.firestoreServiceAgent'
  && !binding.condition && binding.members.includes(member));
console.log(`Storage rules can read Firestore profiles: ${Boolean(enabled)}`);
if (!process.argv.includes('--smoke')) {
  assert.ok(enabled, 'Storage service agent needs roles/firebaserules.firestoreServiceAgent.');
  process.exit(0);
}

const financeId = Number(process.argv.find((arg) => arg.startsWith('--finance-id='))?.split('=')[1]);
assert.ok(Number.isSafeInteger(financeId) && financeId > 0, 'Provide --finance-id=<existing finance ID>.');
const database = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
await googleRequest(`${database}/crm_finances/${financeId}?mask.fieldPaths=id`);
const app = initializeApp({
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY, projectId: project,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
}, `storage-check-${randomUUID()}`);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'asia-south1');
const created = [];
const email = `storage-check-${randomUUID()}@example.com`;
const password = `${randomUUID()}Aa1!`;
let user;
try {
  ({ user } = await createUserWithEmailAndPassword(auth, email, password));
  await googleRequest(`${database}/user_profiles/${user.uid}`, {
    fields: { role: { stringValue: 'company_admin' }, status: { stringValue: 'active' } },
  }, 'PATCH');
  await googleRequest(`${database}/crm_profiles/storage-check-${user.uid}`, {
    fields: { auth_user_id: { stringValue: user.uid }, role: { stringValue: 'company_admin' },
      status: { stringValue: 'active' }, name: { stringValue: 'Temporary storage verification' }, email: { stringValue: email } },
  }, 'PATCH');
  const pdf = new jsPDF();
  pdf.text('Temporary Firebase proof upload verification', 10, 10);
  const files = [
    { extension: 'pdf', type: 'application/pdf', bytes: Buffer.from(pdf.output('arraybuffer')) },
    { extension: 'png', type: 'image/png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') },
  ];
  for (const file of files) {
    const path = `records/${financeId}/permission-check-${randomUUID()}.${file.extension}`;
    const object = ref(storage, `finance-proofs/${path}`);
    await uploadBytes(object, file.bytes, { contentType: file.type });
    created.push(object);
    console.log(`PASS authenticated ${file.extension} upload`);
    const preview = await httpsCallable(functions, 'storageDownload')({ bucket: 'finance-proofs', path });
    const downloaded = await fetch(preview.data.url);
    assert.equal(downloaded.status, 200, 'Signed preview failed.');
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), file.bytes);
    console.log(`PASS ${file.extension} signed preview bytes`);
    const publicRead = await fetch(`https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encodeURIComponent(object.fullPath)}?alt=media`);
    assert.ok([401, 403].includes(publicRead.status), 'Proof must remain private.');
    console.log('PASS unauthenticated proof read denied');
  }
  const forbidden = ref(storage, `finance-proofs/records/${financeId}/permission-check-${randomUUID()}.txt`);
  await assert.rejects(async () => {
    await uploadBytes(forbidden, Buffer.from('invalid proof'), { contentType: 'text/plain' });
    created.push(forbidden);
  }, (error) => error.code === 'storage/unauthorized');
  console.log('PASS unsupported file type denied');
  await googleRequest(`${database}/user_profiles/${user.uid}?updateMask.fieldPaths=status`, {
    fields: { status: { stringValue: 'inactive' } },
  }, 'PATCH');
  try {
    const inactive = ref(storage, `finance-proofs/records/${financeId}/permission-check-${randomUUID()}.pdf`);
    await assert.rejects(async () => {
      await uploadBytes(inactive, files[0].bytes, { contentType: 'application/pdf' });
      created.push(inactive);
    }, (error) => error.code === 'storage/unauthorized');
    console.log('PASS inactive administrator upload denied');
  } finally {
    await googleRequest(`${database}/user_profiles/${user.uid}?updateMask.fieldPaths=status`, {
      fields: { status: { stringValue: 'active' } },
    }, 'PATCH');
  }
  await signOut(auth);
  const anonymous = ref(storage, `finance-proofs/records/${financeId}/permission-check-${randomUUID()}.pdf`);
  await assert.rejects(async () => {
    await uploadBytes(anonymous, files[0].bytes, { contentType: 'application/pdf' });
    created.push(anonymous);
  }, (error) => error.code === 'storage/unauthorized');
  console.log('PASS unauthenticated upload denied');
} finally {
  try {
    if (created.length && !auth.currentUser) await signInWithEmailAndPassword(auth, email, password);
    for (const object of created) await deleteObject(object);
    console.log(`Cleaned up ${created.length} temporary proof objects; finance records were unchanged.`);
  } finally {
    try {
      if (user) {
        await googleRequest(`${database}/user_profiles/${user.uid}`, undefined, 'DELETE');
        await googleRequest(`${database}/crm_profiles/storage-check-${user.uid}`, undefined, 'DELETE');
        if (!auth.currentUser) await signInWithEmailAndPassword(auth, email, password);
        await deleteUser(auth.currentUser);
        console.log('Cleaned up disposable administrator profile and Auth user.');
      }
    } finally {
      await deleteApp(app);
    }
  }
}
assert.ok(enabled, 'Cross-service IAM grant remains missing.');
