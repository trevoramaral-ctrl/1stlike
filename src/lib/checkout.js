import { supabase } from './supabase'

// Ask our Netlify function to open a Stripe Checkout session, then send the
// browser there. The function needs the current access token so it knows who
// is subscribing.
export async function startCheckout() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Please sign in again.')

  const res = await fetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })

  let out = {}
  try { out = await res.json() } catch { /* non-JSON error */ }
  if (!res.ok || !out.url) {
    throw new Error(out.error || 'Could not start checkout. Try again.')
  }
  window.location.href = out.url
}
