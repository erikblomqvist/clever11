<script>
	/** @type {Record<string, number>} */
	let { confidence } = $props();

	const FIELDS = [
		{ key: 'type', label: 'Type' },
		{ key: 'question_text', label: 'Text' },
		{ key: 'question_number', label: 'Number' },
		{ key: 'options', label: 'Options' },
		{ key: 'correct_answers', label: 'Answers' },
	];

	let issues = $derived(
		FIELDS.map((f) => ({
			...f,
			score: Math.round((confidence[f.key] ?? 0) * 100),
		})).filter((f) => f.score < 100),
	);

	let allGood = $derived(issues.length === 0);

	function tint(score) {
		if (score < 70) return 'danger';
		if (score < 90) return 'warn';
		return 'coral';
	}
</script>

{#if allGood}
	<span class="cp__ok">
		<svg
			width="10"
			height="10"
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M2 6.5l2.5 2.5L10 3.5" />
		</svg>
		High confidence
	</span>
{:else}
	<div class="cp__pills">
		{#each issues as f (f.key)}
			<span class="cp__pill cp__pill--{tint(f.score)}">
				<span class="cp__pill-label">{f.label}</span>
				<span class="cp__pill-score mono">{f.score}%</span>
			</span>
		{/each}
	</div>
{/if}

<style>
	.cp__ok {
		display: inline-flex;
		align-items: center;
		gap: 6px;

		font-size: 11.5px;

		color: var(--ok);
	}

	.cp__pills {
		display: inline-flex;
		gap: 6px;

		flex-wrap: wrap;
	}

	.cp__pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 22px;
		padding: 0 8px;

		font-size: 11px;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.cp__pill-label {
		color: var(--fg-mute);
	}

	/* ─── Tints ─────────────────────────────────────────────── */

	.cp__pill--danger {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: lch(63.3% 63.5 19 / 0.25);
	}

	.cp__pill--warn {
		color: var(--warn);
		background: var(--warn-soft);
		border-color: lch(78.9% 66.4 75 / 0.25);
	}

	.cp__pill--coral {
		color: var(--accent-2);
		background: var(--accent-2-soft);
		border-color: var(--border-accent-2);
	}
</style>
