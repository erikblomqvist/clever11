-- Public bucket for deck cover images (admin write; app read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'deck-images',
	'deck-images',
	true,
	5242880, -- 5 MB (matches src/lib/storage.js)
	array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "deck_images_select"
	on storage.objects for select
	using (bucket_id = 'deck-images');

create policy "deck_images_insert_admin"
	on storage.objects for insert
	with check (
		bucket_id = 'deck-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	);

create policy "deck_images_update_admin"
	on storage.objects for update
	using (
		bucket_id = 'deck-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	)
	with check (bucket_id = 'deck-images');

create policy "deck_images_delete_admin"
	on storage.objects for delete
	using (
		bucket_id = 'deck-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	);
