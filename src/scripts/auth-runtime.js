import { createClient } from '@supabase/supabase-js';

window.tmSupabase = null;

try {
  const sbUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const sbKey = import.meta.env.PUBLIC_SUPABASE_KEY || '';
  if (sbUrl && sbKey) {
    window.tmSupabase = createClient(sbUrl, sbKey);
  }
} catch (error) {
  console.error('Supabase init failed:', error);
}
