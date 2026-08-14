import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

if (!isSupabaseConfigured) {
  console.warn(
    '[SupabaseClient] Notice: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set in .env yet.\n' +
    'The app will operate using central Cloud Sync until your Supabase project keys are added.'
  );
}

// Initialize Supabase Client instance
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
