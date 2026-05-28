// Clever 11 Admin — Bulk import from photos.
// Per item: photo, status (queued/extracting/ready/error/saved), inline
// editable question fields, options stack, confidence pills (only when <100%),
// warnings, errors. Save-all-ready w/ batch progress strip.

const { useState: useStateI, useEffect: useEffectI, useMemo: useMemoI, useRef: useRefI } = React;

// ─────────────────────────────────────────────────────────────
// Mock import items
// ─────────────────────────────────────────────────────────────
const STATUS_META = {
  queued:     { label: 'Queued',     color: 'var(--fg-faint)' },
  extracting: { label: 'Extracting', color: 'var(--info)'     },
  ready:      { label: 'Ready',      color: 'var(--fg)'       },
  error:      { label: 'Error',      color: 'var(--danger)'   },
  saved:      { label: 'Saved',      color: 'var(--ok)'       },
};

function makeImportItem(overrides) {
  return {
    id: overrides.id,
    status: 'ready',
    photo: 'hsl(200 30% 30%)',
    confidence: { type: 100, text: 100, number: 100, options: 100, answers: 100 },
    warnings: [],
    errors: [],
    q: {
      type: 'standard', deck: null, text: '', number: null, displayMode: 'text',
      options: Array.from({ length: 10 }).map(() => ({ label: '', correct: null, urls: {}, image: null })),
    },
    ...overrides,
  };
}

const _capitalOptions = [
  { label: 'Stockholm',   correct: 'Sverige' },
  { label: 'Oslo',        correct: 'Norge' },
  { label: 'Köpenhamn',   correct: 'Danmark' },
  { label: 'Helsingfors', correct: 'Finland' },
  { label: 'Reykjavík',   correct: 'Island' },
  { label: 'Berlin',      correct: 'Tyskland' },
  { label: 'Paris',       correct: 'Frankrike' },
  { label: 'Madrid',      correct: 'Spanien' },
  { label: 'Rom',         correct: 'Italien' },
  { label: 'Lissabon',    correct: 'Portugal' },
];

const _booleanOptions = [
  { label: 'Sverige',        correct: true  },
  { label: 'Norge',          correct: false },
  { label: 'Finland',        correct: true  },
  { label: 'Schweiz',        correct: false },
  { label: 'Österrike',      correct: true  },
  { label: 'Polen',          correct: false },
  { label: 'Storbritannien', correct: true  },
  { label: 'Island',         correct: false },
  { label: 'Ungern',         correct: false },
  { label: 'Danmark',        correct: true  },
];

const _filmOptions = [
  { label: 'Pulp Fiction',       correct: 'Quentin Tarantino' },
  { label: 'Inception',          correct: 'Christopher Nolan' },
  { label: 'No Country for Old Men', correct: 'Coen Brothers' },
  { label: 'Parasite',           correct: 'Bong Joon-ho' },
  { label: 'Spirited Away',      correct: 'Hayao Miyazaki' },
  { label: 'The Godfather',      correct: 'Francis Ford Coppola' },
  { label: 'Mad Max: Fury Road', correct: 'George Miller' },
  { label: 'Pertth',             correct: 'Christopher Nolan' }, // OCR error case
  { label: 'Lost in Translation',correct: 'Sofia Coppola' },
  { label: 'Drive',              correct: 'Nicolas Winding Refn' },
];

const INITIAL_ITEMS = [
  makeImportItem({
    id: 1, status: 'saved',
    photo: 'linear-gradient(135deg, hsl(195 60% 30%), hsl(195 60% 20%))',
    q: { type: 'standard', deck: 'geografi', text: 'I vilket land ligger denna huvudstad?', options: _capitalOptions, displayMode: 'text' },
  }),
  makeImportItem({
    id: 2, status: 'saved',
    photo: 'linear-gradient(135deg, hsl(160 50% 32%), hsl(160 50% 22%))',
    q: { type: 'boolean', deck: 'geografi', text: 'Tillträdde detta land EU under 90-talet?', options: _booleanOptions, displayMode: 'text' },
  }),
  makeImportItem({
    id: 3, status: 'ready',
    photo: 'linear-gradient(135deg, hsl(20 60% 35%), hsl(20 60% 25%))',
    confidence: { type: 100, text: 100, number: 100, options: 100, answers: 100 },
    warnings: [],
    q: { type: 'standard', deck: 'geografi', text: 'I vilket land ligger denna huvudstad?', options: _capitalOptions, displayMode: 'text' },
  }),
  makeImportItem({
    id: 4, status: 'ready',
    photo: 'linear-gradient(135deg, hsl(280 50% 35%), hsl(280 50% 22%))',
    confidence: { type: 100, text: 95, number: 100, options: 78, answers: 92 },
    warnings: [
      { field: 'options.7', text: 'OCR uncertain — "Pertth" might be "Perth"?' },
      { field: 'text',      text: 'Sentence ended without a question mark.' },
    ],
    q: { type: 'standard', deck: 'filmcitat', text: 'Vem regisserade denna film?', options: _filmOptions, displayMode: 'text' },
  }),
  makeImportItem({
    id: 5, status: 'ready',
    photo: 'linear-gradient(135deg, hsl(50 60% 40%), hsl(50 60% 28%))',
    confidence: { type: 100, text: 100, number: 100, options: 100, answers: 100 },
    warnings: [],
    q: { type: 'rank', deck: '90talet', text: 'Rangordna decenniernas mest sålda spel.',
         options: ['Minecraft','GTA V','Tetris','Wii Sports','PUBG','Mario Kart 8','RDR2','SMB','Pokémon RB','Terraria'].map((label, i) => ({ label, correct: i + 1, urls: {}, image: null })),
         displayMode: 'text' },
  }),
  makeImportItem({
    id: 6, status: 'error',
    photo: 'linear-gradient(135deg, hsl(355 40% 28%), hsl(355 40% 18%))',
    errors: [{ field: 'deck', text: 'Could not determine target deck.' }, { field: 'options', text: 'Only 7 options detected, expected 10.' }],
    q: { type: 'standard', deck: null, text: 'Blurry photo — re-shoot?', options: Array.from({ length: 10 }).map(() => ({ label: '', correct: null, urls: {}, image: null })), displayMode: 'text' },
  }),
  makeImportItem({
    id: 7, status: 'extracting',
    photo: 'linear-gradient(135deg, hsl(220 40% 30%), hsl(220 40% 20%))',
    q: { type: 'standard', deck: null, text: '', options: [], displayMode: 'text' },
  }),
  makeImportItem({
    id: 8, status: 'queued',
    photo: 'linear-gradient(135deg, hsl(0 0% 22%), hsl(0 0% 14%))',
    q: { type: 'standard', deck: null, text: '', options: [], displayMode: 'text' },
  }),
];

// ─────────────────────────────────────────────────────────────
// ImportToolbar
// ─────────────────────────────────────────────────────────────
function ImportToolbar({ targetDeck, setTargetDeck, items, onAddPhotos, onSaveAllReady, savingCount, viewport }) {
  const ready    = items.filter((i) => i.status === 'ready' && i.errors.length === 0).length;
  const errored  = items.filter((i) => i.status === 'error' || i.errors.length > 0).length;
  const isMobile = viewport === 'mobile';

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      padding: isMobile ? '12px 16px' : '14px 22px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky', top: 0, zIndex: 4,
    }}>
      <Select
        label="Deck"
        value={targetDeck}
        onChange={setTargetDeck}
        options={DECKS.map((d) => ({ value: d.id, label: d.name }))}
        width={isMobile ? '100%' : 200}
      />

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={() => onAddPhotos('camera')} className="btn">
          <I.bolt size={13} />Take photo
        </button>
        <button onClick={() => onAddPhotos('library')} className="btn btn--ghost">
          <I.import size={13} />Add photos
        </button>
      </div>

      <span style={{ flex: 1 }} />

      {errored > 0 && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>
          {errored} need attention
        </span>
      )}
      <button
        onClick={onSaveAllReady}
        disabled={ready === 0 || savingCount > 0}
        className="btn btn--primary"
        style={{ opacity: ready === 0 ? 0.5 : 1 }}>
        <I.bolt size={13} />
        {savingCount > 0 ? `Saving ${savingCount}…` : `Save all ready (${ready})`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Photo preview
// ─────────────────────────────────────────────────────────────
function PhotoThumb({ photo, size = 'md', status }) {
  const dim = size === 'sm' ? { w: 44, h: 60 } : { w: 84, h: 112 };
  return (
    <div style={{
      width: dim.w, height: dim.h, borderRadius: 'var(--r-2)',
      background: photo, backgroundSize: 'cover', backgroundPosition: 'center',
      border: '1px solid var(--border-strong)',
      flex: `0 0 ${dim.w}px`,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
        color: 'rgba(255,255,255,0.5)', fontSize: size === 'sm' ? 8 : 10,
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        photo
      </div>
      {status === 'extracting' && <ProgressOverlay />}
      {status === 'saved' && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--ok)', color: '#022510',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M2 6.5l2.5 2.5L10 3.5"/></svg>
        </div>
      )}
    </div>
  );
}

function ProgressOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(15,15,18,0.55)',
      display: 'grid', placeItems: 'center',
      color: 'var(--info)',
    }}>
      <span style={{
        display: 'inline-block', width: 18, height: 18,
        border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--info)',
        borderRadius: '50%', animation: 'c11-spin 700ms linear infinite',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Confidence pills — only render those <100%
// ─────────────────────────────────────────────────────────────
function ConfidencePills({ confidence }) {
  if (!confidence) return null;
  const fields = [
    { key: 'type',    label: 'Type' },
    { key: 'text',    label: 'Question text' },
    { key: 'number',  label: 'Number' },
    { key: 'options', label: 'Options' },
    { key: 'answers', label: 'Answers' },
  ];
  const issues = fields
    .map((f) => ({ ...f, score: confidence[f.key] }))
    .filter((f) => typeof f.score === 'number' && f.score < 100);
  if (issues.length === 0) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11.5, color: 'var(--ok)',
      }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6.5l2.5 2.5L10 3.5"/></svg>
        High confidence
      </span>
    );
  }
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {issues.map((f) => {
        const tone =
          f.score < 70 ? { fg: 'var(--danger)', bg: 'var(--danger-soft)', bd: 'rgba(255,101,119,0.25)' } :
          f.score < 90 ? { fg: 'var(--warn)',   bg: 'var(--warn-soft)',   bd: 'rgba(255,181,71,0.25)' } :
                         { fg: 'var(--accent-2)', bg: 'var(--accent-2-soft)', bd: 'var(--border-accent-2)' };
        return (
          <span key={f.key} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 22, padding: '0 8px',
            borderRadius: 100,
            background: tone.bg, border: `1px solid ${tone.bd}`,
            color: tone.fg, fontSize: 11,
          }}>
            <span style={{ color: 'var(--fg-mute)' }}>{f.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{f.score}%</span>
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MiniOptionRow — compact inline editable option
// ─────────────────────────────────────────────────────────────
function MiniOptionRow({ idx, option, type, hasWarning, onChange, allOptions, viewport }) {
  const isMobile = viewport === 'mobile';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '24px 1fr' : '24px minmax(0, 1fr) minmax(0, 1fr)',
      gap: 8, alignItems: 'center',
      padding: '6px 4px',
      borderBottom: '1px solid var(--border)',
      position: 'relative',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: hasWarning ? 'var(--warn)' : 'var(--fg-faint)',
        textAlign: 'right', paddingRight: 2,
      }}>
        {hasWarning ? '⚠' : ''}{idx + 1}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <input
          value={option.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Option label"
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 0, outline: 'none',
            color: 'var(--fg)', fontSize: 12.5,
            padding: '4px 8px',
            borderRadius: 'var(--r-1)',
          }}
          onFocus={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
          onBlur={(e) => e.currentTarget.style.background = 'transparent'}
        />
      </div>
      {!isMobile && (
        <MiniCorrectField type={type} value={option.correct} onChange={(v) => onChange({ correct: v })} allOptions={allOptions} optionIdx={idx} />
      )}
      {isMobile && (
        <div style={{ gridColumn: '2', marginTop: -4 }}>
          <MiniCorrectField type={type} value={option.correct} onChange={(v) => onChange({ correct: v })} allOptions={allOptions} optionIdx={idx} />
        </div>
      )}
    </div>
  );
}

function MiniCorrectField({ type, value, onChange, allOptions, optionIdx }) {
  if (type === 'boolean') {
    return (
      <div style={{ display: 'inline-flex', gap: 4 }}>
        {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((o) => {
          const active = value === o.v;
          return (
            <button key={String(o.v)} onClick={() => onChange(o.v)} style={{
              height: 24, padding: '0 10px',
              borderRadius: 'var(--r-1)',
              background: active ? (o.v ? 'var(--ok-soft)' : 'var(--danger-soft)') : 'var(--surface)',
              border: `1px solid ${active ? (o.v ? 'rgba(125,240,160,0.3)' : 'rgba(255,101,119,0.3)') : 'var(--border)'}`,
              color: active ? (o.v ? 'var(--ok)' : 'var(--danger)') : 'var(--fg-mute)',
              fontSize: 11.5, fontWeight: 500,
            }}>{o.l}</button>
          );
        })}
      </div>
    );
  }
  if (type === 'rank') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}
        style={{
          height: 26, padding: '0 8px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-1)', color: 'var(--fg)',
          fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
        {Array.from({ length: 10 }).map((_, i) => <option key={i} value={i + 1}>#{i + 1}</option>)}
      </select>
    );
  }
  if (type === 'colors') {
    const v = value || { h: 200, s: 50, l: 50, label: '' };
    const css = `hsl(${v.h} ${v.s}% ${v.l}%)`;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: css, border: '1px solid var(--border)' }} />
        <input value={v.label || ''} onChange={(e) => onChange({ ...v, label: e.target.value })} placeholder="Color label" style={{
          flex: 1, minWidth: 0,
          background: 'transparent', border: 0, outline: 'none',
          color: 'var(--fg-mute)', fontSize: 12,
          fontFamily: 'var(--font-mono)',
        }} />
      </div>
    );
  }
  if (type === 'numbers') {
    return (
      <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="0"
        style={{
          width: '100%', minWidth: 0,
          background: 'transparent', border: 0, outline: 'none',
          color: 'var(--fg)', fontSize: 12.5,
          padding: '4px 8px', fontFamily: 'var(--font-mono)',
          borderRadius: 'var(--r-1)',
        }}
        onFocus={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
        onBlur={(e) => e.currentTarget.style.background = 'transparent'}
      />
    );
  }
  // text-based
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>→</span>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        placeholder="Correct answer"
        style={{
          flex: 1, minWidth: 0,
          background: 'transparent', border: 0, outline: 'none',
          color: 'var(--fg)', fontSize: 12.5,
          padding: '4px 8px',
          borderRadius: 'var(--r-1)',
        }}
        onFocus={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
        onBlur={(e) => e.currentTarget.style.background = 'transparent'}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ImportItem — the card
// ─────────────────────────────────────────────────────────────
function ImportItem({ item, expanded, onToggle, onUpdate, onSave, onDiscard, onRetry, onOpenFull, viewport }) {
  const s = item.status;
  const isMobile = viewport === 'mobile';
  const isSaved = s === 'saved';
  const isActive = s === 'ready';
  const accent =
    s === 'saved'      ? 'var(--ok-soft)'         :
    s === 'error'      ? 'var(--danger-soft)'     :
    s === 'extracting' ? 'var(--info-soft)'       :
                         'transparent';
  const accentBorder =
    s === 'saved'      ? 'rgba(125,240,160,0.18)' :
    s === 'error'      ? 'rgba(255,101,119,0.25)' :
    s === 'extracting' ? 'rgba(95,179,255,0.20)'  :
                         'var(--border)';

  // Warning lookup for inline rows
  const optionWarnings = useMemoI(() => {
    const m = {};
    (item.warnings || []).forEach((w) => {
      const match = w.field?.match(/^options\.(\d+)$/);
      if (match) m[Number(match[1]) - 1] = w.text;
    });
    return m;
  }, [item.warnings]);

  return (
    <div className="card" style={{
      borderColor: accentBorder,
      overflow: 'hidden',
      transition: 'border-color 160ms ease',
    }}>
      {/* Header — always visible */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: isMobile ? 12 : 14,
        background: accent,
        cursor: (isActive || isSaved) ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={() => { if (isActive || isSaved) onToggle(item.id); }}>
        <PhotoThumb photo={item.photo} size={isMobile ? 'sm' : 'md'} status={s} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusPill status={s} />
            {item.q.type && <TypeBadge type={item.q.type} />}
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
              #card-{String(item.id).padStart(2, '0')}
            </span>
            <span style={{ flex: 1 }} />
            {s === 'ready' && !isMobile && (
              <span style={{ fontSize: 11, color: 'var(--fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {expanded ? 'Collapse' : 'Expand'}
                <I.caret size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease', color: 'var(--fg-mute)' }} />
              </span>
            )}
          </div>

          <div style={{
            fontSize: isMobile ? 13.5 : 14.5,
            fontWeight: 500,
            color: item.q.text ? 'var(--fg)' : 'var(--fg-faint)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: isMobile ? 240 : 600,
          }}>
            {item.q.text || (s === 'extracting' ? 'Extracting question…' : s === 'queued' ? 'Queued for extraction' : s === 'error' ? 'Extraction failed' : 'Untitled')}
          </div>

          {!isSaved && item.q.deck && (
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>{DECK_BY_ID[item.q.deck] || 'No deck'}</span>
              {item.confidence && s === 'ready' && (
                <>
                  <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border-strong)' }} />
                  <ConfidencePills confidence={item.confidence} />
                </>
              )}
            </div>
          )}
          {!isSaved && !item.q.deck && s !== 'extracting' && s !== 'queued' && (
            <div style={{ fontSize: 12, color: 'var(--danger)' }}>No deck assigned.</div>
          )}
        </div>

        {/* Right rail actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {s === 'saved' && (
            <button onClick={() => onOpenFull?.(item)} className="btn btn--ghost btn--sm" style={{ height: 28 }}>Open</button>
          )}
          {s === 'error' && (
            <>
              <button onClick={() => onRetry?.(item)} className="btn btn--ghost btn--sm" style={{ height: 28 }}>Retry</button>
              <button onClick={() => onDiscard?.(item)} className="btn btn--ghost btn--sm" style={{ height: 28, color: 'var(--danger)' }}>Discard</button>
            </>
          )}
        </div>
      </div>

      {/* Body — expanded only for ready */}
      {isActive && expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Errors banner */}
          {item.errors.length > 0 && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-soft)',
              borderBottom: '1px solid rgba(255,101,119,0.18)',
              color: 'var(--danger)',
              fontSize: 12.5,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {item.errors.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--danger)', display: 'grid', placeItems: 'center', color: '#220a0c', fontSize: 9, fontWeight: 700 }}>!</span>
                    <span>{e.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {item.warnings.length > 0 && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--warn-soft)',
              borderBottom: '1px solid rgba(255,181,71,0.18)',
              fontSize: 12.5, color: 'var(--warn)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {item.warnings.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 12, height: 12, lineHeight: '12px', textAlign: 'center', flex: '0 0 12px', fontSize: 10 }}>⚠</span>
                    <span><span style={{ color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', fontSize: 11.5, marginRight: 8 }}>{w.field}</span>{w.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question fields (compact) */}
          <div style={{ padding: isMobile ? '12px 12px 6px' : '14px 16px 8px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 180px 180px',
              gap: 8, marginBottom: 8,
            }}>
              <div className="input" style={{ height: 36 }}>
                <input
                  value={item.q.text}
                  onChange={(e) => onUpdate(item.id, { q: { ...item.q, text: e.target.value } })}
                  placeholder="Question text"
                  style={{ fontSize: 13 }}
                />
              </div>
              <Select
                label="Deck"
                value={item.q.deck}
                onChange={(v) => onUpdate(item.id, { q: { ...item.q, deck: v } })}
                options={DECKS.map((d) => ({ value: d.id, label: d.name }))}
                width="100%"
              />
              <Select
                label="Type"
                value={item.q.type}
                onChange={(v) => onUpdate(item.id, { q: { ...item.q, type: v } })}
                options={Object.entries(TYPE_META).map(([k, m]) => ({ value: k, label: m.label, hint: m.short }))}
                width="100%"
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ padding: isMobile ? '0 12px 8px' : '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Options
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>10 / 10</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => onOpenFull?.(item)} style={{
                fontSize: 11.5, color: 'var(--accent-2)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                Open in full editor <I.caret size={10} />
              </button>
            </div>
            {item.q.options.map((opt, i) => (
              <MiniOptionRow
                key={i}
                idx={i}
                option={opt}
                type={item.q.type}
                hasWarning={!!optionWarnings[i]}
                onChange={(patch) => onUpdate(item.id, {
                  q: { ...item.q, options: item.q.options.map((o, j) => j === i ? { ...o, ...patch } : o) },
                })}
                allOptions={item.q.options}
                viewport={viewport}
              />
            ))}
          </div>

          {/* Footer actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '12px' : '14px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-2)',
          }}>
            <span style={{ flex: 1, fontSize: 11.5, color: 'var(--fg-faint)' }}>
              {item.errors.length > 0 ? 'Fix errors above to enable Save' : 'Ready to save'}
            </span>
            <button onClick={() => onDiscard?.(item)} className="btn btn--ghost btn--sm" style={{ height: 32, color: 'var(--danger)' }}>
              Discard
            </button>
            <button
              onClick={() => onSave?.(item)}
              disabled={item.errors.length > 0}
              className="btn btn--primary btn--sm"
              style={{ height: 32 }}>
              <I.bolt size={11} />Save question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const m = STATUS_META[status];
  if (!m) return null;
  const bg =
    status === 'ready'      ? 'transparent' :
    status === 'saved'      ? 'var(--ok-soft)' :
    status === 'error'      ? 'var(--danger-soft)' :
    status === 'extracting' ? 'var(--info-soft)' :
                              'var(--surface-2)';
  const bd =
    status === 'ready'      ? 'var(--border)' :
    status === 'saved'      ? 'rgba(125,240,160,0.25)' :
    status === 'error'      ? 'rgba(255,101,119,0.25)' :
    status === 'extracting' ? 'rgba(95,179,255,0.25)' :
                              'var(--border)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 22, padding: '0 8px',
      borderRadius: 100,
      background: bg, border: `1px solid ${bd}`,
      color: m.color, fontSize: 11,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {status === 'extracting' && <span style={{
        width: 8, height: 8, borderRadius: '50%',
        border: '1.5px solid currentColor', borderTopColor: 'transparent',
        animation: 'c11-spin 700ms linear infinite',
      }} />}
      {status === 'saved' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)' }} />}
      {status === 'ready' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />}
      {status === 'error' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />}
      {status === 'queued' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-faint)' }} />}
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// useImportState
// ─────────────────────────────────────────────────────────────
function useImportState() {
  const [items, setItems]   = useStateI(INITIAL_ITEMS);
  const [targetDeck, setTargetDeck] = useStateI('filmcitat');
  const [expanded, setExpanded]     = useStateI(() => new Set([4])); // auto-expand first issue
  const [savingIds, setSavingIds]   = useStateI(new Set());
  const [toast, setToast]           = useStateI(null);

  const showToast = (text, undo) => {
    setToast({ text, undo });
    setTimeout(() => setToast(null), 4500);
  };

  const toggle = (id) => {
    setExpanded((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const update = (id, patch) => {
    setItems((arr) => arr.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, ...patch };
      // Re-validate
      const errors = [];
      if (!next.q.deck) errors.push({ field: 'deck', text: 'Pick a target deck.' });
      if (!next.q.text) errors.push({ field: 'text', text: 'Question text is required.' });
      next.errors = errors;
      return next;
    }));
  };

  const saveOne = (item) => {
    setSavingIds((s) => new Set([...s, item.id]));
    setTimeout(() => {
      setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, status: 'saved' } : it));
      setSavingIds((s) => { const n = new Set(s); n.delete(item.id); return n; });
      setExpanded((set) => { const n = new Set(set); n.delete(item.id); return n; });
      showToast(`Saved card #${String(item.id).padStart(2, '0')}.`);
    }, 600);
  };

  const saveAll = () => {
    const readyItems = items.filter((i) => i.status === 'ready' && i.errors.length === 0);
    if (readyItems.length === 0) return;
    setSavingIds(new Set(readyItems.map((i) => i.id)));
    let i = 0;
    const step = () => {
      if (i >= readyItems.length) {
        setSavingIds(new Set());
        showToast(`Saved ${readyItems.length} cards.`);
        return;
      }
      const item = readyItems[i];
      setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, status: 'saved' } : it));
      setExpanded((set) => { const n = new Set(set); n.delete(item.id); return n; });
      setSavingIds((s) => { const n = new Set(s); n.delete(item.id); return n; });
      i++;
      setTimeout(step, 350);
    };
    setTimeout(step, 250);
  };

  const discard = (item) => {
    setItems((arr) => arr.filter((it) => it.id !== item.id));
    showToast(`Discarded card #${String(item.id).padStart(2, '0')}.`);
  };
  const retry = (item) => {
    setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, status: 'extracting' } : it));
    setTimeout(() => {
      setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, status: 'ready', errors: [] } : it));
    }, 1200);
  };
  const addPhotos = (source) => {
    showToast(source === 'camera' ? 'Camera not wired in prototype.' : 'File picker not wired in prototype.');
  };

  return {
    items, targetDeck, setTargetDeck,
    expanded, toggle, update, saveOne, saveAll, discard, retry, addPhotos,
    savingIds, toast,
  };
}

// ─────────────────────────────────────────────────────────────
// ImportDesktop
// ─────────────────────────────────────────────────────────────
function ImportDesktop({ onNavigate, onSignOut, onOpenCmdK, onOpenEditor }) {
  const s = useImportState();
  const counts = useMemoI(() => {
    const c = { queued: 0, extracting: 0, ready: 0, error: 0, saved: 0 };
    s.items.forEach((it) => c[it.status]++);
    return c;
  }, [s.items]);

  return (
    <div className="c11" data-screen-label="Import (desktop)" style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', position: 'relative',
    }}>
      <Sidebar active="import" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar path="/admin/questions/import" title="Import" actions={null} />

        <div style={{ padding: '22px 32px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Import from photos
            </h1>
            <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--fg-mute)' }}>
              Snap one photo per physical card. We extract a draft question; you review, fix, save.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11.5, color: 'var(--fg-faint)' }}>
            <CountBlip n={counts.saved}      label="Saved"      color="var(--ok)" />
            <CountBlip n={counts.ready}      label="Ready"      color="var(--accent-2)" />
            <CountBlip n={counts.extracting} label="Extracting" color="var(--info)" />
            <CountBlip n={counts.queued}     label="Queued"     color="var(--fg-faint)" />
            <CountBlip n={counts.error}      label="Error"      color="var(--danger)" />
          </div>
        </div>

        <ImportToolbar
          targetDeck={s.targetDeck} setTargetDeck={s.setTargetDeck}
          items={s.items}
          onAddPhotos={s.addPhotos}
          onSaveAllReady={s.saveAll}
          savingCount={s.savingIds.size}
          viewport="desktop"
        />

        {/* Batch progress strip */}
        {s.savingIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 22px',
            background: 'var(--accent-soft)',
            borderBottom: '1px solid var(--border-accent)',
            color: 'var(--accent)', fontSize: 12,
          }}>
            <span style={{
              display: 'inline-block', width: 12, height: 12,
              border: '2px solid currentColor', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'c11-spin 700ms linear infinite',
            }} />
            <span>Saving {s.savingIds.size} cards…</span>
            <div style={{ flex: 1, height: 4, borderRadius: 100, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '40%', background: 'var(--accent)', animation: 'c11-bar 1.4s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 22px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.items.map((it) => (
              <ImportItem
                key={it.id}
                item={it}
                expanded={s.expanded.has(it.id)}
                onToggle={s.toggle}
                onUpdate={s.update}
                onSave={s.saveOne}
                onDiscard={s.discard}
                onRetry={s.retry}
                onOpenFull={(item) => onOpenEditor?.(item.id)}
                viewport="desktop"
              />
            ))}
          </div>
        </div>
      </main>
      <ToastWithUndo toast={s.toast} />
    </div>
  );
}

function CountBlip({ n, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span className="mono" style={{ color: 'var(--fg)' }}>{n}</span>
      <span>{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// ImportMobile
// ─────────────────────────────────────────────────────────────
function ImportMobile({ onNavigate, onSignOut, onOpenCmdK, onOpenDrawer, onOpenEditor }) {
  const s = useImportState();
  const counts = useMemoI(() => {
    const c = { queued: 0, extracting: 0, ready: 0, error: 0, saved: 0 };
    s.items.forEach((it) => c[it.status]++);
    return c;
  }, [s.items]);
  return (
    <div className="c11" data-screen-label="Import (mobile)" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
    }}>
      <header style={{
        height: 52, flex: '0 0 52px',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15,15,18,0.85)',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={onOpenDrawer} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg)',
        }}><I.menu size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Import</div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
            {counts.ready} ready · {counts.saved} saved · {counts.error} errors
          </div>
        </div>
        <button onClick={() => s.addPhotos('camera')} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          display: 'grid', placeItems: 'center',
        }}><I.bolt size={16} /></button>
      </header>

      <ImportToolbar
        targetDeck={s.targetDeck} setTargetDeck={s.setTargetDeck}
        items={s.items}
        onAddPhotos={s.addPhotos}
        onSaveAllReady={s.saveAll}
        savingCount={s.savingIds.size}
        viewport="mobile"
      />

      {s.savingIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px',
          background: 'var(--accent-soft)',
          borderBottom: '1px solid var(--border-accent)',
          color: 'var(--accent)', fontSize: 12,
        }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10,
            border: '1.5px solid currentColor', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'c11-spin 700ms linear infinite',
          }} />
          <span style={{ flex: 1 }}>Saving {s.savingIds.size}…</span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.items.map((it) => (
          <ImportItem
            key={it.id}
            item={it}
            expanded={s.expanded.has(it.id)}
            onToggle={s.toggle}
            onUpdate={s.update}
            onSave={s.saveOne}
            onDiscard={s.discard}
            onRetry={s.retry}
            onOpenFull={(item) => onOpenEditor?.(item.id)}
            viewport="mobile"
          />
        ))}
      </div>

      <ToastWithUndo toast={s.toast} />
    </div>
  );
}

// Add animation keyframes
if (typeof document !== 'undefined' && !document.getElementById('c11-import-kf')) {
  const s = document.createElement('style'); s.id = 'c11-import-kf';
  s.textContent = '@keyframes c11-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }';
  document.head.appendChild(s);
}

Object.assign(window, {
  ImportDesktop, ImportMobile,
});
