// Clever 11 Admin — screens
// Login + Dashboard, with desktop & mobile renderings.

const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onSignIn, viewport = 'desktop' }) {
  const [email, setEmail] = useStateS('jonas@clever11.app');
  const [pwd, setPwd]     = useStateS('••••••••••••');
  const [loading, setLoading] = useStateS(false);
  const [err, setErr] = useStateS('');

  const submit = (e) => {
    e?.preventDefault?.();
    setErr('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!email.includes('@')) { setErr('Enter a valid email address.'); return; }
      onSignIn?.();
    }, 650);
  };

  const isDesktop = viewport === 'desktop';

  return (
    <div className="c11" data-screen-label={`Login (${viewport})`} style={{
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isDesktop ? 48 : 24,
      overflow: 'hidden',
    }}>
      {/* Warm radial glow — coral + lime, very subtle */}
      <div style={{
        position: 'absolute', top: '-30%', right: '-25%',
        width: 560, height: 560,
        background: 'radial-gradient(ellipse at center, rgba(255,122,89,0.10), transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', left: '-20%',
        width: 480, height: 480,
        background: 'radial-gradient(ellipse at center, rgba(212,255,58,0.06), transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Top-left logo */}
      <div style={{
        position: 'absolute', top: isDesktop ? 24 : 20, left: isDesktop ? 28 : 20,
      }}>
        <Logo size={15} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: isDesktop ? 400 : 360,
        padding: isDesktop ? '36px 36px 30px' : '28px 22px 24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-4)',
        boxShadow: 'var(--shadow-2)',
        position: 'relative',
        zIndex: 1,
      }}>
        <h1 style={{
          margin: 0, fontSize: isDesktop ? 26 : 22,
          fontWeight: 600, letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>
          Sign in to admin
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-mute)', marginBottom: 24 }}>
          Invite-only. Players sign in elsewhere.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, color: 'var(--fg-mute)', marginBottom: 6 }}>Email</label>
            <div className="input">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--fg-mute)', marginBottom: 6 }}>
              <span>Password</span>
              <span style={{ flex: 1 }} />
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--accent-2)', textDecoration: 'none', fontSize: 12 }}>Forgot?</a>
            </label>
            <div className="input">
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="current-password" />
            </div>
          </div>

          {err && (
            <div style={{
              fontSize: 13, padding: '9px 12px',
              background: 'var(--danger-soft)',
              border: '1px solid rgba(255,101,119,0.25)',
              borderRadius: 'var(--r-2)',
              color: 'var(--danger)',
            }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn--primary btn--block" style={{ height: 44, marginTop: 6 }}>
            {loading ? <><Spinner /> Signing in…</> : <>Sign in <I.arrow size={15} /></>}
          </button>
        </form>
      </div>

      {/* Bottom hint */}
      {isDesktop && (
        <div style={{
          position: 'absolute', bottom: 24, left: 28,
          fontSize: 12, color: 'var(--fg-faint)',
        }}>
          Need access? Ask Jonas.
        </div>
      )}
    </div>
  );
}

function CornerTick() { return null; }

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(0,0,0,0.3)', borderTopColor: 'var(--accent-fg)',
      borderRadius: '50%', animation: 'c11-spin 700ms linear infinite',
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD — DESKTOP
// ─────────────────────────────────────────────────────────────
function DashboardDesktop({ onNavigate, onSignOut, onOpenCmdK }) {
  return (
    <div className="c11" data-screen-label="Dashboard (desktop)" style={{
      width: '100%', height: '100%',
      display: 'flex',
      background: 'var(--bg)',
      position: 'relative',
    }}>
      <Sidebar active="dashboard" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar path="/admin" title="Dashboard" actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn--ghost"><I.import size={14} />Import cards</button>
            <button className="btn btn--primary"><I.plus size={14} />New question</button>
          </div>
        } />

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '28px 32px 40px' }}>
          {/* Hero header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>
                Good morning, Jonas.
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fg-mute)' }}>
                <span className="mono" style={{ color: 'var(--fg)' }}>3</span> questions awaiting review · <span className="mono" style={{ color: 'var(--accent-2)' }}>12</span> low-quality flagged
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              <StatBlip label="Games today"    value="1,247" />
              <div className="vr" style={{ margin: '4px 18px' }} />
              <StatBlip label="Players today"  value="3,108" delta="+12%" />
              <div className="vr" style={{ margin: '4px 18px' }} />
              <StatBlip label="Net votes / wk" value="+842"  delta="+18" />
            </div>
          </div>

          {/* Entry cards: 2 hero + Users demoted */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 26 }}>
            <EntryCard
              icon={I.deck} label="Decks" hint="Themed collections of questions"
              count={24} kpi="+2 this week" accent="lime"
              onClick={() => onNavigate?.('decks')}
            />
            <EntryCard
              icon={I.question} label="Questions" hint="487 published · 12 archived"
              count={487} kpi="+34 this week" accent="coral"
              onClick={() => onNavigate?.('questions')}
            />
          </div>

          {/* Bottom: activity + side column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500 }}>Recent activity</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 2 }}>
                    Last 24 hours
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn btn--ghost btn--sm">View all</button>
              </div>
              <ActivityFeed />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <UsersTile onNavigate={onNavigate} />
              <DevAffordances />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatBlip({ label, value, delta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96 }}>
      <span style={{ color: 'var(--fg-faint)', fontSize: 11.5 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ color: 'var(--fg)', fontSize: 17, fontWeight: 500 }}>{value}</span>
        {delta && <span style={{ color: 'var(--ok)', fontSize: 11.5 }}>{delta}</span>}
      </span>
    </div>
  );
}

// Small users tile — single-admin reality: this is mostly a 'who has access' utility
function UsersTile({ onNavigate }) {
  return (
    <button onClick={() => onNavigate?.('users')} className="card card--hover" style={{
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--r-1)',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'grid', placeItems: 'center', color: 'var(--fg-mute)',
      }}>
        <I.users size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>Users & access</div>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 2 }}>
          You + 1 collaborator with admin
        </div>
      </div>
      <I.caret size={14} style={{ color: 'var(--fg-faint)' }} />
    </button>
  );
}

function DevAffordances() {
  const [qid, setQid] = useStateS('');
  const [active, setActive] = useStateS(false);
  return (
    <div style={{
      background: 'transparent',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-3)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <I.bolt size={13} style={{ color: 'var(--fg-faint)' }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Force first question</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>Dev tool</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginBottom: 12 }}>
        Pin a specific question as the first card on the next game. Stored locally.
      </div>
      <div className="input" style={{ marginBottom: 10, height: 38 }}>
        <span className="affix">#</span>
        <input placeholder="question id" value={qid} onChange={(e) => setQid(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setActive(true)} className="btn btn--sm" style={{ height: 30 }}>Apply</button>
        <button onClick={() => { setActive(false); setQid(''); }} className="btn btn--ghost btn--sm" style={{ height: 30 }}>Clear</button>
        <span style={{ flex: 1 }} />
        {active && qid && (
          <span className="pill" style={{
            background: 'var(--accent-2-soft)',
            borderColor: 'var(--border-accent-2)',
            color: 'var(--accent-2)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)' }} />
            active · #{qid}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickLinks() { return null; }

// ─────────────────────────────────────────────────────────────
// DASHBOARD — MOBILE
// ─────────────────────────────────────────────────────────────
function DashboardMobile({ onNavigate, onSignOut, onOpenCmdK, onOpenDrawer }) {
  return (
    <div className="c11" data-screen-label="Dashboard (mobile)" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, flex: '0 0 52px',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 14px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15,15,18,0.85)',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={onOpenDrawer} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg)',
        }}><I.menu size={16} /></button>
        <Logo size={13} />
        <span style={{ flex: 1 }} />
        <button onClick={onOpenCmdK} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-mute)',
        }}><I.search size={15} /></button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px 32px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Hi, Jonas.
        </h1>
        <p style={{ margin: '6px 0 22px', fontSize: 13, color: 'var(--fg-mute)' }}>
          <span className="mono" style={{ color: 'var(--fg)' }}>3</span> awaiting review · <span className="mono" style={{ color: 'var(--accent-2)' }}>12</span> flagged
        </p>

        {/* Stat strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8, marginBottom: 22,
        }}>
          {[
            { label: 'Games today',  value: '1,247' },
            { label: 'Players',      value: '3.1k', delta: '+12%' },
            { label: 'Net votes',    value: '+842', delta: '+18' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 17, color: 'var(--fg)' }}>{s.value}</span>
                {s.delta && <span style={{ fontSize: 10.5, color: 'var(--ok)' }}>{s.delta}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Entry cards stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { id: 'decks',     icon: I.deck,     label: 'Decks',     count: 24,  hint: '+2 this week',  accent: 'lime' },
            { id: 'questions', icon: I.question, label: 'Questions', count: 487, hint: '+34 this week', accent: 'coral' },
            { id: 'users',     icon: I.users,    label: 'Users & access', count: 2, hint: 'You + 1 admin' },
          ].map((c) => {
            const a = {
              lime:  { soft: 'var(--accent-soft)',   border: 'var(--border-accent)',   fg: 'var(--accent)' },
              coral: { soft: 'var(--accent-2-soft)', border: 'var(--border-accent-2)', fg: 'var(--accent-2)' },
            }[c.accent];
            return (
              <button key={c.id} onClick={() => onNavigate?.(c.id)} className="card card--hover" style={{
                padding: 14, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--r-2)',
                  background: a ? a.soft : 'var(--surface-2)',
                  border: `1px solid ${a ? a.border : 'var(--border)'}`,
                  color: a ? a.fg : 'var(--fg-mute)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <c.icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 2 }}>{c.hint}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.04em' }}>{c.count}</div>
                </div>
                <I.caret size={15} style={{ color: 'var(--fg-faint)' }} />
              </button>
            );
          })}
        </div>

        {/* Activity */}
        <div className="eyebrow" style={{ marginBottom: 10 }}>Recent activity</div>
        <div className="card" style={{ overflow: 'hidden', marginBottom: 22 }}>
          {ACTIVITY_MOBILE.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              fontSize: 12.5,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 'var(--r-1)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'grid', placeItems: 'center', color: 'var(--fg-mute)',
                flex: '0 0 24px',
              }}>
                <a.icon size={11} />
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--fg-mute)' }}>{a.verb}</span>{' '}
                <span>{a.target}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{a.t}</span>
            </div>
          ))}
        </div>

        {/* Dev affordances */}
        <div className="eyebrow" style={{ marginBottom: 10 }}>Dev tools</div>
        <div style={{
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-3)',
          padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <I.bolt size={13} style={{ color: 'var(--fg-faint)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Force first question</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 4, marginBottom: 10 }}>
            Pin a question to start the next game.
          </div>
          <div className="input" style={{ marginBottom: 8, height: 40 }}>
            <span className="affix">#</span>
            <input placeholder="question id" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn--sm" style={{ flex: 1, height: 34 }}>Apply</button>
            <button className="btn btn--ghost btn--sm" style={{ flex: 1, height: 34 }}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_MOBILE = [
  { t: '2 min',   verb: 'Edited',   target: 'Q #214', icon: I.edit },
  { t: '14 min',  verb: 'Imported', target: '8 questions', icon: I.import },
  { t: '47 min',  verb: 'Archived', target: 'Q #88', icon: I.archive },
  { t: '2 hr',    verb: 'Created',  target: 'Deck "90-talet"', icon: I.plus },
  { t: '5 hr',    verb: 'Edited',   target: 'Q #102', icon: I.edit },
];

// keyframe spin (added via injected style)
const spinStyleTag = (typeof document !== 'undefined' && !document.getElementById('c11-spin-kf')) ? (() => {
  const s = document.createElement('style'); s.id = 'c11-spin-kf';
  s.textContent = '@keyframes c11-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
  return true;
})() : null;

Object.assign(window, {
  LoginScreen, DashboardDesktop, DashboardMobile,
});
