# Clever 11

A digital adaptation of a trivia board game. Players take turns revealing blobs on a 10-option wheel, building a round score with each correct answer. Bust (wrong answer) and your round score resets to zero. Pass to bank what you have. First to 50 total points wins.

## Tech stack

- **Svelte 5** + **SvelteKit** — full-stack framework
- **Supabase** — database, auth (@supabase/ssr), storage (Postgres + Realtime)
- **Vercel** — hosting + serverless deployment
- **bun** — package manager and test runner

## Local dev

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
bun install
bun run dev
```

The admin interface is served at `/admin`.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server-only, used by API routes) |

### Database migrations

Migrations live in `supabase/migrations/`. Apply them via the Supabase CLI or the dashboard. Use `.env.migrate` (copy from `.env.migrate.example`) for migration-specific credentials.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests (vitest) |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |

## Project structure

```
src/
  routes/       # SvelteKit routes (Pages, Layouts, API endpoints)
  components/   # Shared UI components
  views/        # View-specific components
  lib/          # Game logic, state, Supabase client
    server/     # Server-only utilities (Supabase admin client)
  data/         # Question types and static configuration
  i18n/         # Translations (en, sv, no)
  hooks.server.js # Server-side hooks (Auth guard, Supabase SSR session)
static/         # Static assets (favicons, images)
supabase/
  migrations/   # SQL migrations
```

## Domain reference

See [`CONTEXT.md`](CONTEXT.md) for the full domain language — definitions for Game, Round, Turn, Blob, Reveal, Bust, Pass, etc.
