import { supabase } from './supabase'

// Read the signed-in subscriber's profile row (handle, niche, state, follows, is_paid).
export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, niche, state, follows, is_paid')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no row yet
  return data || { handle: '', niche: '', state: {}, follows: {}, is_paid: false }
}

// Save a partial patch to the subscriber's own row. RLS guarantees they can
// only ever touch their own record.
export async function saveProfile(userId, patch) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
  if (error) throw error
}
