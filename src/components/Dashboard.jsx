import { useEffect, useRef, useState } from 'react'
import { useAuth, signOut } from '../auth'
import { loadProfile, saveProfile } from '../lib/store'
import { startCheckout } from '../lib/checkout'

// `n` marks a task Instagram's API cannot verify, so the member logs it themselves.
const MANUAL_LIKES = 'Instagram’s API doesn’t let any app see likes you leave on other people’s posts, so this one can’t be checked automatically. You log it yourself. Automating it is exactly what gets accounts banned, and it’s the bot behaviour we refuse to do.'
const MANUAL_COMMENTS = 'Instagram’s API doesn’t let any app see comments you leave on other people’s posts, so this one can’t be checked automatically. You log it yourself. Automating it is exactly what gets accounts banned, and it’s the bot behaviour we refuse to do.'
const MANUAL_FOLLOWS = 'Instagram’s API doesn’t expose who you follow, so this one can’t be checked automatically. You log it yourself. Automating it is exactly what gets accounts banned, and it’s the bot behaviour we refuse to do.'

const TASKS = [
  { id: 'niche',   t: "Set today's niche",            m: 2, d: 'Decide where you’re hunting today and pull your tag stacks.' },
  { id: 'first',   t: 'Be first on 20 fresh posts',   m: 7, d: 'Like within the first minute. Skip anything already on hundreds of likes.', n: MANUAL_LIKES },
  { id: 'comment', t: 'Leave 5 real comments',        m: 5, d: 'Use an opener, tweak one word so it fits the actual post.', n: MANUAL_COMMENTS },
  { id: 'reply',   t: 'Reply to everyone on your posts', m: 3, d: 'Fast replies tell the algorithm you’re active.' },
  { id: 'follow',  t: 'Follow 5 you genuinely rate',  m: 2, d: 'Only people you’d want listening. Engage first, then follow.', n: MANUAL_FOLLOWS },
  { id: 'profile', t: 'Glance at your profile',       m: 1, d: 'Bio sharp, latest post strong. It’s where all this traffic lands.' },
]

const FREE_TASKS = 3
// The whole routine is built to cost 20 minutes. That promise is the product.
const DAILY_MINUTES = TASKS.reduce((sum, t) => sum + t.m, 0)
const FREE_MINUTES = TASKS.slice(0, FREE_TASKS).reduce((sum, t) => sum + t.m, 0)
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

// Grade is built only from things we can actually observe: the member's streak,
// today's completed tasks, and the follower numbers they've logged.
function grade(streak, doneCount, delta, haveSeries) {
  const consistency = Math.min(40, streak * 5)
  const today = (doneCount / TASKS.length) * 30
  const growth = !haveSeries ? 0 : delta > 0 ? 30 : delta === 0 ? 15 : 5
  const score = Math.round(consistency + today + growth)
  const letter =
    score >= 90 ? 'A' : score >= 82 ? 'A−' : score >= 74 ? 'B+' : score >= 66 ? 'B' :
    score >= 58 ? 'B−' : score >= 50 ? 'C+' : score >= 40 ? 'C' : score >= 25 ? 'D' : '—'
  return { score, letter, consistency, today, growth }
}

function Spark({ data, color = 'var(--pink)' }) {
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
    <svg className="pv-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="3.5" fill={color} />
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
  const [checks, setChecks] = useState({})
  const [completedDates, setCompletedDates] = useState([])
  const [sessionMs, setSessionMs] = useState(0)
  const [running, setRunning] = useState(false)
  const sessionRef = useRef(0)
  const checksRef = useRef({})
  const datesRef = useRef([])

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
        if (st.day === todayStr()) {
          setChecks(st.checks || {})
          setSessionMs(st.sessionMs || 0)
        } else {
          setChecks({})
          setSessionMs(0)
        }
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [user.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    setConfirming(true)
    let tries = 0, alive = true
    const clean = () => window.history.replaceState({}, '', window.location.pathname)
    const iv = setInterval(async () => {
      tries += 1
      try {
        const p = await loadProfile(user.id)
        if (p.is_paid) {
          if (alive) { setIsPaid(true); setConfirming(false) }
          clean(); clearInterval(iv); return
        }
      } catch (e) { console.error(e) }
      if (tries >= 10) { if (alive) setConfirming(false); clean(); clearInterval(iv) }
    }, 2000)
    return () => { alive = false; clearInterval(iv) }
  }, [user.id])

  async function goPro() {
    setProErr(''); setProBusy(true)
    try { await startCheckout() }
    catch (e) { setProErr(e.message || 'Something went wrong. Try again.'); setProBusy(false) }
  }

  const persist = (patch) => { saveProfile(user.id, patch).catch((e) => console.error(e)) }

  useEffect(() => { sessionRef.current = sessionMs }, [sessionMs])
  useEffect(() => { checksRef.current = checks }, [checks])
  useEffect(() => { datesRef.current = completedDates }, [completedDates])

  // One writer for today's state so the timer and the checklist never clobber each other.
  const writeState = (patch = {}) => {
    persist({
      state: {
        day: todayStr(),
        checks: patch.checks ?? checksRef.current,
        completedDates: patch.completedDates ?? datesRef.current,
        sessionMs: patch.sessionMs ?? sessionRef.current,
      },
    })
  }

  // The meter only advances while the tab is actually in front of you. Leaving it
  // open in a background tab shouldn't earn you credit for work you didn't do.
  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setSessionMs((ms) => Math.min(ms + 1000, DAILY_MINUTES * 60000))
    }, 1000)
    return () => clearInterval(iv)
  }, [running])

  // Save progress periodically while running, and once on pause.
  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => writeState({ sessionMs: sessionRef.current }), 20000)
    return () => { clearInterval(iv); writeState({ sessionMs: sessionRef.current }) }
  }, [running])

  const toggle = (id, val) => {
    const nextChecks = { ...checks, [id]: val }
    setChecks(nextChecks)
    if (val && !running) setRunning(true) // ticking anything starts the clock
    let nextDates = completedDates
    if (TASKS.every((t) => nextChecks[t.id]) && !completedDates.includes(todayStr())) {
      nextDates = [...completedDates, todayStr()]
      setCompletedDates(nextDates)
      setRunning(false)
    }
    writeState({ checks: nextChecks, completedDates: nextDates })
  }

  const resetDay = () => {
    setChecks({})
    setSessionMs(0)
    setRunning(false)
    writeState({ checks: {}, sessionMs: 0 })
  }

  const saveHandle = () => {
    const v = handleDraft.trim().replace(/^@+/, '')
    if (!v) return
    setHandle(v); persist({ handle: v })
  }

  const logCount = () => {
    const v = parseInt(countDraft, 10)
    if (isNaN(v) || v < 0) return
    const next = { ...follows, [todayStr()]: v }
    setFollows(next); setCountDraft(''); persist({ follows: next })
  }

  if (loading) return <div className="setup"><p className="mono">Loading your account…</p></div>

  const paid = isPaid
  const series = Object.keys(follows).sort().map((d) => ({ d, n: Number(follows[d]) })).filter((x) => !isNaN(x.n))
  const current = series.length ? series[series.length - 1].n : null
  const delta = series.length ? current - series[0].n : 0
  const doneCount = TASKS.filter((t) => checks[t.id]).length
  const doneFree = TASKS.slice(0, FREE_TASKS).filter((t) => checks[t.id]).length
  const minutesDone = TASKS.filter((t) => checks[t.id]).reduce((sum, t) => sum + t.m, 0)
  // The meter is whichever is further along: time actually worked, or the value of
  // the tasks already ticked. So it drifts up as you work and jumps when you finish one.
  const workedMin = sessionMs / 60000
  const meterMin = Math.min(DAILY_MINUTES, Math.max(workedMin, minutesDone))
  const meterPct = (meterMin / DAILY_MINUTES) * 100
  const clock = `${Math.floor(meterMin)}:${pad(Math.round((meterMin % 1) * 60))}`
  const full = meterMin >= DAILY_MINUTES
  const streak = computeStreak(completedDates)
  const loggedToday = follows[todayStr()] != null
  const g = grade(streak, doneCount, delta, series.length > 1)

  const Upsell = ({ label }) => (
    <button className="primary" onClick={goPro} disabled={proBusy}>
      {proBusy ? 'Opening checkout…' : label}
    </button>
  )

  return (
    <div className="wrap hub">
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

        <div className="greet">
          <h2>Hey {handle ? `@${handle}` : 'there'} 👋</h2>
          <p>
            {paid
              ? (series.length > 1 ? 'Line’s moving. Keep feeding it.' : 'Log today’s number to start drawing the line.')
              : 'Three tasks are on the house today. The rest is one step away.'}
          </p>
        </div>

        {!paid && !handle && (
          <div className="hero-form greet-form">
            <input value={handleDraft} onChange={(e) => setHandleDraft(e.target.value)}
              placeholder="your @handle" autoComplete="off" autoCapitalize="off" />
            <button onClick={saveHandle}>Save</button>
          </div>
        )}

        <div className="hub-grid">
          {/* LEFT */}
          <div className="hub-col">
            <div className="pv-card">
              <div className="pv-h"><span>Follower growth</span></div>
              {paid ? (
                <>
                  <div className="pv-count-lg">
                    <b>{current != null ? current.toLocaleString() : '—'}</b>
                    {series.length > 1 && (
                      <span className={delta < 0 ? 'neg' : ''}>
                        {delta >= 0 ? '+' : ''}{delta.toLocaleString()} since {prettyDate(series[0].d)}
                      </span>
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
                </>
              ) : (
                <>
                  <div className="blur-wrap">
                    <div className="blurred" aria-hidden="true"><Spark data={SAMPLE_SERIES} /></div>
                    <div className="blur-cta"><Upsell label="Subscribe to track your growth" /></div>
                  </div>
                  <p className="hero-note">Log your follower count daily and watch the line build.</p>
                </>
              )}
            </div>

            <div className="pv-card">
              <div className="pv-h">
                <span>Today’s grind</span>
                <span className="mono">{paid ? `${doneCount} / ${TASKS.length}` : `${doneFree} / ${FREE_TASKS} free`}</span>
              </div>

              {paid && doneCount === TASKS.length && (
                <div className="done-badge"><b>Day done.</b> You showed up. That’s how the number climbs.</div>
              )}
              {!paid && doneFree === FREE_TASKS && (
                <div className="done-badge"><b>Nice start.</b> Subscribe to unlock the rest and keep a streak.</div>
              )}

              {TASKS.map((task, i) => {
                const locked = !paid && i >= FREE_TASKS
                return (
                  <div className={`task${locked ? ' locked' : ''}`} key={task.id}>
                    <input type="checkbox" id={`chk-${task.id}`} checked={!!checks[task.id]} disabled={locked}
                      onChange={(e) => toggle(task.id, e.target.checked)} />
                    <label className="b" htmlFor={`chk-${task.id}`}>
                      <span className="t">{task.t}{locked ? ' 🔒' : ''}</span>
                      <span className="d">{locked ? `Subscriber-only · ${task.m} min` : `${task.d} · ${task.m} min`}</span>
                    </label>
                    {task.n && !locked && (
                      <span className="tip" tabIndex={0} aria-label={task.n}>
                        i<span className="tip-bubble" role="tooltip">{task.n}</span>
                      </span>
                    )}
                  </div>
                )
              })}

              {paid && <button className="reset" onClick={resetDay}>Reset today</button>}
            </div>

            <div className="pv-card meter-card">
              <p className="grind-note">No bots, no blah-blah-blah. 20 minutes a day.</p>
              <div className="meter">
                <div className="meter-head">
                  <span className={`mono meter-clock${running ? ' is-running' : ''}`}>
                    {running && <span className="meter-dot" />}
                    {clock} <span className="meter-of">of {DAILY_MINUTES}:00</span>
                  </span>
                  <button className="meter-btn" onClick={() => setRunning((r) => !r)} disabled={full}>
                    {full ? 'Done for today' : running ? 'Pause' : meterMin > 0 ? 'Resume' : 'Start'}
                  </button>
                </div>
                <div className="meter-track">
                  <span className="meter-fill" style={{ width: `${meterPct}%` }} />
                  {!paid && <span className="meter-locked" style={{ left: `${(FREE_MINUTES / DAILY_MINUTES) * 100}%` }} />}
                </div>
                <p className="hero-note" style={{ marginTop: 8 }}>
                  {full
                    ? 'That’s your twenty. Everything after this is a bonus.'
                    : running
                      ? 'Clock’s running. It only counts while this tab is in front of you.'
                      : 'Hit start, or just tick your first task and the clock starts itself.'}
                  {!paid && ` ${FREE_MINUTES} of the ${DAILY_MINUTES} minutes are free each day.`}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="hub-col">
            <div className="pv-card">
              <div className="pv-h">
                <span>Report card</span>
                {paid && <span className="pv-grade">{g.letter}</span>}
              </div>
              {paid ? (
                <>
                  <div className="pv-tag">
                    <span className="pv-tag-name">Consistency</span>
                    <span className="pv-heat"><span style={{ width: `${(g.consistency / 40) * 100}%` }} /></span>
                    <span className="pv-tag-label">{streak}-day streak</span>
                  </div>
                  <div className="pv-tag">
                    <span className="pv-tag-name">Today’s tasks</span>
                    <span className="pv-heat"><span style={{ width: `${(doneCount / TASKS.length) * 100}%` }} /></span>
                    <span className="pv-tag-label">{doneCount} of {TASKS.length} done</span>
                  </div>
                  <div className="pv-tag">
                    <span className="pv-tag-name">Follower growth</span>
                    <span className="pv-heat"><span style={{ width: `${(g.growth / 30) * 100}%` }} /></span>
                    <span className="pv-tag-label">
                      {series.length > 1 ? `${delta >= 0 ? '+' : ''}${delta.toLocaleString()} logged` : 'log 2+ days'}
                    </span>
                  </div>
                  <p className="hero-note">
                    Scored from what we can actually see: your streak, today’s checklist, and the follower
                    numbers you’ve logged. Reach and engagement join in once Instagram is connected.
                  </p>
                </>
              ) : (
                <>
                  <p className="hero-note" style={{ marginTop: 0 }}>
                    A running score of your consistency, your daily tasks and your follower growth, so you
                    can see the work turning into numbers.
                  </p>
                  <Upsell label="Subscribe to see your score" />
                </>
              )}
            </div>

            <div className="pv-card">
              <div className="pv-h"><span>Hottest hashtags in your field</span></div>
              <p className="hero-note" style={{ marginTop: 0 }}>
                Live hashtag heat for your niche. This switches on when you connect your Instagram
                professional account, which is coming shortly.
              </p>
              {!paid && <Upsell label="Subscribe" />}
            </div>

            <div className="pv-card">
              <div className="pv-h"><span>Freshest posts right now</span></div>
              <p className="hero-note" style={{ marginTop: 0 }}>
                Posts in your niche seconds after they land, so you can actually be first. Switches on with
                your Instagram connection.
              </p>
              {!paid && <Upsell label="Subscribe" />}
            </div>

            {!paid && (
              <div className="soon upsell">
                <b>Unlock the full app</b>
                <p>The rest of today’s routine, your daily streak, follower growth tracking, your report card,
                  and the Toolkit (tag stacks and comment openers).</p>
                <Upsell label="Subscribe" />
                {proErr && <p className="err">{proErr}</p>}
              </div>
            )}
            {paid && (
              <div className="soon">
                <b>The Toolkit</b>
                <p>Tag stacks and comment openers land here next.</p>
              </div>
            )}
          </div>
        </div>
        {proErr && paid && <p className="err">{proErr}</p>}
      </main>
    </div>
  )
}
