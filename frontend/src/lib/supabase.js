import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const getSafeUrl = (url) => {
  try {
    return url && Boolean(new URL(url)) ? url : 'https://placeholder.supabase.co'
  } catch {
    return 'https://placeholder.supabase.co'
  }
}

export const supabase = createClient(
  getSafeUrl(supabaseUrl),
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
