// Marketing splash shown to logged-out visitors. Sign Up (or Log in) leads to the
// auth screen; the dashboard preview below is a non-interactive snapshot of what
// you get after signing up.
const PREVIEW_TASKS = [
  ["Set today's niche", true],
  ['Be first on 20 fresh posts', true],
  ['Leave 5 real comments', true],
  ['Reply to everyone on your posts', false],
  ['Follow 5 you genuinely rate', false],
  ['Glance at your profile', false],
]

const Heart = () => (
  <svg className="heart" viewBox="0 0 24 24" fill="var(--red)" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.3 8.4 1.7 5 5 5c2 0 3.3 1.2 4 2.3C9.7 6.2 11 5 13 5c3.3 0 4.7 3.4 3 6.7C19.5 16.1 12 21 12 21z"/></svg>
)

export default function Splash({ onSignUp, onLogin }) {
  return (
    <div className="splash">
      <header className="splash-nav">
        <div className="brandline"><Heart /><span>First Like</span></div>
        <button className="link" onClick={onLogin}>Log in</button>
      </header>

      <section className="splash-hero">
        <h1>Be first. Every day.</h1>
        <p className="splash-sub">
          First Like turns Instagram growth into one simple daily routine. Show up, work the
          list, watch your follower line climb.
        </p>
        <button className="primary big" onClick={onSignUp}>Sign Up</button>
        <p className="splash-mini">
          Already have an account? <button className="link" onClick={onLogin}>Log in</button>
        </p>
      </section>

      <section className="splash-preview-wrap">
        <p className="splash-peek">A peek at what's inside</p>
        <div className="preview" aria-hidden="true">
          <div className="pv-card">
            <div className="pv-row">
              <div>
                <div className="pv-hi">Hey @you 👋</div>
                <div className="pv-subtext">Line’s moving. Keep feeding it.</div>
              </div>
              <div className="pv-count"><b>1,560</b><span>+380 this month</span></div>
            </div>
            <svg className="pv-spark" viewBox="0 0 300 64" preserveAspectRatio="none">
              <polyline points="8,52 50,44 92,47 134,34 176,26 218,28 260,16 292,10"
                fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="292" cy="10" r="3.5" fill="var(--red)"/>
            </svg>
          </div>

          <div className="pv-card">
            <div className="pv-h"><span>Today’s grind</span><span className="pv-streak">🔥 6</span></div>
            {PREVIEW_TASKS.map(([t, done], i) => (
              <div className={`pv-task${done ? ' done' : ''}`} key={i}>
                <span className="pv-box">{done ? '✓' : ''}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="splash-cta">
        <h2>Ready to grow?</h2>
        <button className="primary big" onClick={onSignUp}>Sign Up</button>
      </section>
    </div>
  )
}
