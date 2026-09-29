import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.storageBucket && config.appId);
}

const app = firebaseConfigured()
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firebaseDb = app ? getFirestore(app) : null;
export const firebaseStorage = app ? getStorage(app) : null;
export const firebaseFunctions = app ? getFunctions(app, 'asia-south1') : null;
export { app, config as firebaseConfig };
