create table admin_activity (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id),
  verb        text not null,
  entity_type text not null,
  entity_id   uuid,
  summary     text not null,
  deck_name   text,
  created_at  timestamptz not null default now()
);

create index idx_admin_activity_created_at on admin_activity(created_at desc);

alter table admin_activity enable row level security;

create policy "Admin read" on admin_activity for select
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create policy "Admin insert" on admin_activity for insert
  with check (exists (select 1 from public.users where id = auth.uid() and is_admin = true));
