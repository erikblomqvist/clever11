<script>
	let { urls = {}, onchange, disabled = false } = $props();

	const fields = [
		{
			key: 'url',
			label: '↗',
			placeholder: 'https://…',
			color: 'var(--fg-mute)',
		},
		{
			key: 'spotify_url',
			label: 'S',
			placeholder: 'https://open.spotify.com/track/…',
			color: 'lch(79.2% 56.3 150)',
		},
		{
			key: 'youtube_url',
			label: 'YT',
			placeholder: 'https://youtube.com/watch?v=…',
			color: 'lch(55.5% 72.3 29)',
		},
	];

	function update(key, value) {
		onchange?.({ ...urls, [key]: value });
	}
</script>

<div class="urls-block">
	{#each fields as f (f.key)}
		<div class="urls-block__row">
			<div class="urls-block__badge" style="color: {f.color}">
				{f.label}
			</div>
			<input
				class="urls-block__input"
				type="url"
				value={urls[f.key] ?? ''}
				oninput={(e) => update(f.key, e.currentTarget.value)}
				placeholder={f.placeholder}
				{disabled}
			/>
		</div>
	{/each}
</div>

<style>
	.urls-block {
		display: flex;

		flex-direction: column;
		gap: 6px;
	}

	.urls-block__row {
		display: flex;
		align-items: center;

		gap: 8px;
	}

	.urls-block__badge {
		display: grid;
		width: 28px;
		height: 34px;

		font-family: var(--font-mono);
		font-size: 0.625rem;
		letter-spacing: 0.04em;

		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		flex: 0 0 28px;
		place-items: center;
	}

	.urls-block__input {
		width: 100%;
		height: 34px;
		padding: 0 10px;

		font-family: var(--font-mono);
		font-size: 0.75rem;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		flex: 1;
	}

	.urls-block__input::placeholder {
		color: var(--fg-faint);
	}

	.urls-block__input:focus-visible {
		border-color: var(--border-strong);
	}
</style>
