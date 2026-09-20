// Marketing splash for logged-out visitors: positioning, then a dashboard preview.
// The preview is a non-interactive mock. Everything below the third checked task
// blurs out, so visitors see the shape of the product but have to sign up for it.

const TASKS = [
  ["Set today's niche", true],
  ['Be first on 20 fresh posts', true],
  ['Leave 5 real comments', true],
  ['Reply to everyone on your posts', false],
  ['Follow 5 you genuinely rate', false],
  ['Glance at your profile', false],
]

const HASHTAGS = [
  ['#streetwearfits', 'Hot', 94],
  ['#vintagedenim', 'Climbing', 81],
  ['#thriftflip', 'Climbing', 72],
  ['#ootdmen', 'Steady', 58],
  ['#denimhead', 'Steady', 44],
]

const FRESH_POSTS = [
  ['@mavenstudio', '14s ago', '2 likes'],
  ['@denimdaily', '31s ago', '5 likes'],
  ['@thriftedco', '48s ago', '1 like'],
  ['@fitcheckfriday', '1m ago', '9 likes'],
  ['@rawselvedge', '1m ago', '4 likes'],
  ['@archivepieces', '2m ago', '11 likes'],
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
        <h1>Your one-stop shop for honest, interactive followers on Instagram.</h1>
        <p className="splash-sub">
          No bots. No bought followers. No engagement pods. First Like finds the right posts the
          second they go up, so the people who follow you are real people who chose to.
        </p>
        <button className="primary big" onClick={onSignUp}>Sign Up</button>
        <p className="splash-mini">
          Already have an account? <button className="link" onClick={onLogin}>Log in</button>
        </p>
      </section>

      <section className="splash-preview-wrap">
        <p className="splash-peek">Your dashboard</p>

        <div className="pv-shell">
          <div className="pv-grid" aria-hidden="true">

            {/* LEFT: growth + today's grind */}
            <div className="pv-col">
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
                {TASKS.map(([t, done], i) => (
                  <div className={`pv-task${done ? ' done' : ''}${i >= 3 ? ' pv-soft' : ''}`} key={t}>
                    <span className="pv-box">{done ? '✓' : ''}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: hashtags + fresh posts */}
            <div className="pv-col">
              <div className="pv-card">
                <div className="pv-h"><span>Hottest hashtags in your field</span></div>
                {HASHTAGS.map(([tag, label, pct]) => (
                  <div className="pv-tag" key={tag}>
                    <span className="pv-tag-name">{tag}</span>
                    <span className="pv-heat"><span style={{ width: `${pct}%` }} /></span>
                    <span className="pv-tag-label">{label}</span>
                  </div>
                ))}
              </div>

              <div className="pv-card">
                <div className="pv-h"><span>Freshest posts right now</span><span className="pv-live">● live</span></div>
                {FRESH_POSTS.map(([handle, age, likes]) => (
                  <div className="pv-post pv-tease" key={handle}>
                    <span className="pv-thumb" />
                    <span className="pv-post-meta">
                      <b>{handle}</b>
                      <span>{age} · {likes}</span>
                    </span>
                    <span className="pv-first">Be first</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pv-fade">
            <button className="primary" onClick={onSignUp}>Sign Up to unlock your dashboard</button>
          </div>
        </div>
      </section>

      <section className="splash-cta">
        <h2>Real people. Real comments. Real growth.</h2>
        <button className="primary big" onClick={onSignUp}>Sign Up</button>
      </section>
    </div>
  )
}
