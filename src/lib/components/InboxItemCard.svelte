<script>
	import {
		Rocket,
		Clock,
		CheckCircle2,
		XCircle,
		ClipboardCopy,
	} from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * @type {{
	 *   item: {
	 *     issue_number: number,
	 *     title: string,
	 *     note_excerpt: string,
	 *     note_for_clipboard: string,
	 *     area: string[],
	 *     age_label: string,
	 *     follow_up_question: string,
	 *     follow_up_answered: boolean,
	 *   },
	 *   busy?: boolean,
	 *   onaction: (action: string, payload?: Record<string, unknown>) => void,
	 *   oncopied?: () => void,
	 * }}
	 */
	let { item, busy = false, onaction, oncopied } = $props();

	let followUpAnswer = $state('');
	let copyState = $state(
		/** @type {'idle' | 'copied' | 'failed'} */ ('idle'),
	);

	async function copyToClipboard() {
		const text = `/grill-with-docs Refine issue #${item.issue_number}: ${item.note_for_clipboard}`;
		try {
			await navigator.clipboard.writeText(text);
			copyState = 'copied';
			oncopied?.();
		} catch {
			copyState = 'failed';
		}
		setTimeout(() => {
			copyState = 'idle';
		}, 1800);
	}

	function submitFollowUp() {
		const answer = followUpAnswer.trim();
		if (!answer) return;
		onaction('answer_followup', { answer });
		followUpAnswer = '';
	}

	function dismissFollowUp() {
		onaction('answer_followup', { answer: '' });
		followUpAnswer = '';
	}
</script>

<article class="card" class:card--busy={busy}>
	{#if item.follow_up_question && !item.follow_up_answered}
		<section class="followup">
			<p class="followup__question">{item.follow_up_question}</p>
			<textarea
				class="followup__textarea"
				bind:value={followUpAnswer}
				placeholder="Your answer…"
				rows="2"
				disabled={busy}
			></textarea>
			<div class="followup__row">
				<Button
					size="sm"
					variant="cta"
					text="Answer"
					onclick={submitFollowUp}
					disabled={busy || !followUpAnswer.trim()}
				/>
				<Button
					size="sm"
					variant="tertiary"
					text="Dismiss"
					onclick={dismissFollowUp}
					disabled={busy}
				/>
			</div>
		</section>
	{/if}

	<header class="card__header">
		<h2 class="card__title">
			{item.title || `Issue #${item.issue_number}`}
		</h2>
		<span class="card__age">captured {item.age_label}</span>
	</header>

	{#if item.note_excerpt}
		<p class="card__body">{item.note_excerpt}</p>
	{/if}

	{#if item.area.length}
		<ul class="card__chips">
			{#each item.area as area (area)}
				<li class="card__chip">{area}</li>
			{/each}
		</ul>
	{/if}

	<div class="card__actions">
		<Button
			size="sm"
			variant="primary"
			icon={Rocket}
			text="Ready for agent"
			onclick={() => onaction('ready')}
			disabled={busy}
		/>
		<Button
			size="sm"
			variant="secondary"
			icon={Clock}
			text="Snooze 3d"
			onclick={() => onaction('snooze3')}
			disabled={busy}
		/>
		<Button
			size="sm"
			variant="secondary"
			icon={Clock}
			text="Snooze 7d"
			onclick={() => onaction('snooze7')}
			disabled={busy}
		/>
		<Button
			size="sm"
			variant="tertiary"
			icon={CheckCircle2}
			text="Already done"
			onclick={() => onaction('done')}
			disabled={busy}
		/>
		<Button
			size="sm"
			variant="tertiary"
			icon={XCircle}
			text="Won't do"
			onclick={() => onaction('wontfix')}
			disabled={busy}
		/>
	</div>

	<div class="card__handoff">
		<button
			class="card__copy"
			type="button"
			onclick={copyToClipboard}
			disabled={busy}
		>
			<ClipboardCopy size={16} />
			<span>
				{#if copyState === 'copied'}
					Copied to clipboard
				{:else if copyState === 'failed'}
					Couldn't copy
				{:else}
					Open in Claude Code
				{/if}
			</span>
		</button>
	</div>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background-color: var(--palette-purple-neutral);
		border: 1px solid
			lch(from var(--palette-purple-neutral) calc(l + 10) c h);
		border-radius: 0.75rem;
		padding: 1rem;
		color: var(--palette-white);
		font-family: var(--font-family-primary);
		transition: opacity 0.2s ease-out;
	}

	.card--busy {
		opacity: 0.55;
		pointer-events: none;
	}

	.card__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.card__title {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		line-height: 1.25;
	}

	.card__age {
		font-size: var(--font-size-xs);
		color: var(--color-muted);
		white-space: nowrap;
	}

	.card__body {
		margin: 0;
		font-size: var(--font-size-sm);
		line-height: 1.5;
		color: var(--color-muted);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.card__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.card__chip {
		display: inline-flex;
		align-items: center;
		font-size: var(--font-size-xs);
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		background-color: var(--palette-purple-dark);
		color: var(--color-muted);
		border: 1px solid
			lch(from var(--palette-purple-neutral) calc(l + 12) c h);
	}

	.card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.card__actions :global(.btn) {
		flex: 1 1 auto;
	}

	.card__handoff {
		display: flex;
		justify-content: flex-end;
	}

	.card__copy {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: none;
		padding: 0.25rem 0;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-xs);
		color: var(--color-muted);
		cursor: pointer;
	}

	.card__copy:hover:not(:disabled) {
		color: var(--palette-white);
	}

	.card__copy:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.followup {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background-color: lch(from var(--color-amber) calc(l - 8) c h / 0.18);
		border: 1px solid var(--color-amber);
		color: var(--palette-white);
	}

	.followup__question {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-amber);
	}

	.followup__textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-sm);
		line-height: 1.4;
		background-color: var(--palette-white);
		color: var(--palette-black);
		border: 2px solid var(--color-amber);
		border-radius: 0.375rem;
		resize: vertical;
	}

	.followup__textarea:focus {
		outline: 2px solid var(--color-amber);
		outline-offset: 1px;
	}

	.followup__row {
		display: flex;
		gap: 0.5rem;
	}
</style>
