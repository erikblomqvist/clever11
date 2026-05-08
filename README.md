# Clever 11

A digital adaptation of a trivia board game. Players take turns revealing blobs on a 10-option wheel, building a round score with each correct answer. Bust (wrong answer) and your round score resets to zero. Pass to bank what you have. First to 50 total points wins.

## Tech stack

- **Svelte 5** + Vite — frontend
- **Supabase** — database, auth, storage (Postgres + Realtime)
- **Vercel** — hosting + serverless API routes (`/api`)
- **bun** — package manager and test runner

## Local dev

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
bun install
bun run dev
```

The admin interface is served at `/admin` (`admin.html` as a separate Vite entry point).

### Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server-only, used by `/api` routes) |

### Database migrations

Migrations live in `supabase/migrations/`. Apply them via the Supabase CLI or the dashboard. Use `.env.migrate` (copy from `.env.migrate.example`) for migration-specific credentials.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build to `dist/` |
| `bun run test` | Run tests (vitest) |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |

## Project structure

```
src/
  components/   # Shared UI components
  views/        # Route-level views (Setup, Playing, RoundReview, Finished)
  lib/          # Game logic, store, Supabase client
  data/         # Static data (icons, colors)
  i18n/         # Translations
api/            # Vercel serverless functions
supabase/
  migrations/   # SQL migrations
```

## Domain reference

See [`CONTEXT.md`](CONTEXT.md) for the full domain language — definitions for Game, Round, Turn, Blob, Reveal, Bust, Pass, etc.
