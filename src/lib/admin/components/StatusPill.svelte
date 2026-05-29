<script>
	/** @type {'queued' | 'extracting' | 'ready' | 'error' | 'saved'} */
	let { status } = $props();

	const META = {
		queued: { label: 'Queued', tint: 'faint' },
		extracting: { label: 'Extracting', tint: 'info' },
		ready: { label: 'Ready', tint: 'ready' },
		error: { label: 'Error', tint: 'danger' },
		saved: { label: 'Saved', tint: 'ok' },
	};

	let meta = $derived(META[status] ?? META.queued);
</script>

<span class="sp sp--{meta.tint}">
	{#if status === 'extracting'}
		<span class="sp__spinner"></span>
	{:else}
		<span class="sp__led"></span>
	{/if}
	{meta.label}
</span>

<style>
	.sp {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 22px;
		padding: 0 8px;

		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.sp__led {
		width: 6px;
		height: 6px;

		border-radius: 50%;
	}

	.sp__spinner {
		width: 8px;
		height: 8px;

		border: 1.5px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;

		animation: spin var(--dur-spin) linear infinite;
	}

	/* ─── Tints ─────────────────────────────────────────────── */

	.sp--faint {
		color: var(--fg-faint);
		background: var(--surface-2);
		border-color: var(--border);
	}

	.sp--faint .sp__led {
		background: var(--fg-faint);
	}

	.sp--info {
		color: var(--info);
		background: var(--info-soft);
		border-color: var(--info-soft-2);
	}

	.sp--ready {
		color: var(--accent-2);
		background: transparent;
		border-color: var(--border);
	}

	.sp--ready .sp__led {
		background: var(--accent-2);
	}

	.sp--danger {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: var(--danger-soft-2);
	}

	.sp--danger .sp__led {
		background: var(--danger);
	}

	.sp--ok {
		color: var(--ok);
		background: var(--ok-soft);
		border-color: var(--ok-soft-2);
	}

	.sp--ok .sp__led {
		width: 6px;
		height: 6px;

		background: var(--ok);
		border-radius: 50%;
	}
</style>
