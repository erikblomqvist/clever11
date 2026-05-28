// Clever 11 Admin — shared components
// Icons (inline SVG, Lucide-flavored but redrawn so we don't depend on Lucide here),
// Sidebar, TopBar, EntryCard, ActivityFeed, CmdK palette, MobileDrawer.

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Icons — minimal stroke set, 1.5px @ 20×20
// ─────────────────────────────────────────────────────────────
const Ico = (paths, vb = "0 0 24 24") => (props) => (
  <svg width={props.size ?? 18} height={props.size ?? 18} viewBox={vb}
       fill="none" stroke="currentColor" strokeWidth={props.sw ?? 1.6}
       strokeLinecap="round" strokeLinejoin="round" style={props.style}>
    {paths}
  </svg>
);

const I = {
  deck:       Ico(<><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></>),
  question:   Ico(<><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 4 2.5c-.7.5-1.5 1-1.5 2"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></>),
  users:      Ico(<><circle cx="9" cy="8" r="3.5"/><path d="M3 19c.5-3.2 3-5 6-5s5.5 1.8 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2 0 4 1.4 5 4"/></>),
  quality:    Ico(<><path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h6v6"/></>),
  import:     Ico(<><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></>),
  cmd:        Ico(<><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/></>),
  search:     Ico(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></>),
  bell:       Ico(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 0 0 4 0"/></>),
  menu:       Ico(<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></>),
  close:      Ico(<><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>),
  arrow:      Ico(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>),
  caret:      Ico(<><path d="m9 6 6 6-6 6"/></>),
  chip:       Ico(<><rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M9 9h6v6H9z"/><path d="M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3M9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3"/></>),
  plus:       Ico(<><path d="M12 5v14M5 12h14"/></>),
  clock:      Ico(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  archive:    Ico(<><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></>),
  trash:      Ico(<><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/></>),
  edit:       Ico(<><path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/></>),
  bolt:       Ico(<><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></>),
  cards:      Ico(<><rect x="4" y="6" width="14" height="14" rx="2" transform="rotate(-6 11 13)"/><rect x="6" y="4" width="14" height="14" rx="2"/></>),
  thumbsUp:   Ico(<><path d="M7 11v9H4v-9z"/><path d="M7 11l4-8a2 2 0 0 1 3 2v3h5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 18 18H7"/></>),
  thumbsDown: Ico(<><path d="M7 13V4H4v9z"/><path d="M7 13l4 8a2 2 0 0 0 3-2v-3h5a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 18 6H7"/></>),
  power:      Ico(<><path d="M12 4v8"/><path d="M7.5 7a7 7 0 1 0 9 0"/></>),
  logo:       Ico(<><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 8h4M7 12h7M7 16h5"/></>),
};

// ─────────────────────────────────────────────────────────────
// Logo lockup
// ─────────────────────────────────────────────────────────────
function Logo({ size = 16, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 5,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
        letterSpacing: '-0.04em',
      }}>11</div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontWeight: 600, fontSize: size, letterSpacing: '-0.015em' }}>
          Clever 11
        </span>
        {!compact && (
          <span style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 3, fontWeight: 400 }}>
            Admin
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar (desktop) — fixed 240px
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: I.chip,     path: '/admin' },
  { id: 'decks',     label: 'Decks',     icon: I.deck,     path: '/admin/decks',    count: 24 },
  { id: 'questions', label: 'Questions', icon: I.question, path: '/admin/questions', count: 487 },
  { id: 'quality',   label: 'Quality',   icon: I.quality,  path: '/admin/question-quality' },
  { id: 'import',    label: 'Import',    icon: I.import,   path: '/admin/questions/import' },
  { id: 'users',     label: 'Users',     icon: I.users,    path: '/admin/users',     count: 6 },
];

function Sidebar({ active = 'dashboard', onNavigate, onSignOut, onOpenCmdK }) {
  return (
    <aside className="c11-sidebar" style={{
      width: 240, flex: '0 0 240px',
      background: 'var(--bg-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '18px 0',
      height: '100%',
    }}>
      <div style={{ padding: '0 18px 16px', borderBottom: '1px solid var(--border)' }}>
        <Logo size={14} />
      </div>

      <button onClick={onOpenCmdK} className="c11-cmdk-trigger" style={{
        margin: '14px 14px 6px',
        display: 'flex', alignItems: 'center', gap: 10,
        height: 34, padding: '0 10px 0 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2)',
        color: 'var(--fg-mute)',
        fontSize: 13,
      }}>
        <I.search size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
        <span style={{ display: 'flex', gap: 3 }}>
          <span className="kbd">⌘</span><span className="kbd">K</span>
        </span>
      </button>

      <nav style={{ padding: '12px 8px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map((it) => {
          const isActive = it.id === active;
          return (
            <button key={it.id} onClick={() => onNavigate?.(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              height: 34, padding: '0 10px',
              borderRadius: 'var(--r-2)',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              color: isActive ? 'var(--fg)' : 'var(--fg-mute)',
              fontSize: 13,
              position: 'relative',
              transition: 'background 80ms ease, color 80ms ease',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              {isActive && (
                <span style={{
                  position: 'absolute', left: -8, top: 8, bottom: 8, width: 2,
                  background: 'var(--accent)', borderRadius: 2,
                }} />
              )}
              <it.icon size={15} sw={1.6} />
              <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
              {it.count != null && (
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* User row — simple, single admin */}
      <div style={{
        padding: '12px 14px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--fg)' }}>Jonas</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>jonas@clever11.app</div>
        </div>
        <button title="Sign out" onClick={onSignOut} style={{
          height: 28, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--fg-mute)', borderRadius: 'var(--r-1)', fontSize: 12,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--fg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-mute)'; }}>
          <I.power size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// TopBar — breadcrumb + actions
// ─────────────────────────────────────────────────────────────
function TopBar({ path = '/admin', title = 'Dashboard', actions, onMenu }) {
  const segs = path.split('/').filter(Boolean);
  return (
    <header style={{
      height: 56, flex: '0 0 56px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 22px', gap: 16,
      background: 'rgba(15,15,18,0.6)',
      backdropFilter: 'blur(8px)',
    }}>
      {onMenu && (
        <button onClick={onMenu} className="btn btn--icon btn--ghost" style={{ height: 32, width: 32 }}>
          <I.menu size={16} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-faint)' }}>
        {segs.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: 'var(--border-strong)' }}>/</span>}
            <span style={{ color: i === segs.length - 1 ? 'var(--fg)' : 'var(--fg-faint)' }}>{s}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      {actions}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// EntryCard — the dashboard's three big tiles
// ─────────────────────────────────────────────────────────────
function EntryCard({ icon: Icon, label, count, hint, kpi, onClick, accent }) {
  const a = {
    lime:  { soft: 'var(--accent-soft)',   border: 'var(--border-accent)',   fg: 'var(--accent)' },
    coral: { soft: 'var(--accent-2-soft)', border: 'var(--border-accent-2)', fg: 'var(--accent-2)' },
  }[accent] || null;
  return (
    <button onClick={onClick} className="card card--hover" style={{
      padding: '20px 22px 20px',
      display: 'flex', flexDirection: 'column',
      gap: 16, minHeight: 168, textAlign: 'left',
      cursor: 'pointer', position: 'relative', overflow: 'hidden',
    }}>
      {/* subtle corner tint */}
      {a && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 160, height: 160,
          background: `radial-gradient(circle at 100% 0%, ${a.soft}, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-2)',
          background: a ? a.soft : 'var(--surface-2)',
          border: `1px solid ${a ? a.border : 'var(--border)'}`,
          color: a ? a.fg : 'var(--fg)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon size={18} />
        </div>
        <I.arrow size={16} style={{ color: 'var(--fg-faint)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, position: 'relative' }}>
        <div className="mono" style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--fg)', lineHeight: 1 }}>
          {count}
        </div>
        {kpi && (
          <span style={{ fontSize: 12, color: 'var(--ok)' }}>
            {kpi}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-mute)' }}>{hint}</div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity feed
// ─────────────────────────────────────────────────────────────
const ACTIVITY = [
  { t: '2 min',   verb: 'Edited',     target: 'Q #214 · "Vilken stad är huvudstad i Australien?"', deck: 'Allmänbildning', kind: 'edit' },
  { t: '14 min',  verb: 'Imported',   target: '8 questions from photos',                            deck: 'Filmcitat',       kind: 'import' },
  { t: '47 min',  verb: 'Archived',   target: 'Q #88 · "Hur många minuter pågår …"',                deck: 'Sport',           kind: 'archive' },
  { t: '2 hr',    verb: 'Created',    target: 'Deck "90-talet"',                                                              kind: 'plus' },
  { t: 'Yesterday', verb: 'Edited',  target: 'Q #102 · "I vilket år föll Berlinmuren?"',           deck: 'Historia',        kind: 'edit' },
];

function ActivityFeed() {
  const iconFor = (k) => ({
    edit: I.edit, import: I.import, archive: I.archive, plus: I.plus,
  })[k] || I.edit;
  const tintFor = (k) => ({
    edit:    { bg: 'var(--surface-2)', fg: 'var(--fg-mute)' },
    import:  { bg: 'var(--accent-2-soft)', fg: 'var(--accent-2)' },
    archive: { bg: 'var(--surface-2)', fg: 'var(--fg-mute)' },
    plus:    { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  })[k] || { bg: 'var(--surface-2)', fg: 'var(--fg-mute)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ACTIVITY.map((a, i) => {
        const Ic = iconFor(a.kind);
        const tint = tintFor(a.kind);
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '34px 1fr auto',
            alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            fontSize: 13,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--r-1)',
              background: tint.bg, border: '1px solid var(--border)',
              color: tint.fg,
              display: 'grid', placeItems: 'center',
            }}>
              <Ic size={13} />
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--fg-mute)' }}>{a.verb}</span>{' '}
                <span style={{ color: 'var(--fg)' }}>{a.target}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--fg-faint)' }}>
                <span>{a.t} ago</span>
                {a.deck && <><span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border-strong)' }} /><span>{a.deck}</span></>}
              </div>
            </div>
            <I.caret size={14} style={{ color: 'var(--fg-faint)' }} />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cmd-K palette — full overlay
// ─────────────────────────────────────────────────────────────
const CMDK_ROUTES = [
  { kind: 'route', label: 'Dashboard',         path: '/admin',                    id: 'dashboard', icon: I.chip },
  { kind: 'route', label: 'Decks',             path: '/admin/decks',              id: 'decks',     icon: I.deck },
  { kind: 'route', label: 'Questions',         path: '/admin/questions',          id: 'questions', icon: I.question },
  { kind: 'route', label: 'Question quality',  path: '/admin/question-quality',   id: 'quality',   icon: I.quality },
  { kind: 'route', label: 'Import',            path: '/admin/questions/import',   id: 'import',    icon: I.import },
  { kind: 'route', label: 'Users',             path: '/admin/users',              id: 'users',     icon: I.users },
];
const CMDK_ACTIONS = [
  { kind: 'action', label: 'New deck',     hint: 'create',  icon: I.plus },
  { kind: 'action', label: 'New question', hint: 'create',  icon: I.plus },
  { kind: 'action', label: 'Import cards', hint: 'create',  icon: I.import },
];
const CMDK_QUESTIONS = [
  { kind: 'question', n: 214, text: 'Vilken stad är huvudstad i Australien?',     deck: 'Allmänbildning' },
  { kind: 'question', n: 101, text: 'I vilket år föll Berlinmuren?',              deck: 'Historia' },
  { kind: 'question', n: 67,  text: 'Vem regisserade Pulp Fiction?',              deck: 'Filmcitat' },
  { kind: 'question', n: 188, text: 'Hur många minuter pågår en fotbollsmatch?',  deck: 'Sport' },
  { kind: 'question', n: 33,  text: 'Vilken färg får man av rött + blått?',       deck: 'Färger' },
];

function CmdK({ open, onClose, onNavigate }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const all = [...CMDK_ROUTES, ...CMDK_ACTIONS, ...CMDK_QUESTIONS];
    if (!query) return all;
    return all.filter((it) => {
      if (it.kind === 'question') return it.text.toLowerCase().includes(query) || String(it.n).includes(query) || it.deck.toLowerCase().includes(query);
      return it.label.toLowerCase().includes(query);
    });
  }, [q]);

  const grouped = useMemo(() => {
    const groups = { route: [], action: [], question: [] };
    results.forEach((it) => groups[it.kind].push(it));
    return groups;
  }, [results]);

  const flat = useMemo(() => [...grouped.route, ...grouped.action, ...grouped.question], [grouped]);

  useEffect(() => { if (active >= flat.length) setActive(0); }, [flat.length, active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === 'Enter')     { e.preventDefault(); pick(flat[active]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, active]);

  const pick = (it) => {
    if (!it) return;
    if (it.kind === 'route') onNavigate?.(it.id);
    onClose?.();
  };

  if (!open) return null;

  const renderGroup = (title, items, startIdx) =>
    items.length === 0 ? null : (
      <div>
        <div className="eyebrow" style={{ padding: '12px 14px 6px' }}>{title}</div>
        {items.map((it, i) => {
          const idx = startIdx + i;
          const isActive = idx === active;
          const Ic = it.icon || I.question;
          return (
            <button key={`${it.kind}-${it.label || it.n}`} onClick={() => pick(it)}
              onMouseEnter={() => setActive(idx)} style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                color: 'var(--fg)',
                fontSize: 13.5,
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: 'var(--r-1)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: isActive ? 'var(--accent)' : 'var(--fg-mute)',
                display: 'grid', placeItems: 'center', flex: '0 0 24px',
              }}>
                {it.kind === 'question'
                  ? <span className="mono" style={{ fontSize: 10 }}>#{it.n}</span>
                  : <Ic size={13} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.kind === 'question' ? it.text : it.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-faint)' }}>
                {it.kind === 'route' && <span className="mono" style={{ fontSize: 11 }}>{it.path}</span>}
                {it.kind === 'question' && <span className="pill" style={{ height: 20, fontSize: 10.5 }}>{it.deck}</span>}
                {it.kind === 'action' && <span className="mono" style={{ fontSize: 11 }}>{it.hint}</span>}
                {isActive && <span style={{ display: 'flex', gap: 3 }}><span className="kbd">↵</span></span>}
              </div>
            </button>
          );
        })}
      </div>
    );

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(8,8,12,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center',
      paddingTop: '12vh',
      zIndex: 50,
      animation: 'c11-fade-in 120ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(620px, calc(100% - 64px))',
        height: 'fit-content',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-3)',
        boxShadow: 'var(--shadow-pop)',
        animation: 'c11-pop 140ms ease',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <I.search size={16} style={{ color: 'var(--fg-mute)' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to route, action, or question…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: 'var(--fg)', fontSize: 14.5 }} />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', paddingBottom: 6 }}>
          {flat.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>
              No matches.
            </div>
          ) : (
            <>
              {renderGroup('routes', grouped.route, 0)}
              {renderGroup('actions', grouped.action, grouped.route.length)}
              {renderGroup('questions', grouped.question, grouped.route.length + grouped.action.length)}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg-faint)', fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="kbd">↵</span> select</span>
          <span style={{ flex: 1 }} />
          <span className="mono">{flat.length} results</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile drawer
// ─────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, active, onNavigate, onSignOut }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60,
      animation: 'c11-fade-in 120ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 280, background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        animation: 'c11-fade-in 160ms ease',
      }}>
        <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <Logo />
          <button onClick={onClose} style={{ color: 'var(--fg-mute)' }}>
            <I.close size={18} />
          </button>
        </div>
        <nav style={{ padding: '14px 10px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV_ITEMS.map((it) => {
            const isActive = it.id === active;
            return (
              <button key={it.id} onClick={() => { onNavigate?.(it.id); onClose?.(); }} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 42, padding: '0 12px',
                borderRadius: 'var(--r-2)',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                color: isActive ? 'var(--fg)' : 'var(--fg-mute)',
                fontSize: 14, position: 'relative',
              }}>
                {isActive && <span style={{ position: 'absolute', left: -10, top: 10, bottom: 10, width: 2, background: 'var(--accent)' }} />}
                <it.icon size={17} />
                <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                {it.count != null && <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>{it.count}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5 }}>Jonas</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>jonas@clever11.app</div>
          </div>
          <button onClick={onSignOut} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-mute)', fontSize: 12 }}><I.power size={14} />Sign out</button>
        </div>
      </div>
    </div>
  );
}

// Toast
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--r-2)',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13,
      boxShadow: 'var(--shadow-pop)',
      zIndex: 100,
      animation: 'c11-fade-in 180ms ease',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
      <span>{toast}</span>
    </div>
  );
}

Object.assign(window, {
  I, Logo, Sidebar, TopBar, EntryCard, ActivityFeed, CmdK, MobileDrawer, Toast,
  NAV_ITEMS,
});
