import { createClient } from '@supabase/supabase-js';
import { Chart } from 'chart.js/auto';
import { createCrmRepository } from '../lib/crm/repository.js';

window.Chart = Chart;
window.tmSupabase = null;
window.tmCrmReady = new Promise((resolve) => { window.__resolveTmCrm = resolve; });

try {
  const sbUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const sbKey = import.meta.env.PUBLIC_SUPABASE_KEY || '';
  if (sbUrl && sbKey) {
    window.tmSupabase = createClient(sbUrl, sbKey);
  }
} catch (error) {
  console.error('Supabase init failed:', error);
}

window.tmCrm = { repository: createCrmRepository(() => window.tmSupabase) };
window.__resolveTmCrm?.(window.tmCrm);
