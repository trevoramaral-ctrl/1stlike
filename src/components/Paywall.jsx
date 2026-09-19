import { useState } from 'react'
import { signOut } from '../auth'
import { startCheckout } from '../lib/checkout'

const PERKS = [
  'The daily checklist, streak and follower growth graph',
  'The Hunt tools: tag stacks and comment openers',
  'Your data, private to you, on every device',
]

// Shown to signed-in members who haven't subscribed yet. `confirming` is true
// for the brief moment after returning from Stripe while the webhook catches up.
export default function Paywall({ confirming }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    setErr('')
    setBusy(true)
    try {
      await startCheckout() // redirects away on success
    } catch (e) {
      setErr(e.message || 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brandline">
          <svg className="heart" viewBox="0 0 24 24" fill="var(--red)" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.3 8.4 1.7 5 5 5c2 0 3.3 1.2 4 2.3C9.7 6.2 11 5 13 5c3.3 0 4.7 3.4 3 6.7C19.5 16.1 12 21 12 21z"/></svg>
          <span>First Like</span>
        </div>

        {confirming ? (
          <>
            <h1>Confirming your subscription…</h1>
            <p className="sub">One moment while we set your account up. This page updates on its own.</p>
            <p className="mono" style={{ marginTop: 18 }}>Talking to Stripe…</p>
          </>
        ) : (
          <>
            <h1>Unlock First Like</h1>
            <p className="sub">Your account is ready. Subscribe to open the full app.</p>

            <ul className="perks">
              {PERKS.map((p) => (
                <li key={p}>
                  <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <button className="primary" onClick={go} disabled={busy}>
              {busy ? 'Opening checkout…' : 'Subscribe'}
            </button>

            {err && <p className="err">{err}</p>}

            <p className="switch">
              Wrong account?{' '}
              <button className="link" onClick={signOut}>Sign out</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
