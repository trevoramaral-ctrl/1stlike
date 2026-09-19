// Opens a Stripe Checkout session (subscription mode) for the signed-in subscriber.
// The browser calls this with the user's Supabase access token in the Authorization
// header. We verify it server-side, find or create their Stripe customer, remember
// the customer id on their profile, and hand back a Checkout URL to redirect to.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service-role client. It bypasses row-level security, which we need in order to
// read and write any subscriber's row from the server.
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // 1. Who is asking? Verify the Supabase session from the bearer token.
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Not signed in' }, 401)

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)
    const user = userData.user

    // 2. Find or create this subscriber's Stripe customer.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, is_paid')
      .eq('id', user.id)
      .single()

    if (profile?.is_paid) return json({ error: 'Already subscribed' }, 400)

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // 3. Open the subscription checkout.
    const origin = req.headers.get('origin') || new URL(req.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    })

    return json({ url: session.url })
  } catch (e) {
    console.error('create-checkout-session error:', e)
    return json({ error: 'Could not start checkout. Try again.' }, 500)
  }
}
