// Clever 11 Admin — Decks list + Decks form
//   Desktop: table; mobile: cards
//   Form: top live preview, tabs (Look | Custom CSS), inline icon picker

const { useState: useStateD, useEffect: useEffectD, useMemo: useMemoD, useRef: useRefD } = React;

// ─────────────────────────────────────────────────────────────
// Icon set — Lucide-flavored subset; 1.6px stroke @ 24×24
// ─────────────────────────────────────────────────────────────
const D_ICONS = (() => {
  const make = (paths) => (props) => (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth={props.sw ?? 1.6}
         strokeLinecap="round" strokeLinejoin="round" style={props.style}>
      {paths}
    </svg>
  );
  return {
    book:       make(<><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h13"/></>),
    music:      make(<><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="16" r="2.2"/><path d="M8 18V6l12-2v12"/></>),
    film:       make(<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></>),
    globe:      make(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></>),
    flag:       make(<><path d="M5 4v17"/><path d="M5 5h12l-2 4 2 4H5"/></>),
    gamepad:    make(<><rect x="3" y="8" width="18" height="10" rx="3"/><path d="M8 13h-2M7 12v2M16 12.5h.01M18 14.5h.01"/></>),
    palette:    make(<><path d="M12 21a9 9 0 1 1 9-9c0 3-2 4-4 4h-2a2 2 0 0 0 0 4 2 2 0 0 1-2 2z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10.5" cy="7.5" r=".8"/><circle cx="14.5" cy="7.5" r=".8"/><circle cx="17.5" cy="11" r=".8"/></>),
    brain:      make(<><path d="M9 4a3 3 0 0 1 3-1 3 3 0 0 1 3 1 3 3 0 0 1 3 4 3 3 0 0 1 0 4 3 3 0 0 1-1 5 3 3 0 0 1-5 1 3 3 0 0 1-5-1 3 3 0 0 1-1-5 3 3 0 0 1 0-4 3 3 0 0 1 3-4z"/><path d="M12 6v12"/></>),
    car:        make(<><path d="M4 14l1.5-5.5A2 2 0 0 1 7.5 7h9a2 2 0 0 1 2 1.5L20 14M4 14h16v4H4z"/><circle cx="7.5" cy="17.5" r="1.2"/><circle cx="16.5" cy="17.5" r="1.2"/></>),
    plane:      make(<><path d="M21 12l-9 4-2-3-3-1 4-2L21 4l-2 5 2 3z"/></>),
    cpu:        make(<><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3"/></>),
    cup:        make(<><path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/><path d="M9 5l-1 2M12 5l-1 2M15 5l-1 2"/></>),
    star:       make(<><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.5l6.3-.9z"/></>),
    cards:      make(<><rect x="4" y="6" width="14" height="14" rx="2" transform="rotate(-6 11 13)"/><rect x="6" y="4" width="14" height="14" rx="2"/></>),
    medal:      make(<><circle cx="12" cy="15" r="5"/><path d="M9 4l3 5 3-5M9 4H5l3 5M15 4h4l-3 5"/></>),
    leaf:       make(<><path d="M4 20c0-9 7-16 16-16-1 9-7 15-16 16z"/><path d="M4 20c4-4 8-8 12-12"/></>),
    paw:        make(<><circle cx="6" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><circle cx="18" cy="9" r="1.6"/><path d="M12 12c-3 0-6 3-6 6 0 1.5 1 2 2 2 2 0 2-1 4-1s2 1 4 1c1 0 2-.5 2-2 0-3-3-6-6-6z"/></>),
    skull:      make(<><path d="M5 11a7 7 0 1 1 14 0c0 3-2 5-3 6v3H8v-3c-1-1-3-3-3-6z"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/></>),
    bolt:       make(<><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></>),
    smile:      make(<><circle cx="12" cy="12" r="9"/><path d="M8.5 14a5 5 0 0 0 7 0"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></>),
    flame:      make(<><path d="M12 3c1 3 4 5 4 9a4 4 0 1 1-8 0c0-3 2-5 2-7 1 1 2 0 2-2z"/></>),
    crown:      make(<><path d="M3 8l4 4 5-6 5 6 4-4v10H3z"/><path d="M3 19h18"/></>),
    rocket:     make(<><path d="M14 4c5 0 6 5 6 6-3 0-3 0-3 0l-7 7-3-1-1-3 7-7s0-0 0 0c0 0 0-2 1-2z"/><path d="M7 14l-3 6 6-3"/></>),
    sun:        make(<><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2"/></>),
    map:        make(<><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v16M15 6v16"/></>),
    target:     make(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>),
    feather:    make(<><path d="M19 5c2 5-1 11-6 13l-7 1 1-7c2-5 8-8 12-7z"/><path d="M16 8l-9 9M11 13h5"/></>),
    pen:        make(<><path d="M4 20h4l12-12-4-4L4 16z"/><path d="m14 6 4 4"/></>),
    droplet:    make(<><path d="M12 3c4 6 7 9 7 12a7 7 0 1 1-14 0c0-3 3-6 7-12z"/></>),
    moon:       make(<><path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z"/></>),
    coffee:     make(<><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/></>),
    home:       make(<><path d="m3 11 9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/></>),
    box:        make(<><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4M21 7v10l-9 4M12 11v10"/></>),
    flask:      make(<><path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3"/><path d="M8 3h8"/></>),
  };
})();

const D_ICON_KEYS = Object.keys(D_ICONS);

// ─────────────────────────────────────────────────────────────
// Mock decks
// ─────────────────────────────────────────────────────────────
const MOCK_DECKS = [
  { id: 'allmanbildning', name: 'Allmänbildning', desc: 'Klassiska frågor från alla områden.',         icon: 'brain',     image: null,                        questions: 87, edited: '2 days ago' },
  { id: 'historia',       name: 'Historia',       desc: 'Från antiken till modern tid.',               icon: 'book',      image: null,                        questions: 64, edited: '5 days ago' },
  { id: 'sport',          name: 'Sport',          desc: 'Allt från fotboll till curling.',             icon: 'medal',     image: null,                        questions: 52, edited: '1 week ago' },
  { id: 'filmcitat',      name: 'Filmcitat',      desc: 'Hör citatet, gissa filmen.',                  icon: 'film',      image: 'hsl(200 60% 35%)',          questions: 48, edited: '3 hrs ago' },
  { id: 'farger',         name: 'Färger',         desc: 'Visuella färgmatchningsfrågor.',              icon: 'palette',   image: null,                        questions: 31, edited: '12 days ago' },
  { id: '90talet',        name: '90-talet',       desc: 'Spel, musik och mode från 90-talet.',         icon: 'gamepad',   image: 'hsl(320 55% 40%)',          questions: 42, edited: '2 hrs ago' },
  { id: 'musik',          name: 'Musik',          desc: 'Artister, låttitlar, hits.',                  icon: 'music',     image: null,                        questions: 56, edited: '6 days ago' },
  { id: 'geografi',       name: 'Geografi',       desc: 'Huvudstäder, länder, kartor.',                icon: 'globe',     image: null,                        questions: 47, edited: '4 days ago' },
  { id: '80talet',        name: '80-talet',       desc: 'Synthwave, Reagan, Top Gun.',                 icon: 'cassette',  image: 'hsl(280 50% 35%)',          questions: 28, edited: '3 weeks ago' },
  { id: 'matdryck',       name: 'Mat & dryck',    desc: 'Köksklassiker och drinkar.',                  icon: 'coffee',    image: null,                        questions: 24, edited: '1 week ago' },
  { id: 'vetenskap',      name: 'Vetenskap',      desc: 'Fysik, kemi, biologi.',                       icon: 'flask',     image: null,                        questions: 38, edited: '5 days ago' },
  { id: 'konst',          name: 'Konst',          desc: 'Måleri, skulptur, arkitektur.',               icon: 'pen',       image: null,                        questions: 19, edited: '2 weeks ago' },
  { id: 'litteratur',     name: 'Litteratur',     desc: 'Författare, böcker, citat.',                  icon: 'feather',   image: null,                        questions: 22, edited: '11 days ago' },
  { id: 'djur',           name: 'Djur',           desc: 'Allt från ko till krokodil.',                 icon: 'paw',       image: null,                        questions: 35, edited: '8 days ago' },
  { id: 'bilar',          name: 'Bilar',          desc: 'Märken, modeller, motorer.',                  icon: 'car',       image: null,                        questions: 17, edited: '1 month ago' },
  { id: 'resor',          name: 'Resor',          desc: 'Städer, sevärdheter, kulturer.',              icon: 'plane',     image: 'hsl(195 70% 45%)',          questions: 26, edited: '6 days ago' },
  { id: 'tekniska',       name: 'Tekniska prylar',desc: 'Tech-historia och nutid.',                    icon: 'cpu',       image: null,                        questions: 15, edited: '3 days ago' },
  { id: 'klassiker',      name: 'Klassiker',      desc: 'De självklara frågorna.',                     icon: 'star',      image: null,                        questions: 41, edited: '2 weeks ago' },
  { id: 'memes',          name: 'Memes',          desc: 'Internetkultur och virala ögonblick.',        icon: 'smile',     image: 'hsl(50 90% 55%)',           questions: 18, edited: '1 day ago' },
  { id: 'festfragor',     name: 'Festfrågor',     desc: 'Frågor som funkar med några öl i.',           icon: 'flame',     image: null,                        questions: 33, edited: '4 days ago' },
  { id: 'norden',         name: 'Norden',         desc: 'Sverige, Norge, Danmark, Finland, Island.',   icon: 'flag',      image: null,                        questions: 28, edited: '9 days ago' },
  { id: 'natur',          name: 'Natur',          desc: 'Berg, hav, växter.',                          icon: 'leaf',      image: null,                        questions: 21, edited: '2 weeks ago' },
  { id: 'mystik',         name: 'Mystik',         desc: 'Skrock, gåtor och spöken.',                   icon: 'skull',     image: null,                        questions: 14, edited: '3 weeks ago' },
  { id: 'energi',         name: 'Energi',         desc: 'Snabba snabbfrågor.',                         icon: 'bolt',      image: null,                        questions: 39, edited: '1 day ago' },
];

// ─────────────────────────────────────────────────────────────
// DeckBadge — icon/image circle used in list + form preview
// ─────────────────────────────────────────────────────────────
function DeckBadge({ deck, size = 44 }) {
  const Ic = D_ICONS[deck.icon] || D_ICONS.box;
  if (deck.image) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 'var(--r-2)',
        background: deck.image, backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid var(--border-strong)',
        flex: `0 0 ${size}px`,
        position: 'relative',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          color: '#fff', mixBlendMode: 'overlay',
        }}>
          <Ic size={Math.round(size * 0.45)} />
        </div>
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--r-2)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      display: 'grid', placeItems: 'center',
      color: 'var(--fg-mute)',
      flex: `0 0 ${size}px`,
    }}>
      <Ic size={Math.round(size * 0.5)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DECKS LIST — desktop
// ─────────────────────────────────────────────────────────────
function DecksDesktop({ onNavigate, onSignOut, onOpenCmdK, onOpenDeck, onNewDeck }) {
  const [search, setSearch] = useStateD('');
  const [data] = useStateD(MOCK_DECKS);
  const filtered = useMemoD(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter((d) => d.name.toLowerCase().includes(s) || d.desc.toLowerCase().includes(s));
  }, [data, search]);

  return (
    <div className="c11" data-screen-label="Decks (desktop)" style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', position: 'relative',
    }}>
      <Sidebar active="decks" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar path="/admin/decks" title="Decks" actions={
          <button className="btn btn--primary" onClick={onNewDeck}>
            <I.plus size={14} />New deck
          </button>
        } />

        <div style={{ padding: '22px 32px 0' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Decks
          </h1>
          <p style={{ margin: '4px 0 18px', fontSize: 13, color: 'var(--fg-mute)' }}>
            Themed collections that players draw cards from. <span className="mono" style={{ color: 'var(--fg)' }}>{data.length}</span> decks · <span className="mono" style={{ color: 'var(--fg)' }}>{data.reduce((s, d) => s + d.questions, 0)}</span> total cards.
          </p>
        </div>

        {/* Filter / search bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
          padding: '14px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div className="input" style={{
            flex: '1 1 220px', maxWidth: 360, height: 36, padding: '0 12px',
          }}>
            <I.search size={14} style={{ color: 'var(--fg-faint)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search decks…"
              style={{ background: 'transparent', border: 0, outline: 'none', color: 'var(--fg)', width: '100%', fontSize: 13.5 }} />
            {search && <button onClick={() => setSearch('')} style={{ color: 'var(--fg-faint)', display: 'grid', placeItems: 'center' }}><I.close size={12} /></button>}
          </div>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>
            <span style={{ color: 'var(--fg)' }}>{filtered.length}</span> / {data.length}
          </span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* Header */}
          <div role="row" style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr 120px 120px 80px',
            padding: '0 22px', height: 36,
            alignItems: 'center', gap: 16,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-2)',
            position: 'sticky', top: 0, zIndex: 5,
          }}>
            <span />
            <span style={headerStyle}>Deck</span>
            <span style={headerStyle}>Cards</span>
            <span style={headerStyle}>Edited</span>
            <span />
          </div>
          {filtered.map((deck) => (
            <div key={deck.id} role="row" onClick={() => onOpenDeck(deck.id)} style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr 120px 120px 80px',
              padding: '0 22px', minHeight: 62,
              alignItems: 'center', gap: 16,
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <DeckBadge deck={deck} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{deck.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deck.desc}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 13, color: 'var(--fg)' }}>{deck.questions}</span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-mute)' }}>{deck.edited}</span>
              <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <IconButton icon={I.edit} label="Edit" onClick={() => onOpenDeck(deck.id)} />
                <DropdownMenu
                  trigger={<IconButton icon={Kebab} label="More" />}
                  items={[
                    { label: 'Open',      icon: I.edit,    onClick: () => onOpenDeck(deck.id) },
                    { label: 'Duplicate', icon: I.cards,   onClick: () => {} },
                    { separator: true },
                    { label: 'Archive',   icon: I.archive, danger: true, onClick: () => {} },
                  ]}
                />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon={I.search} title="No decks match." body="Clear the search to see all." />
          )}
        </div>
      </main>
    </div>
  );
}
const headerStyle = { fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' };

// ─────────────────────────────────────────────────────────────
// DECKS LIST — mobile
// ─────────────────────────────────────────────────────────────
function DecksMobile({ onNavigate, onSignOut, onOpenCmdK, onOpenDrawer, onOpenDeck, onNewDeck }) {
  const [search, setSearch] = useStateD('');
  const data = MOCK_DECKS;
  const filtered = useMemoD(() => search ? data.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : data, [search]);
  return (
    <div className="c11" data-screen-label="Decks (mobile)" style={{
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>Decks</div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{data.length} decks</div>
        </div>
        <button onClick={onNewDeck} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--accent)', color: 'var(--accent-fg)',
          display: 'grid', placeItems: 'center',
        }}><I.plus size={16} /></button>
      </header>

      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <div className="input" style={{ height: 40 }}>
          <I.search size={14} style={{ color: 'var(--fg-faint)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search decks…" />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((deck) => (
          <button key={deck.id} onClick={() => onOpenDeck(deck.id)} className="card card--hover" style={{
            padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          }}>
            <DeckBadge deck={deck} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{deck.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 16, color: 'var(--fg)' }}>{deck.questions}</div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>cards</div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <EmptyState icon={I.search} title="No matches." />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DECK FORM — shared state hook
// ─────────────────────────────────────────────────────────────
const SAMPLE_CSS = `[data-deck-id] {
  background:
    linear-gradient(160deg, #2a1a3d 0%, #0f0f12 70%);
  color: #f0eee6;
}

[data-deck-id] .deck-card--selected {
  outline: 2px solid #d4ff3a;
  outline-offset: -4px;
}

[data-deck-id]:hover {
  transform: translateY(-2px);
  transition: transform 160ms ease;
}`;

function useDeckFormState(deckId) {
  const initial = useMemoD(() => {
    if (deckId === 'new' || !deckId) {
      return { id: null, name: '', desc: '', icon: 'box', image: null, css: '', questions: 0, edited: 'just now' };
    }
    const found = MOCK_DECKS.find((d) => d.id === deckId) || MOCK_DECKS[0];
    return { ...found, css: deckId === '90talet' ? SAMPLE_CSS : '' };
  }, [deckId]);
  const [d, setD] = useStateD(initial);
  const [dirty, setDirty] = useStateD(false);
  const [confirmDiscard, setConfirmDiscard] = useStateD(false);
  const [toast, setToast] = useStateD(null);
  const update = (patch) => { setD((prev) => ({ ...prev, ...patch })); setDirty(true); };
  const save = () => { setDirty(false); setToast({ text: deckId === 'new' ? 'Deck created.' : `Saved "${d.name}".` }); setTimeout(() => setToast(null), 2400); };
  const discard = () => setConfirmDiscard(true);
  const confirmDiscardYes = () => { setD(initial); setDirty(false); setConfirmDiscard(false); };
  return { d, update, dirty, save, discard, confirmDiscard, setConfirmDiscard, confirmDiscardYes, toast, isNew: deckId === 'new' };
}

// ─────────────────────────────────────────────────────────────
// IconPicker
// ─────────────────────────────────────────────────────────────
function IconPicker({ value, onChange }) {
  const [q, setQ] = useStateD('');
  const filtered = useMemoD(() => {
    const lc = q.toLowerCase();
    return D_ICON_KEYS.filter((k) => !q || k.includes(lc));
  }, [q]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="input" style={{ height: 34 }}>
        <I.search size={12} style={{ color: 'var(--fg-faint)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 1,200+ icons…" style={{ fontSize: 12.5 }} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>{filtered.length}</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 4,
        padding: 4,
        maxHeight: 240, overflow: 'auto',
        border: '1px solid var(--border)', borderRadius: 'var(--r-2)',
        background: 'var(--bg-2)',
      }}>
        {filtered.map((k) => {
          const Ic = D_ICONS[k];
          const active = value === k;
          return (
            <button key={k} onClick={() => onChange(k)} title={k} style={{
              aspectRatio: '1', display: 'grid', placeItems: 'center',
              background: active ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${active ? 'var(--border-accent)' : 'transparent'}`,
              borderRadius: 'var(--r-1)',
              color: active ? 'var(--accent)' : 'var(--fg-mute)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <Ic size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Live preview card — how the deck appears in the game
// ─────────────────────────────────────────────────────────────
function DeckPreview({ deck }) {
  const Ic = D_ICONS[deck.icon] || D_ICONS.box;
  return (
    <div style={{
      width: 200, height: 280,
      borderRadius: 'var(--r-3)',
      background: deck.image || 'linear-gradient(160deg, #1c1c21 0%, #0f0f12 70%)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      border: '1px solid var(--border-strong)',
      boxShadow: '0 20px 40px -16px rgba(0,0,0,0.7)',
      padding: 18,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      color: '#f0eee6', flex: '0 0 200px',
      position: 'relative', overflow: 'hidden',
    }}>
      {!deck.image && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(212,255,58,0.08), transparent 50%)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          display: 'grid', placeItems: 'center',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Ic size={22} />
        </div>
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)',
          padding: '3px 8px', borderRadius: 100,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {deck.questions || 0} kort
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {deck.name || 'Nytt deck'}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
          {deck.desc || 'Lägg till en beskrivning…'}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSS editor with fake syntax highlighting
// ─────────────────────────────────────────────────────────────
function CssEditor({ value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 200px',
      gap: 0, height: 360,
      border: '1px solid var(--border)', borderRadius: 'var(--r-2)',
      overflow: 'hidden',
      background: 'var(--bg-2)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          fontSize: 11.5, color: 'var(--fg-mute)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1DB954' }} />
          <span>styles.css</span>
          <span style={{ color: 'var(--fg-faint)' }}>· targets <span style={{ color: 'var(--fg)' }}>[data-deck-id]</span></span>
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--fg-faint)' }}>{(value || '').split('\n').length} lines</span>
        </div>
        {/* Editor */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 6px 12px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px',
            color: 'var(--fg-faint)', textAlign: 'right',
            userSelect: 'none', flex: '0 0 32px',
            background: 'var(--bg-2)',
          }}>
            {(value || ' ').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/* No custom CSS yet. Try one of the snippets on the right. */"
            spellCheck={false}
            style={{
              flex: 1, height: '100%',
              padding: '12px 14px',
              background: 'transparent',
              border: 0, outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: '20px',
              color: 'var(--fg)', resize: 'none',
            }}
          />
        </div>
      </div>
      {/* Snippets */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-2)',
      }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
          Snippets
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Gradient background', code: 'background: linear-gradient(160deg, #2a1a3d, #0f0f12);' },
            { label: 'Selected outline',    code: '.deck-card--selected { outline: 2px solid #d4ff3a; }' },
            { label: 'Hover lift',          code: ':hover { transform: translateY(-2px); transition: 160ms; }' },
            { label: 'Sample template',     code: SAMPLE_CSS },
          ].map((s) => (
            <button key={s.label} onClick={() => onChange((value ? value + '\n\n' : '') + s.code)} style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 'var(--r-1)',
              fontSize: 12, color: 'var(--fg)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <I.plus size={11} style={{ color: 'var(--fg-faint)', marginRight: 6 }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DECK FORM — desktop
// ─────────────────────────────────────────────────────────────
function DeckFormDesktop({ deckId, startTab = 'look', onNavigate, onSignOut, onOpenCmdK, onBack }) {
  const s = useDeckFormState(deckId);
  const [tab, setTab] = useStateD(startTab);

  return (
    <div className="c11" data-screen-label={`Deck form (desktop)${s.isNew ? ' · new' : ''}`} style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', position: 'relative',
    }}>
      <Sidebar active="decks" onNavigate={onNavigate} onSignOut={onSignOut} onOpenCmdK={onOpenCmdK} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Editor-style header */}
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
            <DeckBadge deck={s.d} size={32} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                /admin/decks/{s.isNew ? 'new' : s.d.id}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{s.d.name || (s.isNew ? 'New deck' : 'Untitled')}</div>
            </div>
          </div>
          {s.dirty && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />
              Unsaved changes
            </span>
          )}
          <button onClick={s.discard} disabled={!s.dirty} className="btn btn--ghost" style={{ opacity: s.dirty ? 1 : 0.5 }}>Discard</button>
          <button onClick={s.save} className="btn btn--primary"><I.bolt size={13} />{s.isNew ? 'Create' : 'Save'}</button>
        </header>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '24px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'flex-start' }}>
            {/* Left column: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
              {/* Basic fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
                <LabelledField label="Name">
                  <PlainInput value={s.d.name} onChange={(v) => s.update({ name: v })} placeholder="e.g. 90-talet" />
                </LabelledField>
                <LabelledField label="Description" optional>
                  <PlainInput value={s.d.desc} onChange={(v) => s.update({ desc: v })} placeholder="One-line summary" />
                </LabelledField>
              </div>

              {/* Tabs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
                  {[
                    { id: 'look', label: 'Look',       hint: 'Icon · Image' },
                    { id: 'css',  label: 'Custom CSS', hint: s.d.css ? 'Active' : 'None' },
                  ].map((t) => {
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '0 16px', height: 38,
                        color: active ? 'var(--fg)' : 'var(--fg-mute)',
                        fontSize: 13.5, fontWeight: 500,
                        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                        marginBottom: -1,
                      }}>
                        {t.label}
                        <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>{t.hint}</span>
                      </button>
                    );
                  })}
                  <span style={{ flex: 1 }} />
                  {tab === 'css' && (
                    <span style={{ fontSize: 11.5, color: 'var(--fg-faint)' }}>
                      Targets <span className="mono" style={{ color: 'var(--fg-mute)' }}>[data-deck-id]</span>, <span className="mono" style={{ color: 'var(--fg-mute)' }}>.deck-card--selected</span>, <span className="mono" style={{ color: 'var(--fg-mute)' }}>:hover</span>
                    </span>
                  )}
                </div>

                {tab === 'look' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                    <LabelledField label="Icon" hint="Lucide library">
                      <IconPicker value={s.d.icon} onChange={(v) => s.update({ icon: v })} />
                    </LabelledField>
                    <LabelledField label="Image" hint="Optional · JPEG/PNG/WebP · max 5MB" optional>
                      <ImageSlot
                        image={s.d.image}
                        onUpload={() => s.update({ image: s.d.image || 'hsl(280 50% 35%)' })}
                        onClear={() => s.update({ image: null })}
                        size="lg"
                      />
                      {s.d.image && (
                        <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', marginTop: 8 }}>
                          When set, image is shown on the card. Icon overlays at low opacity.
                        </div>
                      )}
                    </LabelledField>
                  </div>
                )}

                {tab === 'css' && <CssEditor value={s.d.css} onChange={(v) => s.update({ css: v })} />}
              </div>
            </div>

            {/* Right column: live preview */}
            <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Preview
              </div>
              <DeckPreview deck={s.d} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--fg-mute)', width: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cards</span>
                  <span className="mono" style={{ color: 'var(--fg)' }}>{s.d.questions || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last edited</span>
                  <span style={{ color: 'var(--fg)' }}>{s.d.edited || 'never'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Custom CSS</span>
                  <span className="mono" style={{ color: s.d.css ? 'var(--ok)' : 'var(--fg-faint)' }}>
                    {s.d.css ? `${s.d.css.split('\n').length} lines` : 'none'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={s.confirmDiscard}
          onClose={() => s.setConfirmDiscard(false)}
          title="Discard your changes?"
          description="Anything you've edited since opening this deck will be lost."
          danger
          confirmLabel="Discard"
          onConfirm={s.confirmDiscardYes}
        />
        <ToastWithUndo toast={s.toast} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DECK FORM — mobile
// ─────────────────────────────────────────────────────────────
function DeckFormMobile({ deckId, startTab = 'look', onNavigate, onSignOut, onOpenCmdK, onOpenDrawer, onBack }) {
  const s = useDeckFormState(deckId);
  const [tab, setTab] = useStateD(startTab);

  return (
    <div className="c11" data-screen-label={`Deck form (mobile)`} style={{
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
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 'var(--r-2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', color: 'var(--fg)',
        }}><I.caret size={14} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
            /admin/decks/{s.isNew ? 'new' : s.d.id}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.d.name || (s.isNew ? 'New deck' : 'Deck')}
          </div>
        </div>
        {s.dirty && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-2)' }} />}
        <button onClick={s.save} className="btn btn--primary btn--sm" style={{ height: 32 }}>{s.isNew ? 'Create' : 'Save'}</button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 16px 32px' }}>
        {/* Preview centered */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <DeckPreview deck={s.d} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LabelledField label="Name">
            <PlainInput value={s.d.name} onChange={(v) => s.update({ name: v })} placeholder="e.g. 90-talet" />
          </LabelledField>
          <LabelledField label="Description" optional>
            <PlainInput value={s.d.desc} onChange={(v) => s.update({ desc: v })} placeholder="One-line summary" />
          </LabelledField>

          {/* Tab segmented */}
          <div style={{
            display: 'inline-flex', height: 36, padding: 3,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-2)', width: '100%',
          }}>
            {['look', 'css'].map((t) => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, borderRadius: 'var(--r-1)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--fg)' : 'var(--fg-mute)',
                  fontSize: 13, fontWeight: 500,
                }}>
                  {t === 'look' ? 'Look' : 'Custom CSS'}
                </button>
              );
            })}
          </div>

          {tab === 'look' && (
            <>
              <LabelledField label="Icon" hint="Lucide library">
                <IconPicker value={s.d.icon} onChange={(v) => s.update({ icon: v })} />
              </LabelledField>
              <LabelledField label="Image" optional>
                <ImageSlot
                  image={s.d.image}
                  onUpload={() => s.update({ image: s.d.image || 'hsl(280 50% 35%)' })}
                  onClear={() => s.update({ image: null })}
                  size="lg"
                />
              </LabelledField>
            </>
          )}
          {tab === 'css' && (
            <CssEditor value={s.d.css} onChange={(v) => s.update({ css: v })} />
          )}
        </div>
      </div>

      <Dialog
        open={s.confirmDiscard}
        onClose={() => s.setConfirmDiscard(false)}
        title="Discard your changes?"
        description="Edits since opening this deck will be lost."
        danger
        confirmLabel="Discard"
        onConfirm={s.confirmDiscardYes}
      />
      <ToastWithUndo toast={s.toast} />
    </div>
  );
}

Object.assign(window, {
  DecksDesktop, DecksMobile, DeckFormDesktop, DeckFormMobile, MOCK_DECKS, D_ICONS,
});
