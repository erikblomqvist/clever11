alter table public.questions add column archived_at timestamptz;

create index idx_questions_archived_at on public.questions (archived_at)
  where archived_at is not null;
