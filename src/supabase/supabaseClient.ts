import { createClient } from '@supabase/supabase-js';

// Setup Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase configuration is missing. ' +
    'Please add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
