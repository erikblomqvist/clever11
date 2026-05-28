// Clever 11 Admin — Editor field components.
//   Per-type "correct answer" fields, image upload placeholder, URL group,
//   soft-hyphen helper, and the shortcut overlay.

const { useState: useStateE, useEffect: useEffectE, useMemo: useMemoE, useRef: useRefE } = React;

// ─────────────────────────────────────────────────────────────
// LabelledField — small wrapper for form rows
// ─────────────────────────────────────────────────────────────
function LabelledField({ label, hint, children, optional }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <label style={{ fontSize: 12.5, color: 'var(--fg-mute)', fontWeight: 500 }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>optional</span>}
        <span style={{ flex: 1 }} />
        {hint && <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PlainInput — used inside the editor
// ─────────────────────────────────────────────────────────────
function PlainInput({ value, onChange, placeholder, prefix, type = 'text', autoFocus }) {
  return (
    <div className="input">
      {prefix && <span className="affix">{prefix}</span>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ImageSlot — placeholder/empty + thumbnail w/ replace/clear
// ─────────────────────────────────────────────────────────────
function ImageSlot({ image, onUpload, onClear, size = 'md' }) {
  const isLg = size === 'lg';
  const dim = isLg ? 120 : 72;
  if (image) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: dim, height: dim, borderRadius: 'var(--r-2)',
          background: image, // CSS color or url() string
          backgroundSize: 'cover', backgroundPosition: 'center',
          border: '1px solid var(--border)',
          flex: `0 0 ${dim}px`,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={onUpload} className="btn btn--sm btn--ghost" style={{ height: 30 }}>Replace</button>
          <button onClick={onClear} className="btn btn--sm btn--ghost" style={{ height: 30, color: 'var(--danger)' }}>Clear</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={onUpload} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      width: '100%', height: isLg ? 120 : 64,
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-2)',
      color: 'var(--fg-mute)', fontSize: 13,
      background: 'transparent',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--fg-faint)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}>
      <I.import size={15} /> Drop an image or click to upload
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Correct-answer fields — vary by question type
// ─────────────────────────────────────────────────────────────
function CorrectAnswerField({ type, value, onChange, allOptions, optionIdx }) {
  if (type === 'boolean') {
    return <BoolField value={value} onChange={onChange} />;
  }
  if (type === 'rank') {
    return <RankField value={value} onChange={onChange} allOptions={allOptions} optionIdx={optionIdx} />;
  }
  if (type === 'colors') {
    return <ColorsField value={value} onChange={onChange} />;
  }
  if (type === 'numbers') {
    return <PlainInput type="number" value={value ?? ''} onChange={(v) => onChange(v === '' ? null : Number(v))} placeholder="Number for this option" />;
  }
  const placeholder = ({
    standard:      'e.g. Sverige',
    chooseBetween: 'e.g. Star Wars',
    centuryDecade: 'e.g. 1980-talet',
  })[type] || 'Correct answer';
  return <PlainInput value={value ?? ''} onChange={onChange} placeholder={placeholder} />;
}

function BoolField({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { v: true,  label: 'Yes', accent: 'var(--ok)' },
        { v: false, label: 'No',  accent: 'var(--danger)' },
      ].map((o) => {
        const active = value === o.v;
        return (
          <button key={String(o.v)} onClick={() => onChange(o.v)} style={{
            flex: 1, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: active ? 'var(--surface-2)' : 'transparent',
            border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
            borderLeft: `3px solid ${active ? o.accent : 'transparent'}`,
            borderRadius: 'var(--r-2)',
            color: active ? 'var(--fg)' : 'var(--fg-mute)',
            fontSize: 13.5, fontWeight: 500,
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RankField({ value, onChange, allOptions, optionIdx }) {
  // value is the rank for THIS option (1-10)
  // Validate uniqueness across all options
  const usedRanks = (allOptions || []).map((o, i) => i !== optionIdx ? o.correct : null).filter((r) => r != null);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          const taken = usedRanks.includes(n);
          const selected = value === n;
          return (
            <button key={n} onClick={() => onChange(selected ? null : n)} style={{
              width: 34, height: 34,
              borderRadius: 'var(--r-1)',
              background: selected ? 'var(--accent)' : (taken ? 'transparent' : 'var(--surface)'),
              border: `1px solid ${selected ? 'transparent' : 'var(--border)'}`,
              color: selected ? 'var(--accent-fg)' : (taken ? 'var(--fg-faint)' : 'var(--fg)'),
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
              cursor: taken && !selected ? 'not-allowed' : 'pointer',
              opacity: taken && !selected ? 0.4 : 1,
              position: 'relative',
            }}
            disabled={taken && !selected}
            title={taken && !selected ? `Used by option ${(allOptions || []).findIndex((o, i) => i !== optionIdx && o.correct === n) + 1}` : ''}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', marginTop: 8 }}>
        All 10 options must form a complete permutation.
      </div>
    </div>
  );
}

function ColorsField({ value, onChange }) {
  // value: { h, s, l, label }
  const v = value || { h: 200, s: 60, l: 50, label: '' };
  const set = (patch) => onChange({ ...v, ...patch });
  const css = `hsl(${v.h} ${v.s}% ${v.l}%)`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--r-2)',
          background: css, border: '1px solid var(--border-strong)',
          flex: '0 0 56px',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
        }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Slider label="H" value={v.h} min={0} max={360} onChange={(x) => set({ h: x })} suffix="°" track={`linear-gradient(90deg, hsl(0 ${v.s}% ${v.l}%), hsl(60 ${v.s}% ${v.l}%), hsl(120 ${v.s}% ${v.l}%), hsl(180 ${v.s}% ${v.l}%), hsl(240 ${v.s}% ${v.l}%), hsl(300 ${v.s}% ${v.l}%), hsl(360 ${v.s}% ${v.l}%))`} />
          <Slider label="S" value={v.s} min={0} max={100} onChange={(x) => set({ s: x })} suffix="%" track={`linear-gradient(90deg, hsl(${v.h} 0% ${v.l}%), hsl(${v.h} 100% ${v.l}%))`} />
          <Slider label="L" value={v.l} min={0} max={100} onChange={(x) => set({ l: x })} suffix="%" track={`linear-gradient(90deg, hsl(${v.h} ${v.s}% 0%), hsl(${v.h} ${v.s}% 50%), hsl(${v.h} ${v.s}% 100%))`} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>Color label (shown to players)</span>
        <PlainInput value={v.label} onChange={(x) => set({ label: x })} placeholder="e.g. Sky blue" />
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange, suffix, track }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 14, fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      <div style={{ flex: 1, position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 6,
          borderRadius: 100, background: track,
          border: '1px solid var(--border)',
        }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer',
          }}
        />
        <div style={{
          position: 'absolute',
          left: `calc(${((value - min) / (max - min)) * 100}% - 7px)`,
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--fg)', boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-strong)',
          pointerEvents: 'none',
        }} />
      </div>
      <span style={{ width: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-mute)' }}>{value}{suffix}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// URLs block — only shown for standard type
// ─────────────────────────────────────────────────────────────
function UrlsBlock({ urls, onChange }) {
  const u = urls || {};
  const fields = [
    { key: 'generic', label: 'Link',    placeholder: 'https://…',                                    color: 'var(--fg-mute)' },
    { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/track/…',            color: '#1DB954' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/watch?v=…',                color: '#FF4444' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {fields.map((f) => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 34, flex: '0 0 28px',
            display: 'grid', placeItems: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-1)',
            fontFamily: 'var(--font-mono)', fontSize: 10, color: f.color,
            letterSpacing: '0.04em',
          }}>
            {f.key === 'spotify' ? 'S' : f.key === 'youtube' ? 'YT' : '↗'}
          </div>
          <div className="input" style={{ height: 34, flex: 1 }}>
            <input
              value={u[f.key] || ''}
              onChange={(e) => onChange({ ...u, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SoftHyphenHelper — tap between letters of a long word to insert U+00AD
// ─────────────────────────────────────────────────────────────
const SOFT_HYPHEN = '\u00AD';
function findLongWord(text) {
  if (!text) return null;
  const words = text.split(/\s+/);
  // Strip soft hyphens for measurement
  return words.find((w) => w.replace(/\u00AD/g, '').length >= 12) || null;
}

function SoftHyphenHelper({ word, onChange }) {
  if (!word) return null;
  // Letters separated by gaps (insertable hyphens)
  const chars = word.split('');
  const updateAt = (idx, hasHyphen) => {
    const next = [];
    chars.forEach((c, i) => {
      if (c === SOFT_HYPHEN) return; // drop existing markers
      next.push(c);
      if (i < chars.length - 1) {
        // Gap after position i
        if (i === idx) {
          if (hasHyphen) next.push(SOFT_HYPHEN);
        } else if (chars[i + 1] === SOFT_HYPHEN) {
          next.push(SOFT_HYPHEN);
        }
      }
    });
    onChange?.(next.join(''));
  };
  // Build display: letter / gap / letter / gap …
  // Existing hyphens are between letters
  const display = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (c === SOFT_HYPHEN) { i++; continue; }
    display.push({ kind: 'letter', char: c, srcIdx: i });
    const next = chars[i + 1];
    if (next && i < chars.length - 1) {
      display.push({ kind: 'gap', hasHyphen: next === SOFT_HYPHEN, srcIdx: i });
    }
    i++;
  }
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--warn-soft)',
      border: '1px solid rgba(255,181,71,0.22)',
      borderRadius: 'var(--r-2)',
      fontSize: 12.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)', marginBottom: 8 }}>
        <I.bolt size={12} />
        <span>Long word detected. Tap between letters to add a line-break hint.</span>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0, fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--fg)' }}>
        {display.map((d, idx) => d.kind === 'letter' ? (
          <span key={idx} style={{ padding: '2px 0' }}>{d.char}</span>
        ) : (
          <button
            key={idx}
            onClick={() => updateAt(d.srcIdx, !d.hasHyphen)}
            style={{
              width: 14, height: 22,
              display: 'inline-grid', placeItems: 'center',
              color: d.hasHyphen ? 'var(--accent)' : 'var(--fg-faint)',
              fontSize: 14,
            }}
            title={d.hasHyphen ? 'Remove break hint' : 'Add break hint'}>
            {d.hasHyphen ? '·' : '∘'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ShortcutOverlay — opened with ⌘/
// ─────────────────────────────────────────────────────────────
const SHORTCUTS = [
  { group: 'Edit', items: [
    { keys: ['⌘', 'S'],   label: 'Save changes' },
    { keys: ['⌘', '⌫'],  label: 'Discard changes (with confirm)' },
    { keys: ['Esc'],       label: 'Close dialogs' },
  ]},
  { group: 'Options', items: [
    { keys: ['↑'],          label: 'Previous option' },
    { keys: ['↓'],          label: 'Next option' },
    { keys: ['⌘', '1–9, 0'], label: 'Jump to option 1–10' },
    { keys: ['⌘', '⌥', '↑'], label: 'Move option up' },
    { keys: ['⌘', '⌥', '↓'], label: 'Move option down' },
    { keys: ['⌘', 'D'],     label: 'Duplicate label from above' },
    { keys: ['⌘', '.'],     label: 'Mark this option correct (boolean/colors)' },
  ]},
  { group: 'Navigation', items: [
    { keys: ['⌘', 'K'],   label: 'Open command palette' },
    { keys: ['⌘', '/'],   label: 'Show this overlay' },
  ]},
];

function ShortcutOverlay({ open, onClose }) {
  useEffectE(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(8,8,12,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 90,
      animation: 'c11-fade-in 120ms ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(520px, calc(100% - 32px))',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-3)',
        boxShadow: 'var(--shadow-pop)',
        animation: 'c11-pop 140ms ease',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Keyboard shortcuts</div>
            <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>Editor</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: 'var(--fg-mute)' }}><I.close size={16} /></button>
        </div>
        <div style={{ padding: '8px 20px 20px', maxHeight: 480, overflow: 'auto' }}>
          {SHORTCUTS.map((g) => (
            <div key={g.group} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {g.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {g.items.map((it, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '7px 0', fontSize: 13,
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}>
                    <span style={{ flex: 1, color: 'var(--fg)' }}>{it.label}</span>
                    <span style={{ display: 'inline-flex', gap: 3 }}>
                      {it.keys.map((k, j) => <span key={j} className="kbd" style={{ height: 20, minWidth: 22, padding: '0 6px', fontSize: 11.5 }}>{k}</span>)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  LabelledField, PlainInput, ImageSlot,
  CorrectAnswerField, UrlsBlock, SoftHyphenHelper, findLongWord, SOFT_HYPHEN,
  ShortcutOverlay,
});
