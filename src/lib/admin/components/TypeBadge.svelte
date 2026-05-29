<script>
	/** @type {'standard' | 'boolean' | 'rank' | 'chooseBetween' | 'colors' | 'numbers' | 'centuryDecade'} */
	let { type, full = false } = $props();

	const META = {
		standard: { label: 'Standard', short: 'STD', tint: 'neutral' },
		boolean: { label: 'True / False', short: 'Y/N', tint: 'info' },
		rank: { label: 'Rank 1–10', short: 'RANK', tint: 'lime' },
		chooseBetween: {
			label: 'Choose between',
			short: 'PICK',
			tint: 'coral',
		},
		colors: { label: 'Colors', short: 'COL', tint: 'rainbow' },
		numbers: { label: 'Number', short: 'NUM', tint: 'mono' },
		centuryDecade: {
			label: 'Century / decade',
			short: 'ERA',
			tint: 'warn',
		},
	};

	let meta = $derived(META[type] ?? META.standard);
</script>

{#if meta.tint === 'rainbow'}
	<span class="type-badge type-badge--rainbow">
		<span class="type-badge__swatches">
			<span
				class="type-badge__swatch"
				style:background="lch(63.3% 63.5 19)"
			></span>
			<span
				class="type-badge__swatch"
				style:background="lch(78.9% 66.4 75)"
			></span>
			<span
				class="type-badge__swatch"
				style:background="lch(86.6% 57.6 150)"
			></span>
			<span
				class="type-badge__swatch"
				style:background="lch(70.8% 45.3 266)"
			></span>
		</span>
		{full ? meta.label : meta.short}
	</span>
{:else}
	<span class="type-badge type-badge--{meta.tint}">
		{full ? meta.label : meta.short}
	</span>
{/if}

<style>
	.type-badge {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 8px;

		font-family: var(--font-mono);
		font-size: 0.625rem;
		letter-spacing: 0.06em;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.type-badge--neutral {
		color: var(--fg-mute);
		background: var(--surface-2);
		border-color: var(--border);
	}

	.type-badge--info {
		color: var(--info);
		background: var(--info-soft);
		border-color: var(--info-soft-2);
	}

	.type-badge--lime {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: var(--border-accent);
	}

	.type-badge--coral {
		color: var(--accent-2);
		background: var(--accent-2-soft);
		border-color: var(--border-accent-2);
	}

	.type-badge--warn {
		color: var(--warn);
		background: var(--warn-soft);
		border-color: lch(78.9% 66.4 75 / 0.28);
	}

	.type-badge--mono {
		color: var(--fg-mute);
		background: transparent;
		border-color: var(--border-strong);
	}

	.type-badge--rainbow {
		gap: 6px;
		padding: 0 8px 0 4px;

		color: var(--fg-mute);
		background: var(--surface-2);
		border-color: var(--border);
	}

	.type-badge__swatches {
		display: inline-flex;
		gap: 1px;
	}

	.type-badge__swatch {
		width: 4px;
		height: 12px;

		border-radius: 1px;
	}
</style>
