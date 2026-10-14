import {
  Timestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from './client.js';

const PUBLIC_COLLECTIONS = new Set(['contact_leads', 'newsletter_subscribers', 'career_applications']);

function requireConfigured() {
  if (!firebaseDb || !firebaseStorage) throw new Error('Firebase is not configured for this deployment.');
}

function toFirestoreValue(value, key = '') {
  if (value === undefined) return undefined;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string' && ['created_at', 'updated_at'].includes(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  if (Array.isArray(value)) return value.map((item) => toFirestoreValue(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, toFirestoreValue(childValue, childKey)]));
  }
  return value;
}

function firebaseError(error, fallback = 'Firebase request failed.') {
  const wrapped = new Error(error?.message || fallback);
  wrapped.code = error?.code;
  return wrapped;
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function publicQuery(table) {
  return {
    insert(rows) {
      return {
        async execute() {
          try {
            requireConfigured();
            if (!PUBLIC_COLLECTIONS.has(table)) throw new Error(`Public writes are not enabled for ${table}.`);
            const inserted = [];
            for (const row of Array.isArray(rows) ? rows : [rows]) {
              const id = `public-${randomId()}`;
              const document = toFirestoreValue({ ...row, id, created_at: new Date(), updated_at: new Date() });
              await setDoc(doc(firebaseDb, table, id), document);
              inserted.push({ id, ...row });
            }
            return { data: inserted, error: null };
          } catch (error) {
            return { data: null, error: firebaseError(error) };
          }
        },
        then(resolve, reject) { return this.execute().then(resolve, reject); },
      };
    },
  };
}

function publicStorage() {
  return {
    from(bucket) {
      if (bucket !== 'resumes') throw new Error(`Public uploads are not enabled for ${bucket}.`);
      return {
        async upload(path, file, options = {}) {
          try {
            requireConfigured();
            await uploadBytes(ref(firebaseStorage, `${bucket}/${path}`), file, {
              contentType: options.contentType || file.type || 'application/octet-stream',
            });
            return { data: { path }, error: null };
          } catch (error) {
            return { data: null, error: firebaseError(error, 'Could not upload the file.') };
          }
        },
        async remove(paths) {
          try {
            requireConfigured();
            await Promise.all((paths || []).map((path) => deleteObject(ref(firebaseStorage, `${bucket}/${path}`))));
            return { data: paths || [], error: null };
          } catch (error) {
            return { data: null, error: firebaseError(error, 'Could not remove the file.') };
          }
        },
      };
    },
  };
}

export function createPublicFirebaseBridge() {
  return {
    from: publicQuery,
    storage: publicStorage(),
  };
}
