// Clever 11 Admin — shared UI primitives used from Pass 02 onward.
//   Select, Dropdown menu (kebab), Dialog, Toggle, TypeBadge, VoteChips, IconButton,
//   EmptyState, SkeletonRow.

const { useState: useStateU, useEffect: useEffectU, useRef: useRefU, useMemo: useMemoU } = React;

// ─────────────────────────────────────────────────────────────
// IconButton
// ─────────────────────────────────────────────────────────────
function IconButton({ icon: Ic, label, onClick, danger, size = 30 }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} style={{
      width: size, height: size,
      display: 'grid', placeItems: 'center',
      borderRadius: 'var(--r-1)',
      color: danger ? 'var(--danger)' : 'var(--fg-mute)',
      transition: 'background 80ms ease, color 80ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'var(--danger-soft)' : 'var(--surface-hover)'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--fg)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--fg-mute)'; }}>
      <Ic size={14} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Select — custom dropdown for filter values
// ─────────────────────────────────────────────────────────────
function Select({ label, value, options, onChange, width = 'auto', icon: Ic, allowClear = false }) {
  const [open, setOpen] = useStateU(false);
  const ref = useRefU(null);
  useEffectU(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = options.find((o) => o.value === value);
  const isAll = value === null || value === undefined || value === '';

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 36, padding: '0 10px 0 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2)',
        color: 'var(--fg)',
        fontSize: 13, minWidth: 140,
        width: '100%',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
        {Ic && <Ic size={13} style={{ color: 'var(--fg-mute)' }} />}
        <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', color: isAll ? 'var(--fg-mute)' : 'var(--fg)' }}>
          {current ? current.label : 'All'}
        </span>
        {!isAll && allowClear && (
          <span onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{
            display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 3,
            color: 'var(--fg-faint)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-faint)'; }}>
            <I.close size={11} />
          </span>
        )}
        <I.caret size={12} style={{ color: 'var(--fg-faint)', transform: open ? 'rotate(90deg)' : 'rotate(90deg) scaleX(1)', opacity: 0.8 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: '100%', maxHeight: 280, overflow: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-2)',
          boxShadow: 'var(--shadow-pop)',
          zIndex: 30,
          padding: 4,
          animation: 'c11-pop 100ms ease',
        }}>
          {allowClear && (
            <button onClick={() => { onChange(null); setOpen(false); }} style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 'var(--r-1)',
              color: isAll ? 'var(--fg)' : 'var(--fg-mute)',
              fontSize: 13,
              background: isAll ? 'var(--surface-2)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!isAll) e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { if (!isAll) e.currentTarget.style.background = 'transparent'; }}>
              All
            </button>
          )}
          {options.map((o) => (
            <button key={String(o.value)} onClick={() => { onChange(o.value); setOpen(false); }} style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 'var(--r-1)',
              color: 'var(--fg)',
              fontSize: 13,
              background: o.value === value ? 'var(--surface-2)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}>
              {o.swatch && <span style={{ width: 8, height: 8, borderRadius: 2, background: o.swatch }} />}
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.hint && <span style={{ color: 'var(--fg-faint)', fontSize: 11.5 }}>{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toggle — switch
// ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, hint }) {
  return (
    <button onClick={() => onChange?.(!checked)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      height: 36, padding: '0 12px 0 14px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-2)',
      color: 'var(--fg)', fontSize: 13,
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
      <span>{label}</span>
      {hint && <span style={{ color: 'var(--fg-faint)', fontSize: 11.5 }}>{hint}</span>}
      <span style={{
        position: 'relative', width: 28, height: 16, borderRadius: 100,
        background: checked ? 'var(--accent)' : 'var(--border-strong)',
        transition: 'background 120ms ease',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 14 : 2,
          width: 12, height: 12, borderRadius: '50%',
          background: checked ? 'var(--accent-fg)' : 'var(--fg)',
          transition: 'left 140ms ease',
        }} />
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Dropdown (kebab) menu
// ─────────────────────────────────────────────────────────────
function DropdownMenu({ items, onPick, align = 'right', trigger }) {
  const [open, setOpen] = useStateU(false);
  const ref = useRefU(null);
  useEffectU(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        {trigger}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)',
          [align]: 0,
          minWidth: 180,
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-2)',
          boxShadow: 'var(--shadow-pop)',
          zIndex: 30,
          padding: 4,
          animation: 'c11-pop 100ms ease',
        }}>
          {items.map((it, i) => (
            it.separator ? (
              <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            ) : (
              <button key={i} onClick={() => { setOpen(false); onPick?.(it); it.onClick?.(); }} style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 'var(--r-1)',
                color: it.danger ? 'var(--danger)' : 'var(--fg)',
                fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? 'var(--danger-soft)' : 'var(--surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                {it.icon && <it.icon size={14} />}
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.kbd && <span style={{ display: 'flex', gap: 3 }}>{it.kbd.map((k, j) => <span key={j} className="kbd">{k}</span>)}</span>}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dialog
// ─────────────────────────────────────────────────────────────
function Dialog({ open, onClose, title, description, danger, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel', children }) {
  useEffectU(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(8,8,12,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 80,
      animation: 'c11-fade-in 120ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(440px, calc(100% - 32px))',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-3)',
        boxShadow: 'var(--shadow-pop)',
        animation: 'c11-pop 140ms ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '22px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--r-2)',
              background: danger ? 'var(--danger-soft)' : 'var(--accent-2-soft)',
              border: `1px solid ${danger ? 'rgba(255,101,119,0.25)' : 'var(--border-accent-2)'}`,
              color: danger ? 'var(--danger)' : 'var(--accent-2)',
              display: 'grid', placeItems: 'center',
            }}>
              <I.archive size={16} />
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          {description && (
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--fg-mute)', lineHeight: 1.55 }}>
              {description}
            </p>
          )}
        </div>
        {children && <div style={{ padding: '12px 24px' }}>{children}</div>}
        <div style={{ display: 'flex', gap: 8, padding: '18px 24px 20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn--ghost">{cancelLabel}</button>
          <button onClick={() => { onConfirm?.(); }} className={`btn ${danger ? '' : 'btn--primary'}`} style={danger ? {
            background: 'var(--danger)', color: '#220a0c', border: 0, fontWeight: 600,
          } : {}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TypeBadge
// ─────────────────────────────────────────────────────────────
const TYPE_META = {
  standard:      { label: 'Standard',         short: 'STD',   tint: 'neutral' },
  boolean:       { label: 'True / False',     short: 'Y/N',   tint: 'info' },
  rank:          { label: 'Rank 1–10',        short: 'RANK',  tint: 'lime' },
  chooseBetween: { label: 'Choose between',   short: 'PICK',  tint: 'coral' },
  colors:        { label: 'Colors',           short: 'COL',   tint: 'rainbow' },
  numbers:       { label: 'Number',           short: 'NUM',   tint: 'mono' },
  centuryDecade: { label: 'Century / decade', short: 'ERA',   tint: 'warn' },
};

function TypeBadge({ type, size = 'sm', full = false }) {
  const m = TYPE_META[type] || TYPE_META.standard;
  const tints = {
    neutral: { bg: 'var(--surface-2)',     border: 'var(--border)',           fg: 'var(--fg-mute)' },
    info:    { bg: 'var(--info-soft)',     border: 'rgba(95,179,255,0.25)',   fg: 'var(--info)' },
    lime:    { bg: 'var(--accent-soft)',   border: 'var(--border-accent)',    fg: 'var(--accent)' },
    coral:   { bg: 'var(--accent-2-soft)', border: 'var(--border-accent-2)',  fg: 'var(--accent-2)' },
    warn:    { bg: 'var(--warn-soft)',     border: 'rgba(255,181,71,0.28)',   fg: 'var(--warn)' },
    mono:    { bg: 'transparent',          border: 'var(--border-strong)',    fg: 'var(--fg-mute)' },
  }[m.tint] || tints?.neutral;
  // Rainbow swatch for colors type
  if (m.tint === 'rainbow') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 22, padding: '0 8px 0 4px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 100,
        fontSize: 10.5, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em', color: 'var(--fg-mute)',
      }}>
        <span style={{ display: 'inline-flex', gap: 1 }}>
          {['#ff5d5d', '#ffc14d', '#7df0a0', '#5fb3ff'].map((c) => (
            <span key={c} style={{ width: 4, height: 12, background: c, borderRadius: 1 }} />
          ))}
        </span>
        {full ? m.label : m.short}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 22, padding: '0 8px',
      background: tints.bg, border: `1px solid ${tints.border}`,
      borderRadius: 100,
      fontSize: 10.5, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.06em', color: tints.fg,
    }}>
      {full ? m.label : m.short}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// VoteChips — 👍/👎 with net signal
// ─────────────────────────────────────────────────────────────
function VoteChips({ up, down, compact = false }) {
  const net = up - down;
  const total = up + down;
  const ratio = total > 0 ? up / total : 0;
  // Color shifts from coral (low) → neutral (mid) → lime (high)
  let signal = 'var(--fg-faint)';
  if (total >= 5) {
    if (ratio >= 0.8)      signal = 'var(--ok)';
    else if (ratio >= 0.6) signal = 'var(--fg-mute)';
    else if (ratio >= 0.4) signal = 'var(--warn)';
    else                   signal = 'var(--danger)';
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 6 : 10, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: up > 0 ? 'var(--fg)' : 'var(--fg-faint)' }}>
        <I.thumbsUp size={12} style={{ color: 'var(--fg-faint)' }} /> {up}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: down > 0 ? 'var(--fg)' : 'var(--fg-faint)' }}>
        <I.thumbsDown size={12} style={{ color: 'var(--fg-faint)' }} /> {down}
      </span>
      {total > 0 && !compact && (
        <span style={{ color: signal, fontSize: 11 }}>
          {net > 0 ? '+' : ''}{net}
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────
function EmptyState({ icon: Ic, title, body, action }) {
  return (
    <div style={{
      padding: '60px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--r-2)',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'grid', placeItems: 'center', color: 'var(--fg-faint)',
      }}>
        <Ic size={20} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: 'var(--fg-mute)', maxWidth: 360, lineHeight: 1.55 }}>{body}</div>}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SortHeader — clickable column header with chevron
// ─────────────────────────────────────────────────────────────
function SortHeader({ label, sortKey, current, dir, onSort, align = 'left', style }) {
  const isActive = current === sortKey;
  return (
    <button onClick={() => onSort?.(sortKey)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '0 4px', height: 26,
      color: isActive ? 'var(--fg)' : 'var(--fg-mute)',
      fontSize: 11.5, fontWeight: 500,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      borderRadius: 'var(--r-1)',
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
      ...style,
    }}
    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--fg)'; }}
    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--fg-mute)'; }}>
      <span>{label}</span>
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 4l3-3 3 3" stroke={isActive && dir === 'asc' ? 'var(--accent)' : 'var(--fg-faint)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 1l3 3 3-3" stroke={isActive && dir === 'desc' ? 'var(--accent)' : 'var(--fg-faint)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
}

Object.assign(window, {
  IconButton, Select, Toggle, DropdownMenu, Dialog,
  TypeBadge, TYPE_META, VoteChips, EmptyState, SortHeader,
});
