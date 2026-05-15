# Idea Inbox — operations reference

Durable config for the idea-inbox pipeline: env vars, Supabase schema, Vercel cron, VAPID, PAT. The implementation work lives in GitHub issues; this file is what you re-read when rotating a key, redeploying, or onboarding a new dev environment.

## Stack

- SvelteKit 2 on Vercel.
- Supabase for auth + DB (with `pgvector`).
- Gemini API (Flash + `text-embedding-004`) for enrichment.
- GitHub REST API for issue storage.
- `web-push` for VAPID-signed Web Push.

## Environment variables

Add to Vercel (Production + Preview) and `.env.local`:

```
GEMINI_API_KEY=...
GITHUB_TOKEN=...                 # fine-grained PAT — see below
GITHUB_REPO=erikblomqvist/clever11
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:erik.blomqvist@gmail.com
CRON_SECRET=...                  # random; Vercel Cron sends as `Authorization: Bearer ...`
NUDGE_TIMEZONE=Europe/Stockholm
```

Vercel UI: Project → Settings → Environment Variables. Apply to **Production** and **Preview** (skip Development unless you're testing cron locally).

## Secret generation

```sh
# VAPID keypair (both halves printed once — capture immediately)
bunx web-push generate-vapid-keys

# Cron secret
openssl rand -base64 32
```

## GitHub PAT

Use a **fine-grained** PAT, not classic.

- Repo access: `erikblomqvist/clever11` only.
- Permissions: **Issues** = Read & write. Nothing else.
- Expiration: 90 days (set a calendar reminder to rotate).

## Gemini API key

AI Studio → "Get API key" → create in the project tied to your Pro subscription. The Pro plan covers Flash + embedding usage at this volume well within free-tier limits.

## Supabase migration

Run once against the project DB. Enable `pgvector` first if not already enabled.

```sql
create extension if not exists vector;

-- Push subscriptions (one row per device the PWA is installed on)
create table inbox_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

-- Embeddings + snooze state, keyed by GitHub issue number
create table inbox_items (
  issue_number int primary key,
  user_id uuid references auth.users(id) not null,
  embedding vector(768),               -- text-embedding-004 dimension
  snooze_until date,
  follow_up_question text,
  follow_up_answered boolean default false,
  area text[],
  created_at timestamptz default now()
);

create index on inbox_items using ivfflat (embedding vector_cosine_ops);

-- Cached commit embeddings for the daily "possibly shipped" check
create table inbox_commit_embeddings (
  sha text primary key,
  message text not null,
  embedding vector(768),
  created_at timestamptz default now()
);
```

## Vercel cron

`vercel.json` (commit to repo):

```json
{
	"crons": [{ "path": "/api/cron/inbox-nudge", "schedule": "0 7 * * *" }]
}
```

Vercel cron runs in UTC. `0 7 * * *` ≈ 09:00 Europe/Stockholm in winter, 08:00 in summer. Two options:

- **Accept the drift** — simplest; one-hour shift twice a year.
- **Gate inside the handler** — check `Intl.DateTimeFormat('sv-SE', { timeZone: NUDGE_TIMEZONE, hour: 'numeric' })` and short-circuit unless the local hour is 9. Run the cron hourly (`0 6-8 * * *`) so one of the three firings hits.

Verify after deploy: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/inbox-nudge` — should return `{ sent: true | false }`.

## PWA install assets

- `static/manifest.webmanifest` with `start_url: "/inbox/new"`, `display: "standalone"`.
- `static/icon-192.png` and `static/icon-512.png`.
- `<link rel="manifest" href="/manifest.webmanifest">` in `src/app.html`.

Android Chrome will offer "Install app" once `manifest` + `service-worker` + icons are present and served over HTTPS.

## One-time checklist

- [ ] Fine-grained GitHub PAT generated and saved as `GITHUB_TOKEN`.
- [ ] Gemini API key generated and saved as `GEMINI_API_KEY`.
- [ ] VAPID keypair generated; both halves saved.
- [ ] `CRON_SECRET` generated.
- [ ] All env vars added to Vercel (Production + Preview) and `.env.local`.
- [ ] Supabase migration run; `pgvector` enabled.
- [ ] `vercel.json` cron entry committed.
- [ ] PWA icons (192px, 512px) added to `static/`.
- [ ] Calendar reminder set for PAT rotation (90 days).

## Key rotation

- **`GITHUB_TOKEN`**: regenerate fine-grained PAT, update Vercel + `.env.local`, redeploy.
- **`GEMINI_API_KEY`**: regenerate in AI Studio, update Vercel + `.env.local`, redeploy.
- **VAPID keys**: rotating invalidates all existing push subscriptions. `truncate inbox_push_subscriptions;` after rotation and re-subscribe from each device.
- **`CRON_SECRET`**: update Vercel env var; no other action needed.
