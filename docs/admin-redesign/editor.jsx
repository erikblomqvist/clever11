// Clever 11 Admin — Question editor screen
//   Desktop: top question fields + 300px master list + flex detail
//   Mobile:  question fields + horizontal option chip strip + detail card

const { useState: useStateF, useEffect: useEffectF, useMemo: useMemoF, useRef: useRefF } = React;

// ─────────────────────────────────────────────────────────────
// Build initial state from a question (or blank template)
// ─────────────────────────────────────────────────────────────
function blankOption() {
  return { label: '', image: null, correct: null, urls: {} };
}
function blankQuestion() {
  return {
    n: null, type: 'standard', deck: null, text: '', number: null,
    displayMode: 'text', // 'text' | 'image'
    options: Array.from({ length: 10 }).map(blankOption),
  };
}
// ─────────────────────────────────────────────────────────────
// Per-question option packs.
// Each Q's options carry their own (label, correct) pair — that's the data
// model: the question text is the framing, options are 10 instances, each
// row has its own answer of the type-appropriate shape.
// ─────────────────────────────────────────────────────────────
const QUESTION_MOCKS = {
  // 214 — Capital → country
  214: {
    options: [
      { label: 'Stockholm',   correct: 'Sverige',    urls: { generic: 'https://sv.wikipedia.org/wiki/Stockholm' } },
      { label: 'Oslo',        correct: 'Norge' },
      { label: 'Köpenhamn',   correct: 'Danmark' },
      { label: 'Helsingfors', correct: 'Finland' },
      { label: 'Reykjavík',   correct: 'Island' },
      { label: 'Berlin',      correct: 'Tyskland' },
      { label: 'Paris',       correct: 'Frankrike' },
      { label: 'Madrid',      correct: 'Spanien' },
      { label: 'Rom',         correct: 'Italien' },
      { label: 'Lissabon',    correct: 'Portugal' },
    ],
  },
  // 213 — EU member during 90s?
  213: {
    options: [
      { label: 'Sverige',          correct: true  },
      { label: 'Norge',            correct: false },
      { label: 'Finland',          correct: true  },
      { label: 'Schweiz',          correct: false },
      { label: 'Österrike',        correct: true  },
      { label: 'Polen',            correct: false },
      { label: 'Storbritannien',   correct: true  },
      { label: 'Island',           correct: false },
      { label: 'Ungern',           correct: false },
      { label: 'Danmark',          correct: true  },
    ],
  },
  // 212 — Rank best-selling games
  212: {
    options: [
      { label: 'Minecraft',                  correct: 1  },
      { label: 'GTA V',                      correct: 2  },
      { label: 'Tetris',                     correct: 3  },
      { label: 'Wii Sports',                 correct: 4  },
      { label: 'PUBG: Battlegrounds',        correct: 5  },
      { label: 'Mario Kart 8 Deluxe',        correct: 6  },
      { label: 'Red Dead Redemption 2',      correct: 7  },
      { label: 'Super Mario Bros.',          correct: 8  },
      { label: 'Pokémon Röd/Blå',            correct: 9  },
      { label: 'Terraria',                   correct: 10 },
    ],
  },
  // 211 — Star Wars eller Sagan om ringen?
  211: {
    options: [
      { label: 'Yoda',         correct: 'Star Wars' },
      { label: 'Gandalf',      correct: 'Sagan om ringen' },
      { label: 'Han Solo',     correct: 'Star Wars' },
      { label: 'Frodo',        correct: 'Sagan om ringen' },
      { label: 'Leia',         correct: 'Star Wars' },
      { label: 'Aragorn',      correct: 'Sagan om ringen' },
      { label: 'Chewbacca',    correct: 'Star Wars' },
      { label: 'Sam Gamgi',    correct: 'Sagan om ringen' },
      { label: 'Lando',        correct: 'Star Wars' },
      { label: 'Galadriel',    correct: 'Sagan om ringen' },
    ],
  },
  // 210 — Color name → HSL value
  210: {
    options: [
      { label: 'Solnedgång',      correct: { h: 18,  s: 75, l: 55, label: 'Solnedgång' } },
      { label: 'Havsblå',         correct: { h: 210, s: 70, l: 45, label: 'Havsblå' } },
      { label: 'Skogsmörker',     correct: { h: 145, s: 30, l: 25, label: 'Skogsmörker' } },
      { label: 'Pastellrosa',     correct: { h: 340, s: 70, l: 80, label: 'Pastellrosa' } },
      { label: 'Citrusgul',       correct: { h: 55,  s: 90, l: 60, label: 'Citrusgul' } },
      { label: 'Tegel',           correct: { h: 12,  s: 60, l: 40, label: 'Tegel' } },
      { label: 'Mintgrön',        correct: { h: 155, s: 50, l: 65, label: 'Mintgrön' } },
      { label: 'Lila skymning',   correct: { h: 280, s: 40, l: 35, label: 'Lila skymning' } },
      { label: 'Sandgul',         correct: { h: 38,  s: 50, l: 70, label: 'Sandgul' } },
      { label: 'Eldröd',          correct: { h: 2,   s: 80, l: 50, label: 'Eldröd' } },
    ],
  },
  // 209 — Race distance in meters
  209: {
    options: [
      { label: '1500-meterslopp',  correct: 1500 },
      { label: 'Maraton',          correct: 42195 },
      { label: 'Halvmaraton',      correct: 21097 },
      { label: '100m',             correct: 100 },
      { label: '5000m',            correct: 5000 },
      { label: '400m',             correct: 400 },
      { label: '800m',             correct: 800 },
      { label: '200m',             correct: 200 },
      { label: '10000m',           correct: 10000 },
      { label: 'Stafett 4x100',    correct: 400 },
    ],
  },
  // 208 — Decade of the event
  208: {
    options: [
      { label: 'Berlinmuren faller',         correct: '1980-talet' },
      { label: 'iPhone släpps',              correct: '2000-talet' },
      { label: 'ABBA vinner Eurovision',     correct: '1970-talet' },
      { label: 'Sverige med i EU',           correct: '1990-talet' },
      { label: 'Apollo 11 landar på månen',  correct: '1960-talet' },
      { label: 'Tjernobyl',                  correct: '1980-talet' },
      { label: 'Brexit-folkomröstning',      correct: '2010-talet' },
      { label: 'COVID-19 pandemin',          correct: '2020-talet' },
      { label: 'Sovjetunionen upplöses',     correct: '1990-talet' },
      { label: 'World Wide Web uppfinns',    correct: '1980-talet' },
    ],
  },
};

function questionToEditable(q) {
  const base = blankQuestion();
  base.n = q.n;
  base.type = q.type;
  base.deck = q.deck;
  base.text = q.text;
  base.number = q.n;
  // Color questions naturally render in image mode
  if (q.type === 'colors') base.displayMode = 'image';

  const mock = QUESTION_MOCKS[q.n];
  if (mock) {
    base.options = base.options.map((opt, i) => {
      const m = mock.options[i] || {};
      const correct = m.correct ?? null;
      // Auto-derive image from HSL for color questions in image mode
      let image = m.image ?? null;
      if (!image && q.type === 'colors' && correct && typeof correct === 'object') {
        image = `hsl(${correct.h} ${correct.s}% ${correct.l}%)`;
      }
      return {
        label: m.label ?? '',
        correct,
        urls:  m.urls  ?? {},
        image,
      };
    });
    return base;
  }

  // Fallback: empty options, with rank pre-permuted so it's valid by default
  base.options = base.options.map((opt, i) => {
    if (q.type === 'rank')   return { ...opt, correct: i + 1 };
    if (q.type === 'colors') return { ...opt, correct: { h: (i * 36) % 360, s: 55, l: 50, label: '' } };
    return opt;
  });
  return base;
}

// ─────────────────────────────────────────────────────────────
// Master row — compact, in the 300px list column
// ─────────────────────────────────────────────────────────────
function MasterRow({ idx, option, type, active, displayMode, onClick, onMoveUp, onMoveDown }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '24px 32px 1fr auto',
        alignItems: 'center', gap: 8,
        padding: '8px 12px 8px 8px',
        minHeight: 48,
        borderTop: '1px solid var(--border)',
        background: active ? 'var(--surface-2)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {active && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: 'var(--accent)' }} />}
      {/* Drag handle + index */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'var(--fg-faint)' }}>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2" cy="3" r="1.1"/><circle cx="8" cy="3" r="1.1"/><circle cx="2" cy="7" r="1.1"/><circle cx="8" cy="7" r="1.1"/><circle cx="2" cy="11" r="1.1"/><circle cx="8" cy="11" r="1.1"/></svg>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--r-1)',
        background: option.image && displayMode === 'image' ? option.image : 'var(--surface-2)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid var(--border)',
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-mute)',
        position: 'relative',
        flex: '0 0 32px',
      }}>
        {!(option.image && displayMode === 'image') && (idx + 1)}
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 13, color: option.label ? 'var(--fg)' : 'var(--fg-faint)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {option.label || `Option ${idx + 1}`}
        </span>
        <CorrectChip type={type} value={option.correct} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp}    disabled={idx === 0} style={miniBtn(idx === 0)}><Tri up /></button>
        <button onClick={onMoveDown}  disabled={idx === 9} style={miniBtn(idx === 9)}><Tri /></button>
      </div>
    </div>
  );
}

function miniBtn(disabled) {
  return {
    width: 18, height: 16, display: 'grid', placeItems: 'center',
    color: disabled ? 'var(--fg-disabled)' : 'var(--fg-faint)',
    borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
function Tri({ up }) {
  return <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor" style={{ transform: up ? 'none' : 'rotate(180deg)' }}><path d="M4 0l4 6H0z"/></svg>;
}

function CorrectChip({ type, value }) {
  // Per-row answer chip in the master list. Show the actual answer value, truncated.
  const isBlank =
    value == null
    || value === ''
    || (type === 'colors' && typeof value === 'object' && !value.label && value.s === 0);

  if (type === 'boolean') {
    if (value === true)  return <span style={chipStyle('var(--ok)',     'var(--ok-soft)',     'rgba(125,240,160,0.25)')}>YES</span>;
    if (value === false) return <span style={chipStyle('var(--danger)', 'var(--danger-soft)', 'rgba(255,101,119,0.25)')}>NO</span>;
    return <span style={chipStyle('var(--fg-faint)', 'transparent', 'var(--border)')}>—</span>;
  }

  if (type === 'rank') {
    if (value == null) return <span style={chipStyle('var(--fg-faint)', 'transparent', 'var(--border)')}>no rank</span>;
    return <span style={chipStyle('var(--accent)', 'var(--accent-soft)', 'var(--border-accent)')}>#{value}</span>;
  }

  if (type === 'colors') {
    if (!value) return <span style={chipStyle('var(--fg-faint)', 'transparent', 'var(--border)')}>no color</span>;
    const css = `hsl(${value.h} ${value.s}% ${value.l}%)`;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: css, border: '1px solid var(--border)' }} />
        {value.label || `hsl(${value.h}\u00b0)`}
      </span>
    );
  }

  if (type === 'numbers') {
    if (value == null) return <span style={chipStyle('var(--fg-faint)', 'transparent', 'var(--border)')}>blank</span>;
    return <span style={chipStyle('var(--info)', 'var(--info-soft)', 'rgba(95,179,255,0.25)')}>= {value}</span>;
  }

  // Text-based types: show the answer (truncated)
  if (isBlank) return <span style={chipStyle('var(--fg-faint)', 'transparent', 'var(--border)')}>blank</span>;
  const str = String(value);
  const trunc = str.length > 18 ? str.slice(0, 16) + '…' : str;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 16, padding: '0 6px',
      background: 'transparent', border: '1px solid var(--border)', borderRadius: 100,
      fontSize: 10.5, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)',
      width: 'fit-content',
      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      → {trunc}
    </span>
  );
}

function chipStyle(fg, bg, bd) {
  return {
    display: 'inline-flex', alignItems: 'center', height: 16, padding: '0 6px',
    background: bg, border: `1px solid ${bd}`, borderRadius: 100,
    color: fg, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
    width: 'fit-content',
  };
}

// ─────────────────────────────────────────────────────────────
// useEditorState — central hook
// ─────────────────────────────────────────────────────────────
function useEditorState(questionN) {
  const initial = useMemoF(() => {
    if (questionN === 'new' || questionN == null) return blankQuestion();
    const found = (window.QUESTIONS || []).find((q) => q.n === Number(questionN));
    return found ? questionToEditable(found) : blankQuestion();
  }, [questionN]);
  const [q, setQ] = useStateF(initial);
  const [focusedIdx, setFocusedIdx] = useStateF(0);
  const [dirty, setDirty] = useStateF(false);
  const [confirmDiscard, setConfirmDiscard] = useStateF(false);
  const [shortcutsOpen, setShortcutsOpen] = useStateF(false);
  const [toast, setToast] = useStateF(null);

  const showToast = (text, undo) => {
    setToast({ text, undo });
    setTimeout(() => setToast(null), 3500);
  };

  const update = (patch) => { setQ((prev) => ({ ...prev, ...patch })); setDirty(true); };
  const updateOption = (idx, patch) => {
    setQ((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => i === idx ? { ...o, ...patch } : o),
    }));
    setDirty(true);
  };
  const moveOption = (from, to) => {
    if (to < 0 || to > 9) return;
    setQ((prev) => {
      const next = [...prev.options];
      const [o] = next.splice(from, 1);
      next.splice(to, 0, o);
      return { ...prev, options: next };
    });
    setFocusedIdx(to);
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    showToast(q.n != null ? `Saved Q #${q.n}.` : 'Saved new question.');
  };
  const discard = () => { setConfirmDiscard(true); };
  const confirmDiscardYes = () => { setQ(initial); setDirty(false); setConfirmDiscard(false); showToast('Changes discarded.'); };

  return {
    q, setQ, update, updateOption, moveOption,
    focusedIdx, setFocusedIdx,
    dirty, save, discard, confirmDiscard, setConfirmDiscard, confirmDiscardYes,
    shortcutsOpen, setShortcutsOpen,
    toast, showToast,
  };
}

// ─────────────────────────────────────────────────────────────
// Editor header — title, breadcrumb, Save / Discard
// ─────────────────────────────────────────────────────────────
function EditorHeader({ q, dirty, onSave, onDiscard, onBack, onShortcuts }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 22px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(15,15,18,0.65)',
      backdropFilter: 'blur(8px)',
      minHeight: 60,
    }}>
      <button onClick={onBack} className="btn btn--ghost btn--sm" style={{ height: 30 }}>
        <I.caret size={12} style={{ transform: 'rotate(180deg)' }} />
        Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
            /admin/questions/{q.n ?? 'new'}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 500, color: 'var(--fg)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600,
          }}>
            {q.text || 'Untitled question'}
          </div>
        </div>
      </div>
      {dirty && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-2)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />
          Unsaved changes
        </span>
      )}
      <button onClick={onShortcuts} title="Keyboard shortcuts (⌘/)" className="btn btn--ghost btn--sm" style={{ height: 30, width: 30, padding: 0, justifyContent: 'center' }}>
        <span className="kbd" style={{ border: 'none', background: 'transparent', color: 'inherit', fontSize: 13 }}>⌘/</span>
      </button>
      <button onClick={onDiscard} disabled={!dirty} className="btn btn--ghost" style={{ opacity: dirty ? 1 : 0.5 }}>
        Discard
      </button>
      <button onClick={onSave} className="btn btn--primary">
        <I.bolt size={13} />Save
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Question fields section (top bar, dense)
// ─────────────────────────────────────────────────────────────
function QuestionFields({ q, onChange, viewport }) {
  const isMobile = viewport === 'mobile';
  const longWord = findLongWord(q.text);
  return (
    <section style={{
      padding: isMobile ? '14px 16px' : '18px 22px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 120px 160px',
        gap: 10,
      }}>
        <LabelledField label="Deck">
          <Select
            label=""
            value={q.deck}
            onChange={(v) => onChange({ deck: v })}
            options={DECKS.map((d) => ({ value: d.id, label: d.name }))}
            width="100%"
          />
        </LabelledField>
        <LabelledField label="Type" hint="Changes the correct-answer shape">
          <Select
            label=""
            value={q.type}
            onChange={(v) => onChange({ type: v })}
            options={Object.entries(TYPE_META).map(([k, m]) => ({ value: k, label: m.label, hint: m.short }))}
            width="100%"
          />
        </LabelledField>
        <LabelledField label="#" optional>
          <PlainInput type="number" value={q.number ?? ''} onChange={(v) => onChange({ number: v === '' ? null : Number(v) })} />
        </LabelledField>
        <LabelledField label="Display">
          <DisplayModeToggle value={q.displayMode} onChange={(v) => onChange({ displayMode: v })} />
        </LabelledField>
      </div>

      <LabelledField label="Question text" hint={`${(q.text || '').length} chars`}>
        <div className="input" style={{ height: 'auto', padding: '10px 14px', alignItems: 'flex-start' }}>
          <textarea
            value={q.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="I vilket land ligger denna huvudstad?"
            rows={2}
            style={{
              width: '100%', background: 'transparent', border: 0, outline: 'none',
              color: 'var(--fg)', fontSize: 14, resize: 'vertical', minHeight: 44,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </LabelledField>

      {longWord && (
        <SoftHyphenHelper
          word={longWord}
          onChange={(newWord) => onChange({ text: q.text.replace(longWord, newWord) })}
        />
      )}
    </section>
  );
}

function DisplayModeToggle({ value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', height: 36, padding: 3,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-2)', width: '100%',
    }}>
      {[
        { v: 'text',  label: 'Text', icon: I.question },
        { v: 'image', label: 'Image', icon: I.chip },
      ].map((o) => {
        const active = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 'var(--r-1)',
            background: active ? 'var(--surface-2)' : 'transparent',
            color: active ? 'var(--fg)' : 'var(--fg-mute)',
            fontSize: 12.5, fontWeight: 500,
          }}>
            <o.icon size={12} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────
function DetailPanel({ q, idx, onChange, onMove, onPrev, onNext }) {
  const opt = q.options[idx];
  if (!opt) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 22px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-faint)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Option
        </span>
        <span className="mono" style={{ fontSize: 22, color: 'var(--fg)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          {idx + 1}<span style={{ color: 'var(--fg-faint)', fontSize: 16 }}>/10</span>
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => onMove(idx, idx - 1)} disabled={idx === 0} className="btn btn--ghost btn--sm" style={{ height: 28, width: 28, padding: 0, justifyContent: 'center', opacity: idx === 0 ? 0.4 : 1 }} title="Move up">
          <Tri up />
        </button>
        <button onClick={() => onMove(idx, idx + 1)} disabled={idx === 9} className="btn btn--ghost btn--sm" style={{ height: 28, width: 28, padding: 0, justifyContent: 'center', opacity: idx === 9 ? 0.4 : 1 }} title="Move down">
          <Tri />
        </button>
        <div className="vr" style={{ height: 20, margin: '0 4px' }} />
        <button onClick={onPrev} disabled={idx === 0} className="btn btn--ghost btn--sm" style={{ height: 28, opacity: idx === 0 ? 0.4 : 1 }}>
          <I.caret size={11} style={{ transform: 'rotate(180deg)' }} /> Prev
        </button>
        <button onClick={onNext} disabled={idx === 9} className="btn btn--ghost btn--sm" style={{ height: 28, opacity: idx === 9 ? 0.4 : 1 }}>
          Next <I.caret size={11} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: q.displayMode === 'image' ? '180px 1fr' : '1fr', gap: 20 }}>
          {q.displayMode === 'image' && (
            <div>
              <LabelledField label="Image" hint="JPEG/PNG/WebP · max 5MB">
                <ImageSlot
                  image={opt.image}
                  onUpload={() => onChange(idx, { image: opt.image || `hsl(${(idx * 36) % 360} 55% 50%)` })}
                  onClear={() => onChange(idx, { image: null })}
                  size="lg"
                />
              </LabelledField>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <LabelledField label="Option label" hint={optionLabelHint(q.type)}>
              <PlainInput
                value={opt.label}
                onChange={(v) => onChange(idx, { label: v })}
                placeholder={optionLabelPlaceholder(q.type)}
              />
            </LabelledField>

            <LabelledField
              label="Correct answer"
              hint={correctAnswerHint(q.type)}
            >
              <CorrectAnswerField
                type={q.type}
                value={opt.correct}
                onChange={(v) => onChange(idx, { correct: v })}
                allOptions={q.options}
                optionIdx={idx}
              />
            </LabelledField>

            {q.type === 'standard' && (
              <LabelledField
                label="Links"
                hint="Shown after the answer reveals"
                optional
              >
                <UrlsBlock urls={opt.urls} onChange={(v) => onChange(idx, { urls: v })} />
              </LabelledField>
            )}

            {q.displayMode === 'text' && (
              <details style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r-2)',
                padding: '10px 12px',
              }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--fg-mute)', listStyle: 'none' }}>
                  Optional image for this option
                </summary>
                <div style={{ marginTop: 10 }}>
                  <ImageSlot
                    image={opt.image}
                    onUpload={() => onChange(idx, { image: opt.image || `hsl(${(idx * 36) % 360} 55% 50%)` })}
                    onClear={() => onChange(idx, { image: null })}
                  />
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function correctAnswerHint(type) {
  switch (type) {
    case 'standard':      return 'Answer revealed for this option';
    case 'chooseBetween': return 'Which side of the comparison';
    case 'centuryDecade': return 'e.g. 1980-talet';
    case 'rank':          return 'Each option needs a unique rank 1–10';
    case 'boolean':       return 'Yes/no for this option';
    case 'colors':        return 'HSL — used to score how close player guesses are';
    case 'numbers':       return 'Exact number for this option';
    default:              return '';
  }
}

function optionLabelPlaceholder(type) {
  return ({
    standard:      'e.g. Stockholm',
    boolean:       'e.g. Mark Twain',
    rank:          'e.g. Minecraft',
    chooseBetween: 'e.g. Yoda',
    colors:        'e.g. Solnedgång',
    numbers:       'e.g. 1500-meterslopp',
    centuryDecade: 'e.g. Berlinmuren faller',
  })[type] || 'Option label';
}

function optionLabelHint(type) {
  return ({
    boolean:       'The subject this option asks about',
    chooseBetween: 'The subject to categorise',
    colors:        'Color name shown to players',
  })[type] || 'Shown on the card';
}

// ─────────────────────────────────────────────────────────────
// DESKTOP editor
// ─────────────────────────────────────────────────────────────
function EditorDesktop({ questionN, onNavigate, onSignOut, onOpenCmdK, onBack }) {
  const s = useEditorState(questionN);

  // Keyboard shortcuts
  useEffectF(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 's')       { e.preventDefault(); s.save(); }
      else if (meta && e.key === '/')  { e.preventDefault(); s.setShortcutsOpen((v) => !v); }
      else if (meta && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = e.key === '0' ? 9 : Number(e.key) - 1;
        s.setFocusedIdx(idx);
      }
      else if (!e.target.matches('input, textarea')) {
        if (e.key === 'ArrowUp')   { s.setFocusedIdx((i) => Math.max(0, i - 1)); }
        if (e.key === 'ArrowDown') { s.setFocusedIdx((i) => Math.min(9, i + 1)); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.save]);

  return (
    <div className="c11" data-screen-label="Editor (desktop)" style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', position: 'relative',
    }}>
      <Sidebar active="questions" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <EditorHeader
          q={s.q} dirty={s.dirty}
          onSave={s.save}
          onDiscard={s.discard}
          onBack={onBack}
          onShortcuts={() => s.setShortcutsOpen(true)}
        />
        <QuestionFields q={s.q} onChange={s.update} viewport="desktop" />

        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          flex: 1, minHeight: 0,
        }}>
          {/* Master list */}
          <div style={{
            width: 320, flex: '0 0 320px',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-2)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 12px 12px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Options
              </span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>
                10 / 10
              </span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>
                ↑ ↓
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {s.q.options.map((opt, idx) => (
                <MasterRow
                  key={idx}
                  idx={idx}
                  option={opt}
                  type={s.q.type}
                  displayMode={s.q.displayMode}
                  active={idx === s.focusedIdx}
                  onClick={() => s.setFocusedIdx(idx)}
                  onMoveUp={() => s.moveOption(idx, idx - 1)}
                  onMoveDown={() => s.moveOption(idx, idx + 1)}
                />
              ))}
            </div>
          </div>

          {/* Detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <DetailPanel
              q={s.q}
              idx={s.focusedIdx}
              onChange={s.updateOption}
              onMove={s.moveOption}
              onPrev={() => s.setFocusedIdx((i) => Math.max(0, i - 1))}
              onNext={() => s.setFocusedIdx((i) => Math.min(9, i + 1))}
            />
          </div>
        </div>
      </main>

      <Dialog
        open={s.confirmDiscard}
        onClose={() => s.setConfirmDiscard(false)}
        title="Discard your changes?"
        description="Anything you've edited since opening this question will be lost. The saved version is unaffected."
        danger
        confirmLabel="Discard"
        onConfirm={s.confirmDiscardYes}
      />
      <ShortcutOverlay open={s.shortcutsOpen} onClose={() => s.setShortcutsOpen(false)} />
      <ToastWithUndo toast={s.toast} onUndo={() => s.toast?.undo?.()} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE editor — chip strip + detail
// ─────────────────────────────────────────────────────────────
function EditorMobile({ questionN, onNavigate, onSignOut, onOpenCmdK, onBack, onOpenDrawer }) {
  const s = useEditorState(questionN);
  return (
    <div className="c11" data-screen-label="Editor (mobile)" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', background: 'var(--bg)',
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, flex: '0 0 52px',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15,15,18,0.85)',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg)',
        }}>
          <I.caret size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
            /admin/questions/{s.q.n ?? 'new'}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.q.text || 'Untitled'}
          </div>
        </div>
        {s.dirty && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-2)' }} />}
        <button onClick={s.save} className="btn btn--primary btn--sm" style={{ height: 32 }}>Save</button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <QuestionFields q={s.q} onChange={s.update} viewport="mobile" />

        {/* Chip strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '12px 12px 10px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
        }}>
          <span style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', flex: '0 0 auto' }}>
            Options
          </span>
          {s.q.options.map((opt, idx) => {
            const active = idx === s.focusedIdx;
            const correctChipColor = chipColorForType(s.q.type, opt.correct);
            return (
              <button key={idx} onClick={() => s.setFocusedIdx(idx)} style={{
                flex: '0 0 auto',
                height: 38, padding: '0 12px',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: active ? 'var(--surface-2)' : 'var(--surface)',
                border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
                borderRadius: 100,
                color: active ? 'var(--fg)' : 'var(--fg-mute)',
                position: 'relative',
              }}>
                {active && <span style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                <span className="mono" style={{ fontSize: 12, color: active ? 'var(--accent)' : 'var(--fg-mute)' }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: 12.5, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label || `Option ${idx + 1}`}
                </span>
                {correctChipColor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: correctChipColor }} />}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <DetailPanel
          q={s.q}
          idx={s.focusedIdx}
          onChange={s.updateOption}
          onMove={s.moveOption}
          onPrev={() => s.setFocusedIdx((i) => Math.max(0, i - 1))}
          onNext={() => s.setFocusedIdx((i) => Math.min(9, i + 1))}
        />

        {/* Footer */}
        <div style={{ padding: '14px 16px 22px', display: 'flex', gap: 8 }}>
          <button onClick={s.discard} className="btn btn--ghost" style={{ flex: 1 }}>Discard</button>
          <button onClick={s.save} className="btn btn--primary" style={{ flex: 1 }}>Save changes</button>
        </div>
      </div>

      <Dialog
        open={s.confirmDiscard}
        onClose={() => s.setConfirmDiscard(false)}
        title="Discard your changes?"
        description="Any edits since opening this question will be lost."
        danger
        confirmLabel="Discard"
        onConfirm={s.confirmDiscardYes}
      />
      <ShortcutOverlay open={s.shortcutsOpen} onClose={() => s.setShortcutsOpen(false)} />
      <ToastWithUndo toast={s.toast} onUndo={() => s.toast?.undo?.()} />
    </div>
  );
}

function chipColorForType(type, value) {
  if (type === 'boolean') return value === true ? 'var(--ok)' : value === false ? 'var(--danger)' : null;
  if (type === 'rank')    return value ? 'var(--accent)' : null;
  if (type === 'colors')  return value ? `hsl(${value.h} ${value.s}% ${value.l}%)` : null;
  if (type === 'numbers') return value != null ? 'var(--info)' : null;
  if (typeof value === 'string' && value.length > 0) return 'var(--ok)';
  return null;
}

Object.assign(window, {
  EditorDesktop, EditorMobile,
});
