import { createPublicFirebaseBridge } from '../lib/firebase/publicBridge.js';

window.tmFirebase = null;

try {
  window.tmFirebase = createPublicFirebaseBridge();
} catch (error) {
  console.error('Firebase init failed:', error);
}
