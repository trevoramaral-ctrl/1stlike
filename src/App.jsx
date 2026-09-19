import { useAuth } from './auth'
import { supabaseReady } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'

export default function App() {
  const { user, loading } = useAuth()

  if (!supabaseReady) {
    return (
      <div className="setup">
        <h1>Almost there</h1>
        <p>
          Add your Supabase keys to a <code>.env</code> file (see
          <code> .env.example</code>) and restart, and First Like will boot.
        </p>
      </div>
    )
  }

  if (loading) return <div className="setup"><p className="mono">Loading…</p></div>

  return user ? <Dashboard /> : <AuthScreen />
}
