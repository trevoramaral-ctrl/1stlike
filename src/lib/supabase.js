import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// A friendly heads-up in the console if the keys aren't set yet.
if (!url || !anon) {
  console.warn(
    'Supabase keys missing. Copy .env.example to .env and paste your ' +
    'First Like project URL and anon key, then restart the dev server.'
  )
}

export const supabase = createClient(url || 'http://localhost', anon || 'public-anon-key')
export const supabaseReady = Boolean(url && anon)
