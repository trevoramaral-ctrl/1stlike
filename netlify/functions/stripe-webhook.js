// Stripe calls this endpoint whenever a subscription changes. We verify the
// signature, then flip the subscriber's is_paid flag to match: true while their
// subscription is live, false the moment it cancels or lapses. This is what makes
// the paywall a real subscription gate rather than a one-time unlock.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Managed Payments requires 2025-03-31.basil or newer. Pin it explicitly so the
// account's default API version can't silently break checkout again.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Statuses that count as "paid / has access". active and trialing are obvious;
// past_due keeps access during Stripe's automatic retry window so a temporary
// card hiccup doesn't lock a paying member out mid-cycle.
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due'])

async function setPaidByCustomer(customerId, isPaid) {
  if (!customerId) return
  const { error } = await admin
    .from('profiles')
    .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
  if (error) console.error('Failed to update is_paid:', error)
}

export default async (req) => {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text() // raw body, required for signature verification

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message)
    return new Response(`Webhook Error: ${e.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      // Someone just finished checkout. Grant access.
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription') {
          await setPaidByCustomer(session.customer, true)
        }
        break
      }

      // The subscription's status changed (renewed, went past_due, resumed, etc).
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        await setPaidByCustomer(sub.customer, PAID_STATUSES.has(sub.status))
        break
      }

      // Fully cancelled and gone. Revoke access.
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await setPaidByCustomer(sub.customer, false)
        break
      }

      default:
        // Other events are fine to ignore.
        break
    }
  } catch (e) {
    console.error('Webhook handler error:', e)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
