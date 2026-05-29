<script>
	let { up = 0, down = 0, compact = false } = $props();

	let net = $derived(up - down);
	let total = $derived(up + down);
	let ratio = $derived(total > 0 ? up / total : 0);

	let signal = $derived.by(() => {
		if (total < 5) return 'var(--fg-faint)';
		if (ratio >= 0.8) return 'var(--ok)';
		if (ratio >= 0.6) return 'var(--fg-mute)';
		if (ratio >= 0.4) return 'var(--warn)';
		return 'var(--danger)';
	});
</script>

<span class="vote-chips" class:vote-chips--compact={compact}>
	<span class="vote-chips__count" class:vote-chips__count--active={up > 0}>
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="vote-chips__icon"
		>
			<path d="M7 11v9H4v-9z" /><path
				d="M7 11l4-8a2 2 0 0 1 3 2v3h5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 18 18H7"
			/>
		</svg>
		{up}
	</span>
	<span class="vote-chips__count" class:vote-chips__count--active={down > 0}>
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="vote-chips__icon"
		>
			<path d="M7 13V4H4v9z" /><path
				d="M7 13l4 8a2 2 0 0 0 3-2v-3h5a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 18 6H7"
			/>
		</svg>
		{down}
	</span>
	{#if total > 0 && !compact}
		<span class="vote-chips__net" style:color={signal}>
			{net > 0 ? '+' : ''}{net}
		</span>
	{/if}
</span>

<style>
	.vote-chips {
		display: inline-flex;
		align-items: center;
		gap: 10px;

		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.vote-chips--compact {
		gap: 6px;
	}

	.vote-chips__count {
		display: inline-flex;
		align-items: center;
		gap: 4px;

		color: var(--fg-faint);
	}

	.vote-chips__count--active {
		color: var(--fg);
	}

	.vote-chips__icon {
		color: var(--fg-faint);
	}

	.vote-chips__net {
		font-size: 0.6875rem;
	}
</style>
