// Clever 11 Admin — Questions list screen
//   Desktop: dense hairline table
//   Mobile: card list
//   Shared: filter bar (search + deck + type + archived), sort, kebab actions,
//   archive confirm dialog, toast-with-undo.

const { useState: useStateQ, useEffect: useEffectQ, useMemo: useMemoQ, useRef: useRefQ } = React;

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const DECKS = [
  { id: 'allmanbildning', name: 'Allmänbildning' },
  { id: 'historia',       name: 'Historia' },
  { id: 'sport',          name: 'Sport' },
  { id: 'filmcitat',      name: 'Filmcitat' },
  { id: 'farger',         name: 'Färger' },
  { id: '90talet',        name: '90-talet' },
  { id: 'musik',          name: 'Musik' },
  { id: 'geografi',       name: 'Geografi' },
];
const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d.name]));

const QUESTIONS = [
  { n: 214, type: 'standard',      text: 'I vilket land ligger denna huvudstad?',                deck: 'geografi',       up: 24, down: 3,  played: 412, archived: false },
  { n: 213, type: 'boolean',       text: 'Tillträdde detta land EU under 90-talet?',             deck: 'geografi',       up: 18, down: 2,  played: 290, archived: false },
  { n: 212, type: 'rank',          text: 'Rangordna decenniernas mest sålda spel.',              deck: '90talet',        up: 9,  down: 4,  played: 178, archived: false },
  { n: 211, type: 'chooseBetween', text: 'Karaktär från Star Wars eller Sagan om ringen?',       deck: 'filmcitat',      up: 31, down: 6,  played: 502, archived: false },
  { n: 210, type: 'colors',        text: 'Matcha färgen till dess namn.',                        deck: 'farger',         up: 12, down: 2,  played: 140, archived: false },
  { n: 209, type: 'numbers',       text: 'Hur långt är detta lopp i meter?',                     deck: 'sport',          up: 21, down: 1,  played: 388, archived: false },
  { n: 208, type: 'centuryDecade', text: 'Under vilket decennium hände detta?',                  deck: 'historia',       up: 27, down: 2,  played: 449, archived: false },
  { n: 207, type: 'standard',      text: 'Vem regisserade denna film?',                          deck: 'filmcitat',      up: 33, down: 4,  played: 521, archived: false },
  { n: 206, type: 'boolean',       text: 'Är detta en europeisk huvudstad?',                     deck: 'geografi',       up: 14, down: 6,  played: 220, archived: false },
  { n: 205, type: 'rank',          text: 'Rangordna länderna efter folkmängd, störst först.',    deck: 'geografi',       up: 8,  down: 8,  played: 168, archived: false },
  { n: 204, type: 'standard',      text: 'Vilken artist sjunger denna låt?',                     deck: 'musik',          up: 41, down: 3,  played: 612, archived: false },
  { n: 203, type: 'chooseBetween', text: 'Däggdjur eller fågel?',                                deck: 'allmanbildning', up: 6,  down: 12, played: 144, archived: false },
  { n: 202, type: 'numbers',       text: 'I vilket år hände detta i Sverige?',                   deck: 'historia',       up: 17, down: 5,  played: 234, archived: false },
  { n: 201, type: 'centuryDecade', text: 'Under vilket decennium uppfanns detta?',               deck: 'historia',       up: 22, down: 4,  played: 351, archived: false },
  { n: 200, type: 'standard',      text: 'Hur många hörn har denna geometriska form?',           deck: 'allmanbildning', up: 19, down: 7,  played: 280, archived: false },
  { n: 199, type: 'colors',        text: 'Vilken färg är komplementär till denna?',              deck: 'farger',         up: 11, down: 1,  played: 132, archived: false },
  { n: 198, type: 'boolean',       text: 'Är detta påstående om planeten sant?',                 deck: 'allmanbildning', up: 25, down: 2,  played: 388, archived: false },
  { n: 197, type: 'standard',      text: 'Från vilken film kommer detta citat?',                 deck: 'filmcitat',      up: 28, down: 3,  played: 410, archived: false },
  { n: 196, type: 'rank',          text: 'Rangordna ABBA-medlemmarna efter födelseår.',          deck: 'musik',          up: 7,  down: 9,  played: 180, archived: false },
  { n: 195, type: 'numbers',       text: 'Hur många minuter pågår en period i denna sport?',     deck: 'sport',          up: 16, down: 2,  played: 260, archived: false },
  // archived
  { n: 88,  type: 'standard',      text: 'Vilken sport beskrivs av dessa regler?',               deck: 'sport',          up: 4,  down: 22, played: 320, archived: true,  reason: 'Duplicate of #195 with worse phrasing.' },
  { n: 67,  type: 'boolean',       text: 'Var detta land med i andra världskriget?',             deck: 'historia',       up: 2,  down: 18, played: 198, archived: true,  reason: 'Ambiguous for neutral countries.' },
];

// ─────────────────────────────────────────────────────────────
// Filter bar
// ─────────────────────────────────────────────────────────────
function FilterBar({ search, setSearch, deck, setDeck, type, setType, archived, setArchived, total, filtered, onReset, viewport }) {
  const isMobile = viewport === 'mobile';
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      padding: isMobile ? '12px 16px' : '14px 22px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
    }}>
      {/* Search */}
      <div className="input" style={{
        flex: '1 1 220px', maxWidth: isMobile ? '100%' : 360,
        height: 36, padding: '0 12px',
      }}>
        <I.search size={14} style={{ color: 'var(--fg-faint)' }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          style={{ background: 'transparent', border: 0, outline: 'none', color: 'var(--fg)', width: '100%', fontSize: 13.5 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--fg-faint)', display: 'grid', placeItems: 'center' }}>
            <I.close size={12} />
          </button>
        )}
      </div>

      <Select
        label="Deck"
        value={deck}
        onChange={setDeck}
        allowClear
        options={DECKS.map((d) => ({ value: d.id, label: d.name }))}
        width={isMobile ? '100%' : 180}
      />
      <Select
        label="Type"
        value={type}
        onChange={setType}
        allowClear
        options={Object.entries(TYPE_META).map(([k, v]) => ({
          value: k, label: v.label, hint: v.short,
        }))}
        width={isMobile ? '100%' : 180}
      />
      <Toggle
        checked={archived}
        onChange={setArchived}
        label="Archived"
        hint={archived ? null : 'hidden'}
      />

      <div style={{ flex: 1 }} />

      {(search || deck || type || archived) && (
        <button onClick={onReset} className="btn btn--ghost btn--sm" style={{ height: 30 }}>
          Reset
        </button>
      )}

      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '0 4px',
        fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-mute)',
      }}>
        <span style={{ color: 'var(--fg)' }}>{filtered}</span>
        <span style={{ color: 'var(--fg-faint)' }}>/</span>
        <span>{total}</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Desktop table
// ─────────────────────────────────────────────────────────────
function QuestionsTable({ rows, sort, dir, onSort, onEdit, onArchive, onRestore }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={I.search}
        title="No questions match these filters."
        body="Try clearing a filter, broadening your search, or toggling archived."
      />
    );
  }
  return (
    <div role="table" style={{ width: '100%' }}>
      {/* Header */}
      <div role="row" style={{
        display: 'grid',
        gridTemplateColumns: '64px 88px 1fr 140px 124px 80px',
        padding: '0 22px',
        height: 36,
        alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <SortHeader label="#"        sortKey="n"    current={sort} dir={dir} onSort={onSort} />
        <span style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Type</span>
        <SortHeader label="Question" sortKey="text" current={sort} dir={dir} onSort={onSort} />
        <span style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deck</span>
        <SortHeader label="Votes"    sortKey="net"  current={sort} dir={dir} onSort={onSort} />
        <span />
      </div>
      {/* Rows */}
      {rows.map((q) => (
        <div
          key={q.n}
          role="row"
          onClick={() => onEdit(q)}
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 88px 1fr 140px 124px 80px',
            padding: '0 22px',
            minHeight: 52,
            alignItems: 'center', gap: 16,
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
            opacity: q.archived ? 0.55 : 1,
            position: 'relative',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--fg-mute)' }}>#{q.n}</span>
          <TypeBadge type={q.type} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13.5, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.text}
            </span>
            {q.archived && (
              <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                Archived — {q.reason}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--fg-mute)' }}>
            {DECK_BY_ID[q.deck]}
          </span>
          <VoteChips up={q.up} down={q.down} />
          <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={(e) => e.stopPropagation()}>
            <IconButton icon={I.edit} label="Edit" onClick={() => onEdit(q)} />
            <DropdownMenu
              trigger={<IconButton icon={Kebab} label="More actions" />}
              items={q.archived ? [
                { label: 'Restore',   icon: I.archive, onClick: () => onRestore(q) },
                { separator: true },
                { label: 'Edit',      icon: I.edit,    onClick: () => onEdit(q) },
              ] : [
                { label: 'Edit',      icon: I.edit,    onClick: () => onEdit(q),    kbd: ['E'] },
                { label: 'Duplicate', icon: I.cards,   onClick: () => {} },
                { label: 'Copy link', icon: I.import,  onClick: () => {} },
                { separator: true },
                { label: 'Archive',   icon: I.archive, onClick: () => onArchive(q), danger: true },
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Kebab icon glyph (3-dots)
function Kebab({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3"  r="1.4" />
      <circle cx="8" cy="8"  r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile cards
// ─────────────────────────────────────────────────────────────
function QuestionsCards({ rows, onEdit, onArchive, onRestore }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <EmptyState icon={I.search} title="No questions match." body="Adjust filters above." />
      </div>
    );
  }
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((q) => (
        <div key={q.n} onClick={() => onEdit(q)} className="card card--hover" style={{
          padding: 12,
          opacity: q.archived ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>#{q.n}</span>
            <TypeBadge type={q.type} />
            <span style={{ flex: 1 }} />
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu
                trigger={<IconButton icon={Kebab} label="More" size={28} />}
                items={q.archived ? [
                  { label: 'Restore', icon: I.archive, onClick: () => onRestore(q) },
                ] : [
                  { label: 'Edit',      icon: I.edit,    onClick: () => onEdit(q) },
                  { label: 'Duplicate', icon: I.cards,   onClick: () => {} },
                  { separator: true },
                  { label: 'Archive',   icon: I.archive, onClick: () => onArchive(q), danger: true },
                ]}
              />
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 8 }}>
            {q.text}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--fg-mute)' }}>
            <span>{DECK_BY_ID[q.deck]}</span>
            <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--border-strong)' }} />
            <VoteChips up={q.up} down={q.down} compact />
          </div>
          {q.archived && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg-faint)' }}>
              Archived — {q.reason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top-level Questions screen
// ─────────────────────────────────────────────────────────────
function useQuestionsState() {
  const [search, setSearch] = useStateQ('');
  const [deck, setDeck] = useStateQ(null);
  const [type, setType] = useStateQ(null);
  const [archived, setArchived] = useStateQ(false);
  const [sort, setSort] = useStateQ('n');
  const [dir, setDir]   = useStateQ('desc');
  const [data, setData] = useStateQ(QUESTIONS);
  const [toast, setToast] = useStateQ(null);  // { text, undo? }
  const [confirm, setConfirm] = useStateQ(null);

  const filtered = useMemoQ(() => {
    let r = data.filter((q) => archived ? q.archived : !q.archived);
    if (deck)   r = r.filter((q) => q.deck === deck);
    if (type)   r = r.filter((q) => q.type === type);
    if (search) {
      const s = search.trim().toLowerCase();
      r = r.filter((q) => q.text.toLowerCase().includes(s) || String(q.n).includes(s));
    }
    r = [...r].sort((a, b) => {
      let av, bv;
      if (sort === 'n') { av = a.n; bv = b.n; }
      else if (sort === 'text') { av = a.text.toLowerCase(); bv = b.text.toLowerCase(); }
      else if (sort === 'net') { av = a.up - a.down; bv = b.up - b.down; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [data, search, deck, type, archived, sort, dir]);

  const handleSort = (key) => {
    if (sort === key) setDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDir(key === 'text' ? 'asc' : 'desc'); }
  };

  const resetFilters = () => { setSearch(''); setDeck(null); setType(null); setArchived(false); };

  const showToast = (text, undo) => {
    setToast({ text, undo });
    setTimeout(() => setToast(null), 4500);
  };

  const askArchive = (q) => setConfirm({ kind: 'archive', q });

  const doArchive = (q) => {
    const prevReason = q.reason;
    setData((d) => d.map((x) => x.n === q.n ? { ...x, archived: true, reason: prevReason || 'Archived from list.' } : x));
    setConfirm(null);
    showToast(`Archived Q #${q.n}.`, () => {
      setData((d) => d.map((x) => x.n === q.n ? { ...x, archived: false, reason: prevReason } : x));
      setToast(null);
    });
  };

  const doRestore = (q) => {
    setData((d) => d.map((x) => x.n === q.n ? { ...x, archived: false } : x));
    showToast(`Restored Q #${q.n}.`);
  };

  return {
    search, setSearch, deck, setDeck, type, setType, archived, setArchived,
    sort, dir, handleSort, filtered, resetFilters,
    toast, confirm, setConfirm, askArchive, doArchive, doRestore, total: data.filter((q) => archived ? q.archived : !q.archived).length,
    showToast,
  };
}

function QuestionsDesktop({ onNavigate, onSignOut, onOpenCmdK, onOpenEditor }) {
  const s = useQuestionsState();
  return (
    <div className="c11" data-screen-label="Questions (desktop)" style={{
      width: '100%', height: '100%',
      display: 'flex', background: 'var(--bg)', position: 'relative',
    }}>
      <Sidebar active="questions" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar path="/admin/questions" title="Questions" actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn--ghost"><I.import size={14} />Import cards</button>
            <button className="btn btn--primary" onClick={() => onOpenEditor?.('new')}>
              <I.plus size={14} />New question
            </button>
          </div>
        } />

        <div style={{ padding: '22px 32px 0' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Questions
          </h1>
          <p style={{ margin: '4px 0 18px', fontSize: 13, color: 'var(--fg-mute)' }}>
            All cards across all decks. Click a row to edit.
          </p>
        </div>

        <FilterBar
          search={s.search} setSearch={s.setSearch}
          deck={s.deck}     setDeck={s.setDeck}
          type={s.type}     setType={s.setType}
          archived={s.archived} setArchived={s.setArchived}
          total={s.total} filtered={s.filtered.length}
          onReset={s.resetFilters}
          viewport="desktop"
        />

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <QuestionsTable
            rows={s.filtered}
            sort={s.sort} dir={s.dir} onSort={s.handleSort}
            onEdit={(q) => onOpenEditor?.(q.n)}
            onArchive={s.askArchive}
            onRestore={s.doRestore}
          />
        </div>
      </main>

      <Dialog
        open={!!s.confirm}
        onClose={() => s.setConfirm(null)}
        title={s.confirm ? `Archive Q #${s.confirm.q.n}?` : ''}
        description={s.confirm ? 'It will be hidden from gameplay and from the default list. You can restore it later from the Archived view.' : ''}
        danger
        confirmLabel="Archive"
        onConfirm={() => s.doArchive(s.confirm.q)}
      >
        {s.confirm && (
          <div style={{
            padding: 12, background: 'var(--bg-2)',
            border: '1px solid var(--border)', borderRadius: 'var(--r-2)',
            fontSize: 13, color: 'var(--fg-mute)',
          }}>
            <span className="mono" style={{ color: 'var(--fg-faint)', fontSize: 11.5 }}>#{s.confirm.q.n}</span>{' '}
            <span style={{ color: 'var(--fg)' }}>{s.confirm.q.text}</span>
          </div>
        )}
      </Dialog>

      <ToastWithUndo toast={s.toast} onUndo={() => s.toast?.undo?.()} />
    </div>
  );
}

function QuestionsMobile({ onNavigate, onSignOut, onOpenCmdK, onOpenDrawer, onOpenEditor }) {
  const s = useQuestionsState();
  return (
    <div className="c11" data-screen-label="Questions (mobile)" style={{
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>Questions</div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{s.filtered.length} of {s.total}</div>
        </div>
        <button onClick={onOpenCmdK} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-mute)',
        }}><I.search size={15} /></button>
        <button onClick={() => onOpenEditor?.('new')} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          display: 'grid', placeItems: 'center',
        }}><I.plus size={16} /></button>
      </header>

      <FilterBar
        search={s.search} setSearch={s.setSearch}
        deck={s.deck}     setDeck={s.setDeck}
        type={s.type}     setType={s.setType}
        archived={s.archived} setArchived={s.setArchived}
        total={s.total} filtered={s.filtered.length}
        onReset={s.resetFilters}
        viewport="mobile"
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <QuestionsCards
          rows={s.filtered}
          onEdit={(q) => onOpenEditor?.(q.n)}
          onArchive={s.askArchive}
          onRestore={s.doRestore}
        />
      </div>

      <Dialog
        open={!!s.confirm}
        onClose={() => s.setConfirm(null)}
        title={s.confirm ? `Archive Q #${s.confirm.q.n}?` : ''}
        description={s.confirm ? 'It will be hidden from gameplay. You can restore it later.' : ''}
        danger
        confirmLabel="Archive"
        onConfirm={() => s.doArchive(s.confirm.q)}
      />
      <ToastWithUndo toast={s.toast} onUndo={() => s.toast?.undo?.()} />
    </div>
  );
}

// Toast w/ undo — overrides the earlier simple Toast for screens that need undo
function ToastWithUndo({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--r-2)',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
      fontSize: 13,
      boxShadow: 'var(--shadow-pop)',
      zIndex: 100,
      animation: 'c11-fade-in 180ms ease',
      maxWidth: 'calc(100% - 32px)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />
      <span>{toast.text}</span>
      {toast.undo && (
        <button onClick={onUndo} style={{
          color: 'var(--accent)', fontWeight: 500, fontSize: 13, padding: '2px 4px',
        }}>
          Undo
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  QuestionsDesktop, QuestionsMobile,
  QUESTIONS, DECKS, DECK_BY_ID,
  ToastWithUndo, Kebab,
});
