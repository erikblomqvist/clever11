-- Seed per-deck themes for the redesigned setup deck-grid (fan/stack cards).
--
-- The old deck `css` blobs targeted the previous `.deck-card--selected` markup,
-- which no longer exists. These blobs target the new grid markup: a selected
-- card is `.deck.is-selected[data-deck-id="…"]`, themed via `.deck__face`,
-- `.deck__icon`, `.deck__name`, and the `--accent` custom property (drives the
-- fanned cards + check badge).
--
-- Each block is scoped to its own deck by substituting the row's id for the
-- `__ID__` placeholder, so we don't need the UUIDs up front. Decks are matched
-- by name (the values shipped with the design mockup); a name that doesn't
-- match simply updates zero rows.

-- 00-talet — Y2K iridescent chrome border
update public.decks set css = replace($css$@property --y2k-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
@keyframes y2k-spin {
  to {
    --y2k-angle: 360deg;
  }
}
.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(82% 0.14 320);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border: 2px solid transparent;
  background:
    linear-gradient(
        var(--palette-purple-dark),
        var(--palette-purple-dark)
      )
      padding-box,
    conic-gradient(
        from var(--y2k-angle),
        oklch(78% 0.18 320),
        oklch(82% 0.16 220),
        oklch(86% 0.16 160),
        oklch(85% 0.18 80),
        oklch(78% 0.18 320)
      )
      border-box;
  animation: y2k-spin 6s linear infinite;
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(92% 0.05 320);
  filter: drop-shadow(0 0 6px oklch(80% 0.18 320 / 0.55));
}
@media (prefers-reduced-motion: reduce) {
  .deck.is-selected[data-deck-id="__ID__"] .deck__face {
    animation: none;
  }
}$css$, '__ID__', id::text) where name = '00-talet';

-- 80-talet — Memphis three-stripe sleeve
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(70% 0.22 0);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(32% 0.08 290);
  background: linear-gradient(
    180deg,
    oklch(20% 0.08 290),
    oklch(12% 0.06 275)
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0.5rem;
  background: linear-gradient(
    180deg,
    oklch(70% 0.22 0) 0 33.33%,
    oklch(86% 0.18 95) 33.33% 66.66%,
    oklch(78% 0.14 200) 66.66% 100%
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(86% 0.18 95);
}$css$, '__ID__', id::text) where name = '80-talet';

-- 90-talet — synthwave neon
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(72% 0.22 330);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(72% 0.22 330);
  background: linear-gradient(
    180deg,
    oklch(18% 0.08 320),
    oklch(10% 0.06 260)
  );
  box-shadow:
    0 0 0 1px oklch(72% 0.22 330 / 0.4),
    0 0 22px -2px oklch(72% 0.22 330 / 0.45),
    0 18px 30px -16px oklch(5% 0.06 280 / 0.85);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    oklch(100% 0 0 / 0) 0px,
    oklch(100% 0 0 / 0) 3px,
    oklch(82% 0.18 220 / 0.06) 3px,
    oklch(82% 0.18 220 / 0.06) 4px
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(85% 0.22 330);
  filter: drop-shadow(0 0 8px oklch(72% 0.22 330 / 0.65));
}
.deck.is-selected[data-deck-id="__ID__"] .deck__name {
  text-shadow: 0 0 12px oklch(78% 0.18 330 / 0.5);
}$css$, '__ID__', id::text) where name = '90-talet';

-- Frågekort 1 / 2 / 4 — purple gradient (layers)
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(63% 0.14 295);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: var(--palette-purple-light);
  background: linear-gradient(
    180deg,
    lch(33% 73 308),
    var(--palette-purple-mid)
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(88% 0.08 295);
}$css$, '__ID__', id::text) where name in ('Frågekort 1', 'Frågekort 2', 'Frågekort 4');

-- Historia — aged parchment
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(60% 0.12 60);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(58% 0.1 65);
  color: oklch(28% 0.06 60);
  background: radial-gradient(
    120% 90% at 0% 0%,
    oklch(94% 0.05 85),
    oklch(88% 0.07 75) 45%,
    oklch(80% 0.09 65)
  );
  box-shadow:
    inset 0 0 30px oklch(55% 0.12 50 / 0.35),
    inset 0 0 0 1px oklch(72% 0.09 70 / 0.6),
    0 18px 30px -16px oklch(20% 0.05 60 / 0.6);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  background:
    radial-gradient(
      circle at 22% 28%,
      oklch(45% 0.1 50 / 0.22),
      transparent 14%
    ),
    radial-gradient(
      circle at 78% 72%,
      oklch(45% 0.1 50 / 0.16),
      transparent 16%
    );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__name {
  font-family: 'IM Fell English SC', serif;
  letter-spacing: 0.02em;
  color: oklch(28% 0.06 60);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(38% 0.1 55);
}$css$, '__ID__', id::text) where name = 'Historia';

-- Huma — navy pinstripe + gold (briefcase)
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(80% 0.13 85);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(78% 0.13 85);
  color: oklch(94% 0.04 85);
  background:
    repeating-linear-gradient(
      90deg,
      oklch(100% 0 0 / 0) 0px,
      oklch(100% 0 0 / 0) 11px,
      oklch(100% 0 0 / 0.06) 11px,
      oklch(100% 0 0 / 0.06) 12px
    ),
    linear-gradient(
      180deg,
      oklch(22% 0.05 255),
      oklch(14% 0.04 255)
    );
  box-shadow:
    inset 0 1px 0 oklch(78% 0.13 85 / 0.25),
    inset 0 0 0 1px oklch(78% 0.13 85 / 0.15),
    0 18px 30px -16px oklch(10% 0.04 255 / 0.7);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(82% 0.13 85);
  filter: drop-shadow(0 0 4px oklch(75% 0.14 85 / 0.5));
}$css$, '__ID__', id::text) where name = 'Huma';

-- Underhållning — red velvet spotlight (drama)
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(65% 0.18 30);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(65% 0.16 25);
  color: oklch(95% 0.06 50);
  background:
    radial-gradient(
      120% 110% at 100% 0%,
      oklch(70% 0.18 30 / 0.55),
      transparent 50%
    ),
    linear-gradient(
      180deg,
      oklch(28% 0.16 22),
      oklch(18% 0.13 18)
    );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background: repeating-linear-gradient(
    90deg,
    oklch(100% 0 0 / 0) 0px,
    oklch(100% 0 0 / 0) 6px,
    oklch(30% 0.16 20 / 0.35) 6px,
    oklch(30% 0.16 20 / 0.35) 7px
  );
  mask: linear-gradient(180deg, transparent, #000 30%, #000);
  -webkit-mask: linear-gradient(
    180deg,
    transparent,
    #000 30%,
    #000
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(85% 0.16 60);
  filter: drop-shadow(0 0 8px oklch(75% 0.18 40 / 0.7));
}$css$, '__ID__', id::text) where name = 'Underhållning';

-- Mat & Vin — burgundy & gold (wine)
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(80% 0.13 85);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(80% 0.13 85);
  color: oklch(94% 0.04 85);
  background:
    radial-gradient(
      140% 120% at 100% 0%,
      oklch(42% 0.17 16 / 0.65),
      transparent 55%
    ),
    linear-gradient(
      180deg,
      oklch(26% 0.14 14),
      oklch(14% 0.1 12)
    );
  box-shadow:
    inset 0 0 0 1px oklch(80% 0.13 85 / 0.3),
    0 18px 30px -16px oklch(14% 0.1 14 / 0.7);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(80% 0.13 85);
  filter: drop-shadow(0 0 5px oklch(78% 0.13 85 / 0.5));
}$css$, '__ID__', id::text) where name = 'Mat & Vin';

-- Musik — vinyl grooves (music)
update public.decks set css = replace($css$.deck.is-selected[data-deck-id="__ID__"] {
  --accent: oklch(78% 0.14 200);
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face {
  border-color: oklch(58% 0.12 235);
  background: linear-gradient(
    180deg,
    oklch(22% 0.08 252),
    oklch(12% 0.06 246)
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__face::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-radial-gradient(
    circle at 50% 38%,
    transparent 0 5px,
    oklch(100% 0 0 / 0.06) 5px 6px
  );
  mask: radial-gradient(
    circle at 50% 38%,
    #000 0,
    #000 60px,
    transparent 110px
  );
  -webkit-mask: radial-gradient(
    circle at 50% 38%,
    #000 0,
    #000 60px,
    transparent 110px
  );
}
.deck.is-selected[data-deck-id="__ID__"] .deck__icon {
  color: oklch(82% 0.13 200);
  filter: drop-shadow(0 0 6px oklch(80% 0.13 200 / 0.55));
}$css$, '__ID__', id::text) where name = 'Musik';
