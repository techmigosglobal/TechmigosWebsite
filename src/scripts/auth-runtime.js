import { createFirebaseBridge } from '../lib/firebase/supabaseBridge.js';

window.tmFirebase = null;

try {
  window.tmFirebase = createFirebaseBridge();
} catch (error) {
  console.error('Firebase init failed:', error);
}
