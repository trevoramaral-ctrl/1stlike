import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen({ initialMode = 'signin', onBack }) {
  const [mode, setMode] = useState(initialMode) // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg('Account created. If email confirmation is on, check your inbox, then sign in.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // AuthProvider picks up the session and swaps to the dashboard.
      }
    } catch (e2) {
      setErr(e2.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        {onBack && <button className="link back" onClick={onBack}>← Back</button>}
        <div className="brandline">
          <svg className="heart" viewBox="0 0 24 24" fill="var(--red)" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.3 8.4 1.7 5 5 5c2 0 3.3 1.2 4 2.3C9.7 6.2 11 5 13 5c3.3 0 4.7 3.4 3 6.7C19.5 16.1 12 21 12 21z"/></svg>
          <span>First Like</span>
        </div>
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="sub">
          {mode === 'signup'
            ? 'One login that remembers your streak, your niche, and your growth.'
            : 'Pick up right where you left off.'}
        </p>

        <form onSubmit={submit}>
          <label className="fl" htmlFor="email">Email</label>
          <input id="email" type="email" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
          <label className="fl" htmlFor="password">Password</label>
          <input id="password" type="password" value={password}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)} required minLength={6}
            placeholder={mode === 'signup' ? 'at least 6 characters' : 'your password'} />
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'One sec…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {err && <p className="err">{err}</p>}
        {msg && <p className="ok">{msg}</p>}

        <p className="switch">
          {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button className="link" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(''); setMsg('') }}>
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
