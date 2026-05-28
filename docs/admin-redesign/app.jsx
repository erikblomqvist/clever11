// Clever 11 Admin — top-level App
// Design canvas with four artboards: Desktop Login, Desktop Dashboard, Mobile Login, Mobile Dashboard.
// Each artboard is its own mini-prototype with independent state — clickable + navigable.

const { useState: useStateA, useEffect: useEffectA } = React;

// Mini app — encapsulates login/dashboard/questions/editor/decks navigation within one artboard.
function MiniApp({ start = 'login', viewport = 'desktop', startQuestionN = null, startDeckId = null, startDeckTab = 'look' }) {
  const [screen, setScreen] = useStateA(start);
  const [editorQ, setEditorQ] = useStateA(startQuestionN);
  const [deckId, setDeckId]   = useStateA(startDeckId);
  const [cmdkOpen, setCmdkOpen] = useStateA(false);
  const [drawerOpen, setDrawerOpen] = useStateA(false);
  const [toast, setToast] = useStateA('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  // ⌘K within an artboard
  useEffectA(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (screen !== 'login') setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  const onNavigate = (id) => {
    if (id === 'dashboard')      setScreen('dashboard');
    else if (id === 'questions') setScreen('questions');
    else if (id === 'decks')     setScreen('decks');
    else if (id === 'import')    setScreen('import');
    else showToast(`route: /admin/${id} — coming in the next pass`);
  };

  const onOpenEditor = (id) => {
    setEditorQ(id);
    setScreen('editor');
  };
  const onBackFromEditor = () => setScreen('questions');
  const onOpenDeck = (id) => { setDeckId(id); setScreen('deck-form'); };
  const onNewDeck = () => { setDeckId('new'); setScreen('deck-form'); };
  const onBackFromDeck = () => setScreen('decks');

  const onSignIn = () => {
    setScreen('dashboard');
    setTimeout(() => showToast('Signed in.'), 100);
  };
  const onSignOut = () => {
    setScreen('login');
    setCmdkOpen(false);
    setDrawerOpen(false);
  };

  const activeNav =
    screen === 'editor' ? 'questions' :
    screen === 'deck-form' ? 'decks' :
    screen;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {screen === 'login' && (
        <LoginScreen onSignIn={onSignIn} viewport={viewport} />
      )}
      {screen === 'dashboard' && viewport === 'desktop' && (
        <DashboardDesktop
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
        />
      )}
      {screen === 'dashboard' && viewport === 'mobile' && (
        <DashboardMobile
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      )}
      {screen === 'questions' && viewport === 'desktop' && (
        <QuestionsDesktop
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenEditor={onOpenEditor}
        />
      )}
      {screen === 'questions' && viewport === 'mobile' && (
        <QuestionsMobile
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenEditor={onOpenEditor}
        />
      )}
      {screen === 'editor' && viewport === 'desktop' && (
        <EditorDesktop
          questionN={editorQ}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onBack={onBackFromEditor}
        />
      )}
      {screen === 'editor' && viewport === 'mobile' && (
        <EditorMobile
          questionN={editorQ}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          onBack={onBackFromEditor}
        />
      )}
      {screen === 'decks' && viewport === 'desktop' && (
        <DecksDesktop
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDeck={onOpenDeck}
          onNewDeck={onNewDeck}
        />
      )}
      {screen === 'decks' && viewport === 'mobile' && (
        <DecksMobile
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenDeck={onOpenDeck}
          onNewDeck={onNewDeck}
        />
      )}
      {screen === 'import' && viewport === 'desktop' && (
        <ImportDesktop
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenEditor={onOpenEditor}
        />
      )}
      {screen === 'import' && viewport === 'mobile' && (
        <ImportMobile
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenEditor={onOpenEditor}
        />
      )}
      {screen === 'deck-form' && viewport === 'desktop' && (
        <DeckFormDesktop
          deckId={deckId}
          startTab={startDeckTab}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onBack={onBackFromDeck}
        />
      )}
      {screen === 'deck-form' && viewport === 'mobile' && (
        <DeckFormMobile
          deckId={deckId}
          startTab={startDeckTab}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          onBack={onBackFromDeck}
        />
      )}
      <CmdK open={cmdkOpen} onClose={() => setCmdkOpen(false)} onNavigate={onNavigate} />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        active={activeNav}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
      <Toast toast={toast} />
    </div>
  );
}

// Wrap the chrome around it
function DesktopArtboard({ start, startQuestionN, startDeckId, startDeckTab }) {
  return (
    <div className="c11" style={{ width: 1280, height: 820 }}>
      <ChromeWindow
        tabs={[
          { title: 'Clever 11 · admin', active: true },
          { title: 'Supabase' },
          { title: 'Lucide icons' },
        ]}
        activeIndex={0}
        url="clever11.app/admin"
        width={1280}
        height={820}
      >
        <div style={{ width: '100%', height: '100%', background: 'var(--bg)' }}>
          <MiniApp start={start} viewport="desktop" startQuestionN={startQuestionN} startDeckId={startDeckId} startDeckTab={startDeckTab} />
        </div>
      </ChromeWindow>
    </div>
  );
}

function MobileArtboard({ start, startQuestionN, startDeckId, startDeckTab }) {
  return (
    <div style={{ width: 402, height: 874 }}>
      <IOSDevice width={402} height={874} dark={true} title=" ">
        <div className="c11" style={{ width: '100%', height: '100%', background: 'var(--bg)' }}>
          <MiniApp start={start} viewport="mobile" startQuestionN={startQuestionN} startDeckId={startDeckId} startDeckTab={startDeckTab} />
        </div>
      </IOSDevice>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Annotation note components — sits next to artboards on the canvas
// ─────────────────────────────────────────────────────────────
function CanvasNote({ title, bullets, top, left, right, width = 220 }) {
  return (
    <div style={{
      position: 'absolute', top, left, right, width,
      padding: '14px 14px 12px',
      background: 'rgba(15,15,18,0.7)',
      border: '1px solid rgba(212,255,58,0.18)',
      borderRadius: 8,
      fontFamily: 'var(--font-sans)',
      color: 'var(--fg)',
      backdropFilter: 'blur(6px)',
    }}>
      <div className="bracket" style={{ marginBottom: 8, color: 'var(--accent)' }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.55, color: 'var(--fg-mute)' }}>
        {bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root — Design canvas with all artboards
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <DesignCanvas>
      <DCSection id="header" title="Clever 11 · admin redesign" subtitle="Pass 05 — Bulk import from photos. Per-card states, low-confidence-only pills, inline mini editor, Save-all-ready with batch progress.">
        <DCArtboard id="system" label="System notes" width={760} height={460}>
          <SystemNotesCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="desktop" title="Desktop · ≥1280px" subtitle="Live prototype — nav between routes via sidebar, ⌘K, or by clicking rows.">
        <DCArtboard id="desktop-login" label="01 · Login" width={1280} height={820}>
          <DesktopArtboard start="login" />
        </DCArtboard>
        <DCArtboard id="desktop-dashboard" label="02 · Dashboard" width={1280} height={820}>
          <DesktopArtboard start="dashboard" />
        </DCArtboard>
        <DCArtboard id="desktop-questions" label="03 · Questions list" width={1280} height={820}>
          <DesktopArtboard start="questions" />
        </DCArtboard>
        <DCArtboard id="desktop-editor-std" label="04 · Editor · standard" width={1280} height={820}>
          <DesktopArtboard start="editor" startQuestionN={214} />
        </DCArtboard>
        <DCArtboard id="desktop-editor-rank" label="04b · Editor · rank" width={1280} height={820}>
          <DesktopArtboard start="editor" startQuestionN={212} />
        </DCArtboard>
        <DCArtboard id="desktop-editor-colors" label="04c · Editor · colors (image mode)" width={1280} height={820}>
          <DesktopArtboard start="editor" startQuestionN={210} />
        </DCArtboard>
        <DCArtboard id="desktop-decks" label="05 · Decks list" width={1280} height={820}>
          <DesktopArtboard start="decks" />
        </DCArtboard>
        <DCArtboard id="desktop-deck-form" label="06 · Deck form · Look" width={1280} height={820}>
          <DesktopArtboard start="deck-form" startDeckId="90talet" />
        </DCArtboard>
        <DCArtboard id="desktop-deck-form-css" label="06b · Deck form · Custom CSS" width={1280} height={820}>
          <DesktopArtboard start="deck-form" startDeckId="90talet" startDeckTab="css" />
        </DCArtboard>
        <DCArtboard id="desktop-import" label="07 · Import from photos" width={1280} height={820}>
          <DesktopArtboard start="import" />
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobile · 375–414px" subtitle="Sidebar collapses to a drawer. Same nav graph.">
        <DCArtboard id="mobile-login" label="01 · Login" width={402} height={874}>
          <MobileArtboard start="login" />
        </DCArtboard>
        <DCArtboard id="mobile-dashboard" label="02 · Dashboard" width={402} height={874}>
          <MobileArtboard start="dashboard" />
        </DCArtboard>
        <DCArtboard id="mobile-questions" label="03 · Questions list" width={402} height={874}>
          <MobileArtboard start="questions" />
        </DCArtboard>
        <DCArtboard id="mobile-editor" label="04 · Editor" width={402} height={874}>
          <MobileArtboard start="editor" startQuestionN={214} />
        </DCArtboard>
        <DCArtboard id="mobile-decks" label="05 · Decks list" width={402} height={874}>
          <MobileArtboard start="decks" />
        </DCArtboard>
        <DCArtboard id="mobile-deck-form" label="06 · Deck form" width={402} height={874}>
          <MobileArtboard start="deck-form" startDeckId="90talet" />
        </DCArtboard>
        <DCArtboard id="mobile-import" label="07 · Import from photos" width={402} height={874}>
          <MobileArtboard start="import" />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

function SystemNotesCard() {
  return (
    <div className="c11" style={{
      width: 760, height: 460,
      background: 'var(--bg)', padding: 30,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
      borderRadius: 8,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Aesthetic</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Industrial, quietly.
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-mute)', lineHeight: 1.55 }}>
            Tight grid. Hairline borders. Numbers in mono. Sans elsewhere. The player game is dark, playful, retro — admin is the same set, just calmer. No LEDs, no build hashes, no “system online” theatre.
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TypeRow label="Geist · display" sample="Good morning, Jonas." size={20} weight={600} />
            <TypeRow label="Geist · body"    sample="487 published, 12 archived" size={13.5} weight={400} mute />
            <TypeRow label="JetBrains Mono"  sample="#214 · 1,247 · +18" size={13} weight={500} mono />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Palette</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            <Swatch color="#0a0a0c" label="bg/2" />
            <Swatch color="#0f0f12" label="bg" />
            <Swatch color="#16161a" label="surf" />
            <Swatch color="#24242b" label="brdr" />
            <Swatch color="#9a9a9a" label="mute" />
            <Swatch color="#e8e6df" label="fg" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <AccentSwatch color="#d4ff3a" name="Lime"  role="Primary action · Active state · Decks" />
            <AccentSwatch color="#ff7a59" name="Coral" role="Flagged · Highlight · Questions" dark />
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>This pass</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Sidebar', 'Top bar', 'Entry card', '⌘K palette', 'Drawer', 'Input', 'Button', 'Pill', 'Activity row', 'Toast'].map((t) => (
              <span key={t} className="pill" style={{ background: 'var(--surface)' }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', marginTop: 12, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Next:</strong> Questions list + filter bar. Then the editor (master/detail).
          </div>
        </div>
      </div>
    </div>
  );
}

function AccentSwatch({ color, name, role, dark }) {
  return (
    <div style={{
      borderRadius: 6, border: '1px solid var(--border)',
      padding: 10, display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--surface)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 5, background: color,
        display: 'grid', placeItems: 'center',
        color: dark ? '#2a0d05' : '#0a0a0c', fontWeight: 700, fontSize: 12,
        fontFamily: 'var(--font-mono)',
      }}>Aa</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>{role}</div>
      </div>
    </div>
  );
}

function TypeRow({ label, sample, size, weight, mute, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-faint)', width: 130, flex: '0 0 130px', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: size, fontWeight: weight,
        color: mute ? 'var(--fg-mute)' : 'var(--fg)',
        letterSpacing: weight >= 600 ? '-0.02em' : 0,
      }}>{sample}</span>
    </div>
  );
}

function Swatch({ color, label, tone = 'light' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        height: 42, borderRadius: 4,
        background: color,
        border: '1px solid var(--border)',
      }} />
      <div className="mono" style={{ fontSize: 9.5, color: 'var(--fg-faint)', letterSpacing: '0.04em' }}>
        {label}<br />
        <span style={{ color: 'var(--fg-faint)', opacity: 0.7 }}>{color}</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
