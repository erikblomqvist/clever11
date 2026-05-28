# Clever 11 — Admin redesign brief

A design brief for redesigning the admin portal of [Clever 11](https://clever11.app), a Swedish party trivia game. Paste this into a fresh Claude conversation to start the design work.

---

## 1. Context

**The product.** Clever 11 is a party trivia game played from a phone or browser. The game is localised (currently Swedish, English, Norwegian) but **all admin UI copy should be in English** — admins work in English regardless of the language of the questions they're managing. Players draw cards from themed _decks_; each card is a _question_ with exactly 10 _options_. Question types vary (standard, boolean, rank 1–10, "choose between", colors, numbers, century/decade) and each type changes what a "correct answer" looks like.

**The admin portal.** An internal tool — small audience (the product owner plus occasional collaborators). It's not customer-facing, but it's used often enough that it shouldn't feel like Django admin from 2008. The current version was built in a hurry and is starting to fray: visual inconsistency across views, broken on mobile, small UX papercuts (`window.confirm` for deletes, `alert()` for errors, no toast pattern, dense forms, tables that don't reflow).

**The goal of this redesign.** A facelift, not a rebuild — keep the routes and capabilities, replace the visual language. Specifically:

- A consistent design system across all admin views.
- Mobile-first that doesn't degrade on desktop. Admin gets used from phones in the wild (e.g. while card-importing from photos).
- Better visual hierarchy: badges, status, empty states, loading, errors.
- Replace browser primitives (`confirm`, `alert`) with proper dialog/toast patterns.
- Make the question editor — the densest screen — actually usable.

**The aesthetic anchor.** The player-facing game is dark, playful, slightly retro (Berkeley Mono is in use), with bright accent moments. The admin should feel like a quieter, more functional sibling of that — dark theme primary, restrained, but still recognisably part of the same product. Not a generic "shadcn dashboard" reskin; not Linear; not Vercel dashboard. Find a voice.

---

## 2. Stack & technical constraints

These are non-negotiable; design against them, not around them.

- **SvelteKit** with **Svelte 5 runes** (`$state`, `$derived`, `$effect`).
- **shadcn-svelte** as the component library. Default to its primitives (Dialog, DropdownMenu, Table, Form, Toast/Sonner, Tabs, Command, Badge, etc.) — they have the best Svelte coverage and give engineers a clear implementation path. Don't design components that shadcn-svelte doesn't have unless there's a strong reason.
- **Tailwind** for styling (shadcn-svelte's underlying engine).
- **Lucide** icons (already in use; the deck "icon picker" relies on Lucide's full set).
- **Supabase** for data, auth, storage. Free to assume real-time isn't needed; standard CRUD.
- **prism-code-editor** in use for the deck Custom-CSS field — keep it, but theme the surround.
- **Admin UI copy: English.** Question content (the data being managed) is multilingual — display it as-is, don't translate it.
- Mobile target: 375px width minimum. Desktop sweet spot: 1280–1440px. No assumption of native app — it's a web app, sometimes installed as a PWA.

---

## 3. Route inventory

Nine routes. For each: purpose, key data, current pain points.

### 3.1 `/admin/login`

Sign-in form (email + password via Supabase Auth, plus an `is_admin` flag check). Single screen. Simplest view — design as the visual tone-setter for the rest.

### 3.2 `/admin` — Dashboard

- Three large entry cards: Decks, Questions, Users.
- A "Testing options" panel below: an input to force a specific question ID as the first question for new games (debugging aid, stored in browser storage).

_Pain:_ The testing panel sits awkwardly with the entry cards. Should feel like a developer affordance, not a primary action.

### 3.3 `/admin/decks` — Decks list

List of decks. Each row: Lucide icon, name, description, edit/delete actions. Maybe 20–50 decks at scale.

_Pain:_ Plain list. No sense of which decks have images vs only icons, no question count, no created-at hint.

### 3.4 `/admin/decks/new` and `/admin/decks/[id]` — Deck form

Form fields:

- Name (required)
- Description
- Lucide icon picker (searchable grid of ~1000+ icons)
- Image upload (JPEG/PNG/WebP, max 5MB, stored in Supabase storage; preview)
- Custom CSS editor (Prism, syntax-highlighted; targets `[data-deck-id]`, `.deck-card--selected`, `:hover`)

_Pain:_ The icon picker grid is fine on desktop, cramped on mobile. The Custom CSS field gets lost at the bottom — important to power users but visually quiet.

### 3.5 `/admin/questions` — Questions list

The most-used screen. Several hundred rows.

Columns:

- `#` (question number, sortable)
- Type badge (one of 7)
- Question text (sortable, primary)
- Deck name
- Vote counts (👍 / 👎)
- Actions (Edit, Archive/Restore)

Filters:

- Deck dropdown
- Type dropdown
- Free-text search
- Archived toggle

State:

- Filter values persist in `sessionStorage`.
- Scroll position is preserved across navigation (intentional — admins click into a question, edit, come back, expect to be where they were).

_Pain:_ CSS-grid columns don't reflow on mobile — content overflows. Sort indicators are tiny arrows. Vote chips are small. Filters wrap awkwardly on narrow screens. Type badges have inconsistent color coding.

### 3.6 `/admin/questions/new` and `/admin/questions/[id]` — Question form

**The densest screen.** This is the view most in need of design help.

Fields:

- Deck (select, required)
- Type (select, 7 options — changes the shape of correct answers below)
- Question text (required)
- Soft-hyphen helper (only shown when long words are detected — tappable letters that insert U+00AD breakpoints, used to control wrapping on the wheel)
- Question number (optional)
- Option display mode: radio between "text options" / "image options"
- **Options grid: exactly 10 rows.** Each row contains, at minimum:
    - Row number (1–10)
    - Up/Down reorder buttons
    - Option label (text input)
    - Optional per-option image (with upload/replace/clear)
    - A _correct answer_ field — shape depends on question type:
        - `standard` / `chooseBetween` / `centuryDecade`: text input
        - `boolean`: yes/no toggle
        - `rank`: number 1–10 (must form complete permutation)
        - `colors`: HSL color picker (swatch + 3 sliders) plus text label
        - `numbers`: number input
    - For `standard` type: three optional URL fields per row (generic, Spotify, YouTube)

So worst case (standard type, image options on): each row has 1 reorder column + 1 label input + 1 image thumbnail/upload + 1 answer input + 3 URL inputs = 7 fields × 10 rows. It's a wall.

_Pain:_ On desktop it's overwhelming but workable. On mobile it's unusable. The 10-row constraint is fixed by gameplay, so the design must find a pattern that survives it — possibly:

- Master/detail (list of 10 rows, click a row to expand its editor)
- Wizard (step through 10)
- Collapsible accordion rows
- A "compact mode" that hides URLs/images behind a per-row disclosure

Designer's call — but the current "render everything everywhere" approach has reached its limit.

### 3.7 `/admin/questions/import` — Bulk import from photos

Used to import physical card decks. Workflow:

1. Pick target deck
2. Upload (or take with camera) one photo per physical card
3. Each photo is sent to an extraction API which returns a draft question (question text, type, options, correct answers, optional per-option image crops, plus confidence scores per field)
4. Reviewer scans each draft, fixes anything wrong, saves

Each item-card shows:

- Photo preview
- Status (queued / extracting / ready / error / saved)
- All fields from §3.6 in editable form
- Confidence pills (5 pills: type, text, number, options, answers — green if 100%, neutral otherwise)
- Warnings list (e.g. "OCR uncertain")
- Errors (validation)
- Save / Discard actions

_Pain:_ Confidence pills are visually noisy. Each card carries the full question form so the screen gets very tall. No batch progress UI when "Save all ready" is running. Saved items collapse to a one-liner but the collapse/expand transition is jarring.

### 3.8 `/admin/question-quality` — Quality triage

A diagnostic table. Shows only questions that have received at least one player vote, sorted by net score ascending (worst first). Used to find questions to fix or archive.

Columns: question text, deck, 👍 count, 👎 count, net score (signed), play count, edit link.

_Pain:_ Has its own embedded `<style>` block with hardcoded colors that don't match the rest of the admin. Looks like a different app. Sort isn't user-controllable. Could surface more actionable signals (e.g. ratio rather than raw net, time-since-last-vote).

### 3.9 `/admin/users` — Users

Simple table: email, name, admin toggle. Users are created automatically when they sign in via Supabase Auth; this view exists only to grant/revoke admin access.

_Pain:_ Plain HTML table, no reflow on mobile. The admin toggle is a custom pill that doesn't match shadcn-style switches.

---

## 4. Cross-cutting patterns to define

These show up everywhere; designing them once is most of the value of this brief.

1. **List / table layout.** One pattern that gracefully handles desktop-table → mobile-card. Used in Decks, Questions, Quality, Users.
2. **Filter bar.** Selects + search + toggle that wraps nicely. Used in Questions, Quality.
3. **Form sections.** A consistent shape for field groups, with description text, validation, and action footers. Used in Deck form, Question form, Import.
4. **Per-row action menus.** Probably a kebab `DropdownMenu` on mobile, inline buttons on desktop — but one design.
5. **Destructive-action confirmation.** Replace `window.confirm` with a `Dialog`. One pattern for archive, delete, etc.
6. **Status / errors / hints.** Replace `alert()` with toasts (Sonner). One pattern for inline form errors.
7. **Badges.** Type badges, status badges, archived state. One scale, one palette.
8. **Empty / loading / error states.** Specifically the "no questions yet" / "loading…" / "failed to load" shapes — currently a single line of grey text.
9. **Navigation.** Top nav today is a flat horizontal row that doesn't accommodate mobile. Decide: collapse to a sheet/drawer? bottom tab bar? Either works — pick one.

---

## 5. What I'd love to see in the deliverable

- **High-fidelity mockups** for each of the 9 routes, in both mobile (375px) and desktop (≥1280px) widths. Tablet is a bonus.
- **A short component-vocabulary page** showing how the shared patterns from §4 look — one place an engineer can look up "what does a destructive dialog feel like in this design?"
- **Working code** preferred over static mocks (HTML/CSS or React both fine — Svelte not required, since I'll port). If working code is too much scope, very-clickable HTML + Tailwind is great.
- **An aesthetic point of view.** A choice about typography, density, accent colour(s), motion, voice. Not just "shadcn defaults." The admin should feel _of this product_.
- **Notes on the question-editor pattern you chose** (master/detail vs wizard vs accordion vs something else) and why. This is the riskiest design decision in the brief.

---

## 6. Out of scope

- The player-facing game UI (decks, wheel, question rendering, gameplay).
- Auth flows beyond `/admin/login` (signup, password reset — not needed; users are created via Supabase Auth invite or external SSO).
- Database schema or API changes.
- New features. Capabilities of the redesigned admin should match the current one route-for-route.
- Implementation in Svelte/SvelteKit. An engineer will port your output.

---

## 7. Stretch — nice-to-haves, only if time permits

- A "command palette" (`Cmd-K`) for navigating between routes and jumping to a specific question by text. There are hundreds of questions; the current Questions list is the only way to find one.
- Keyboard shortcuts for the question editor (save, next/prev, type switch).
- A small dashboard widget showing recent admin activity (newly added questions, recently archived) — currently the dashboard is just a menu.
- Light theme.

---

## 8. How to respond

I'd like:

1. A few clarifying questions before you start designing (e.g. on the question-editor pattern, on accent colour direction, on whether to design the import flow at full fidelity).
2. A first pass on the design language — typography, colour, density — applied to one or two representative views (login + dashboard, or questions list).
3. Then iterate route by route.

Don't try to design all 9 routes in one shot. Move in passes.
