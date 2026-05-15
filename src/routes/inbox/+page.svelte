<script>
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import InboxItemCard from '$lib/components/InboxItemCard.svelte';
	import InboxNudgeToggle from '$lib/components/InboxNudgeToggle.svelte';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	// Actions that remove the item from the current view. We hide
	// optimistically because GitHub's list endpoint is eventually consistent
	// and the post-action invalidateAll() often returns stale data for a beat.
	const HIDE_ACTIONS = new Set([
		'ready',
		'snooze3',
		'snooze7',
		'done',
		'wontfix',
	]);

	let isMobile = $state(false);
	let mobileIndex = $state(0);
	let busyIssue = $state(/** @type {number | null} */ (null));
	let hiddenIssues = $state(/** @type {Set<number>} */ (new Set()));
	let toast = $state('');
	/** @type {number | undefined} */
	let toastTimer;

	const visibleItems = $derived(
		data.items.filter((i) => !hiddenIssues.has(i.issue_number)),
	);
	const visibleFlat = $derived(
		data.flat.filter((i) => !hiddenIssues.has(i.issue_number)),
	);
	const visibleClusters = $derived(
		data.clusters
			.map((c) => ({
				...c,
				items: c.items.filter((i) => !hiddenIssues.has(i.issue_number)),
			}))
			.filter((c) => c.items.length > 0),
	);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 768px)');
		const sync = () => {
			isMobile = mq.matches;
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	$effect(() => {
		if (mobileIndex >= visibleFlat.length) {
			mobileIndex = Math.max(0, visibleFlat.length - 1);
		}
	});

	function showToast(text) {
		toast = text;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toast = '';
		}, 1800);
	}

	/** @param {number} issueNumber */
	function unhide(issueNumber) {
		const next = new Set(hiddenIssues);
		next.delete(issueNumber);
		hiddenIssues = next;
	}

	/**
	 * @param {number} issueNumber
	 * @param {string} action
	 * @param {Record<string, unknown>} [payload]
	 */
	async function runAction(issueNumber, action, payload) {
		busyIssue = issueNumber;
		const shouldHide = HIDE_ACTIONS.has(action);
		if (shouldHide) {
			hiddenIssues = new Set([...hiddenIssues, issueNumber]);
		}
		try {
			const res = await fetch('/api/inbox/action', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					issue_number: issueNumber,
					action,
					payload,
				}),
			});
			if (!res.ok) {
				if (shouldHide) unhide(issueNumber);
				showToast(`Action failed (${res.status})`);
				return;
			}
			await invalidateAll();
		} catch {
			if (shouldHide) unhide(issueNumber);
			showToast('Network error');
		} finally {
			busyIssue = null;
		}
	}
</script>

<svelte:head>
	<title>Inbox — triage</title>
</svelte:head>

<div class="inbox">
	<header class="inbox__header">
		<h1 class="inbox__title">
			<Inbox size={24} />
			Inbox
		</h1>
		<span class="inbox__count"
			>{visibleItems.length}
			{visibleItems.length === 1 ? 'item' : 'items'}</span
		>
	</header>

	<div class="inbox__nudge">
		<InboxNudgeToggle vapidPublicKey={data.vapidPublicKey} />
	</div>

	{#if visibleItems.length === 0}
		<p class="inbox__empty">Nothing to triage. 🎉</p>
	{:else if isMobile}
		{@const current = visibleFlat[mobileIndex]}
		{#if current}
			<div class="inbox__stack">
				<InboxItemCard
					item={current}
					busy={busyIssue === current.issue_number}
					onaction={(action, payload) =>
						runAction(current.issue_number, action, payload)}
					oncopied={() => showToast('Copied to clipboard')}
				/>
				<div class="inbox__nav">
					<Button
						variant="secondary"
						icon={ChevronLeft}
						text="Prev"
						disabled={mobileIndex === 0}
						onclick={() => (mobileIndex -= 1)}
					/>
					<span class="inbox__progress"
						>{mobileIndex + 1} / {visibleFlat.length}</span
					>
					<Button
						variant="secondary"
						icon={ChevronRight}
						text="Next"
						disabled={mobileIndex >= visibleFlat.length - 1}
						onclick={() => (mobileIndex += 1)}
					/>
				</div>
			</div>
		{/if}
	{:else}
		<div class="inbox__clusters">
			{#each visibleClusters as cluster (cluster.area)}
				<section class="cluster">
					<h2 class="cluster__heading">
						{cluster.area}
						<span class="cluster__count"
							>{cluster.items.length}</span
						>
					</h2>
					<div class="cluster__items">
						{#each cluster.items as item (item.issue_number)}
							<InboxItemCard
								{item}
								busy={busyIssue === item.issue_number}
								onaction={(action, payload) =>
									runAction(
										item.issue_number,
										action,
										payload,
									)}
								oncopied={() =>
									showToast('Copied to clipboard')}
							/>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}

	{#if toast}
		<div class="inbox__toast" role="status">{toast}</div>
	{/if}

	<a class="inbox__fab" href="/inbox/new" aria-label="Capture new note">
		<Plus size={28} />
	</a>
</div>

<style>
	.inbox {
		box-sizing: border-box;
		min-height: 100dvh;
		padding-block: max(1.5rem, env(safe-area-inset-top))
			max(1.5rem, env(safe-area-inset-bottom));
		padding-inline: 1rem;
		background: radial-gradient(
			75% 75% at calc(var(--spotlight-x) * 1%)
				calc(var(--spotlight-y) * 1%),
			var(--palette-purple-start),
			var(--palette-purple-end)
		);
		color: var(--palette-white);
		font-family: var(--font-family-primary);
	}

	.inbox__header {
		max-width: 1200px;
		margin: 0 auto 1.5rem;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.inbox__title {
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-xl);
		font-weight: 600;
	}

	.inbox__count {
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.inbox__nudge {
		max-width: 1200px;
		margin: 0 auto 1.25rem;
	}

	.inbox__empty {
		max-width: 560px;
		margin: 4rem auto;
		text-align: center;
		font-size: var(--font-size-md);
		color: var(--color-muted);
	}

	.inbox__clusters {
		max-width: 1200px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
		align-items: start;
	}

	.cluster {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.cluster__heading {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-muted);
	}

	.cluster__count {
		font-size: var(--font-size-xs);
		font-weight: 400;
		color: var(--color-muted-light);
		background-color: var(--palette-purple-dark);
		border-radius: 999px;
		padding: 0.125rem 0.5rem;
	}

	.cluster__items {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.inbox__stack {
		max-width: 560px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inbox__nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.inbox__progress {
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.inbox__toast {
		position: fixed;
		left: 50%;
		bottom: max(1rem, env(safe-area-inset-bottom));
		transform: translateX(-50%);
		background-color: var(--palette-purple-dark);
		color: var(--palette-white);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: var(--font-size-sm);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.inbox__fab {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 999px;
		background: linear-gradient(
			135deg,
			var(--palette-purple-light),
			var(--palette-purple-mid)
		);
		color: var(--palette-white);
		text-decoration: none;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		transition: scale var(--transition-default-duration) ease-out;
	}

	.inbox__fab:active {
		scale: 0.95;
	}

	.inbox__fab:focus-visible {
		outline: 3px solid var(--palette-purple-light);
		outline-offset: 3px;
	}
</style>
