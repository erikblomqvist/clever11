<script>
	let {
		label,
		sortKey,
		current = '',
		dir = 'asc',
		onsort,
		align = 'left',
	} = $props();

	let active = $derived(current === sortKey);
</script>

<button
	class="sort-header"
	class:sort-header--active={active}
	class:sort-header--right={align === 'right'}
	onclick={() => onsort?.(sortKey)}
>
	<span>{label}</span>
	<span class="sort-header__chevrons">
		<svg width="8" height="5" viewBox="0 0 8 5" fill="none">
			<path
				d="M1 4l3-3 3 3"
				stroke={active && dir === 'asc'
					? 'var(--accent)'
					: 'var(--fg-faint)'}
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<svg width="8" height="5" viewBox="0 0 8 5" fill="none">
			<path
				d="M1 1l3 3 3-3"
				stroke={active && dir === 'desc'
					? 'var(--accent)'
					: 'var(--fg-faint)'}
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</span>
</button>

<style>
	.sort-header {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 26px;
		padding: 0 4px;

		font-size: 11.5px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		transition: color 80ms ease;
	}

	.sort-header:hover {
		color: var(--fg);
	}

	.sort-header--active {
		color: var(--fg);
	}

	.sort-header--right {
		flex-direction: row-reverse;
	}

	.sort-header__chevrons {
		display: inline-flex;
		align-items: center;

		flex-direction: column;
		gap: 1px;
	}
</style>
