import { useEffect, useState } from 'react'
import { useAuth, signOut } from '../auth'
import { loadProfile, saveProfile } from '../lib/store'
import { startCheckout } from '../lib/checkout'

const TASKS = [
  { id: 'niche',   t: "Set today's niche",            d: 'Decide where you’re hunting today and pull your tag stacks.' },
  { id: 'first',   t: 'Be first on 20 fresh posts',   d: 'Like within the first minute. Skip anything already on hundreds of likes.' },
  { id: 'comment', t: 'Leave 5 real comments',        d: 'Use an opener, tweak one word so it fits the actual post.' },
  { id: 'reply',   t: 'Reply to everyone on your posts', d: 'Fast replies tell the algorithm you’re active.' },
  { id: 'follow',  t: 'Follow 5 you genuinely rate',  d: 'Only people you’d want listening. Engage first, then follow.' },
  { id: 'profile', t: 'Glance at your profile',       d: 'Bio sharp, latest post strong. It’s where all this traffic lands.' },
]

// Free members get the first few tasks; the rest of the routine, the streak,
// follower tracking and the Hunt tools are subscriber-only.
const FREE_TASKS = 3

// A believable-looking teaser graph shown blurred to non-subscribers.
const SAMPLE_SERIES = [1180, 1240, 1215, 1330, 1402, 1388, 1475, 1560].map((n, i) => ({ d: String(i), n }))

const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const prettyDate = (s) => {
  const [y, m, d] = s.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function computeStreak(completedDates = []) {
  const set = new Set(completedDates)
  const d = new Date()
  if (!set.has(todayStr())) d.setDate(d.getDate() - 1)
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    if (!set.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function Spark({ data }) {
  if (data.length < 2) return null
  const w = 300, h = 64, p = 8
  const ns = data.map((x) => x.n)
  const min = Math.min(...ns)
  let max = Math.max(...ns)
  if (max === min) max = min + 1
  const pts = data.map((pt, i) => {
    const x = p + (i / (data.length - 1)) * (w - 2 * p)
    const y = h - p - ((pt.n - min) / (max - min)) * (h - 2 * p)
    return [x, y]
  })
  const last = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill="none" stroke="var(--red)" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="3.5" fill="var(--red)" />
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [proBusy, setProBusy] = useState(false)
  const [proErr, setProErr] = useState('')
  const [handle, setHandle] = useState('')
  const [handleDraft, setHandleDraft] = useState('')
  const [countDraft, setCountDraft] = useState('')
  const [follows, setFollows] = useState({})
  const [day, setDay] = useState(todayStr())
  const [checks, setChecks] = useState({})
  const [completedDates, setCompletedDates] = useState([])

  useEffect(() => {
    let alive = true
    loadProfile(user.id)
      .then((p) => {
        if (!alive) return
        const st = p.state || {}
        setHandle(p.handle || '')
        setIsPaid(!!p.is_paid)
        setFollows(p.follows || {})
        setCompletedDates(Array.isArray(st.completedDates) ? st.completedDates : [])
        // new day rolls the checklist over, history stays
        if (st.day === todayStr()) {
          setChecks(st.checks || {})
          setDay(st.day)
        } else {
          setChecks({})
          setDay(todayStr())
        }
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [user.id])

  // Coming back from Stripe? The webhook flips is_paid server-side moments after
  // payment. Poll briefly until it lands, then unlock the app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    setConfirming(true)
    let tries = 0
    let alive = true
    const clean = () => window.history.replaceState({}, '', window.location.pathname)
    const iv = setInterval(async () => {
      tries += 1
      try {
        const p = await loadProfile(user.id)
        if (p.is_paid) {
          if (alive) { setIsPaid(true); setConfirming(false) }
          clean(); clearInterval(iv)
          return
        }
      } catch (e) { console.error(e) }
      if (tries >= 10) { if (alive) setConfirming(false); clean(); clearInterval(iv) }
    }, 2000)
    return () => { alive = false; clearInterval(iv) }
  }, [user.id])

  async function goPro() {
    setProErr('')
    setProBusy(true)
    try {
      await startCheckout() // redirects away on success
    } catch (e) {
      setProErr(e.message || 'Something went wrong. Try again.')
      setProBusy(false)
    }
  }

  const persist = (patch) => {
    saveProfile(user.id, patch).catch((e) => console.error(e))
  }

  const toggle = (id, val) => {
    const nextChecks = { ...checks, [id]: val }
    setChecks(nextChecks)
    let nextDates = completedDates
    const allDone = TASKS.every((t) => nextChecks[t.id])
    if (allDone && !completedDates.includes(todayStr())) {
      nextDates = [...completedDates, todayStr()]
      setCompletedDates(nextDates)
    }
    persist({ state: { day: todayStr(), checks: nextChecks, completedDates: nextDates } })
  }

  const resetDay = () => {
    setChecks({})
    persist({ state: { day: todayStr(), checks: {}, completedDates } })
  }

  const saveHandle = () => {
    const v = handleDraft.trim().replace(/^@+/, '')
    if (!v) return
    setHandle(v)
    persist({ handle: v })
  }

  const logCount = () => {
    const v = parseInt(countDraft, 10)
    if (isNaN(v) || v < 0) return
    const next = { ...follows, [todayStr()]: v }
    setFollows(next)
    persist({ follows: next })
  }

  if (loading) return <div className="setup"><p className="mono">Loading your account…</p></div>

  const paid = isPaid
  const series = Object.keys(follows).sort().map((d) => ({ d, n: Number(follows[d]) })).filter((x) => !isNaN(x.n))
  const current = series.length ? series[series.length - 1].n : null
  const delta = series.length ? current - series[0].n : 0
  const doneCount = TASKS.filter((t) => checks[t.id]).length
  const doneFree = TASKS.slice(0, FREE_TASKS).filter((t) => checks[t.id]).length
  const streak = computeStreak(completedDates)
  const loggedToday = follows[todayStr()] != null

  const UpsellButton = ({ label }) => (
    <button className="primary" onClick={goPro} disabled={proBusy}>
      {proBusy ? 'Opening checkout…' : label}
    </button>
  )

  return (
    <div className="wrap">
      <div className="bar">
        <svg className="heart" viewBox="0 0 24 24" fill="var(--lime)" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.3 8.4 1.7 5 5 5c2 0 3.3 1.2 4 2.3C9.7 6.2 11 5 13 5c3.3 0 4.7 3.4 3 6.7C19.5 16.1 12 21 12 21z"/></svg>
        <span className="brand">First Like</span>
        {paid && <span className="streak" title="Day streak">🔥 {streak}</span>}
        <button className="link signout" onClick={signOut}>Sign out</button>
      </div>

      <main>
        {confirming && (
          <div className="done-badge"><b>Confirming your subscription…</b> This updates on its own.</div>
        )}

        {paid ? (
          <div className="hero">
            <div className="hero-top">
              <div>
                <p className="hi">{handle ? `Hey @${handle} 👋` : 'Hey there 👋'}</p>
                <p className="hisub">
                  {series.length > 1
                    ? 'Line’s moving. Keep feeding it.'
                    : series.length === 1
                      ? 'Day one logged. Log again tomorrow to draw the line.'
                      : 'Let’s get today’s likes in.'}
                </p>
              </div>
              {current != null && (
                <div className="count">
                  <b>{current.toLocaleString()}</b>
                  <span className={delta < 0 ? 'neg' : ''}>
                    {delta >= 0 ? '+' : ''}{delta.toLocaleString()} since {prettyDate(series[0].d)}
                  </span>
                </div>
              )}
            </div>

            <Spark data={series} />

            {!handle && (
              <div className="hero-form">
                <input value={handleDraft} onChange={(e) => setHandleDraft(e.target.value)}
                  placeholder="your @handle" autoComplete="off" autoCapitalize="off" />
                <button onClick={saveHandle}>Save</button>
              </div>
            )}

            <div className="hero-form">
              <input type="number" inputMode="numeric" value={countDraft}
                onChange={(e) => setCountDraft(e.target.value)} placeholder="today's follower count" />
              <button onClick={logCount}>Log today</button>
            </div>
            <p className="hero-note">
              {loggedToday
                ? 'Today’s number is in. Automatic Instagram sync lands in a later update.'
                : 'Log today’s number to keep your proof current.'}
            </p>
          </div>
        ) : (
          <div className="hero">
            <div className="hero-top">
              <div>
                <p className="hi">{handle ? `Hey @${handle} 👋` : 'Hey there 👋'}</p>
                <p className="hisub">Your follower growth, tracked day by day. Subscribe to log your real numbers.</p>
              </div>
              <div className="count blurred" aria-hidden="true">
                <b>1,560</b><span>+380 this month</span>
              </div>
            </div>

            <div className="blur-wrap">
              <div className="blurred" aria-hidden="true"><Spark data={SAMPLE_SERIES} /></div>
              <div className="blur-cta">
                <UpsellButton label="Subscribe to unlock your graph" />
              </div>
            </div>
            {proErr && <p className="err">{proErr}</p>}
          </div>
        )}

        <h1>Today's grind</h1>
        <p className="day">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>

        <div className="prog">
          <span className="mono">{paid ? `${doneCount} / ${TASKS.length}` : `${doneFree} / ${FREE_TASKS} free`}</span>
          <div className="bar-track">
            <span style={{ width: `${(paid ? doneCount / TASKS.length : doneFree / FREE_TASKS) * 100}%` }} />
          </div>
        </div>

        {paid && doneCount === TASKS.length && (
          <div className="done-badge"><b>Day done.</b> You showed up. That’s how the number climbs.</div>
        )}
        {!paid && doneFree === FREE_TASKS && (
          <div className="done-badge"><b>Nice start.</b> Subscribe to unlock the rest of the routine and keep a streak.</div>
        )}

        <div className="list">
          {TASKS.map((task, i) => {
            const locked = !paid && i >= FREE_TASKS
            return (
              <div className={`task${locked ? ' locked' : ''}`} key={task.id}>
                <input type="checkbox" id={`chk-${task.id}`} checked={!!checks[task.id]} disabled={locked}
                  onChange={(e) => toggle(task.id, e.target.checked)} />
                <label className="b" htmlFor={`chk-${task.id}`}>
                  <span className="t">{task.t}{locked ? ' 🔒' : ''}</span>
                  <span className="d">{locked ? 'Subscriber-only. Unlock the full routine below.' : task.d}</span>
                </label>
              </div>
            )
          })}
        </div>

        {paid && <button className="reset" onClick={resetDay}>Reset today</button>}

        {paid ? (
          <div className="soon">
            <b>The Toolkit</b>
            <p>Tag stacks and comment openers land here next.</p>
          </div>
        ) : (
          <div className="soon upsell">
            <b>Unlock the full app</b>
            <p>The rest of today’s routine, your daily streak, follower growth tracking, and the Toolkit (tag stacks and comment openers). All in the subscription.</p>
            <UpsellButton label="Subscribe" />
            {proErr && <p className="err">{proErr}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
