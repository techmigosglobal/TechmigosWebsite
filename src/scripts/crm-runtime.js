import { Chart } from 'chart.js/auto';
import { createCrmRepository } from '../lib/crm/repository.js';
import { createFirebaseBridge } from '../lib/firebase/supabaseBridge.js';

window.Chart = Chart;
window.tmFirebase = null;
window.tmCrmReady = new Promise((resolve) => { window.__resolveTmCrm = resolve; });

try {
  window.tmFirebase = createFirebaseBridge();
} catch (error) {
  console.error('Firebase init failed:', error);
}

window.tmCrm = { repository: createCrmRepository(() => window.tmFirebase) };
window.__resolveTmCrm?.(window.tmCrm);
