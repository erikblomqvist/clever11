<script>
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase.js';
	import { SvelteMap } from 'svelte/reactivity';
	import { Search, X, Plus, Layers } from 'lucide-svelte';
	import DeckBadge from './components/DeckBadge.svelte';
	import EmptyState from './components/EmptyState.svelte';
	import DropdownMenu from './components/DropdownMenu.svelte';
	import Dialog from './components/Dialog.svelte';
	import Toast from './components/Toast.svelte';

	/** @type {{ id: string, name: string, description: string|null, icon: string|null, image_url: string|null, created_at: string }[]} */
	let decks = $state([]);
	/** @type {SvelteMap<string, number>} */
	const cardCounts = new SvelteMap();
	let loading = $state(true);
	let error = $state('');
	let filterText = $state('');

	/** @type {{ id: string, name: string }|null} */
	let confirmTarget = $state(null);
	let deleting = $state(false);

	/** @type {ReturnType<typeof Toast>|null} */
	let toastRef = $state(null);

	$effect(() => {
		loadDecks();
	});

	async function loadDecks() {
		loading = true;
		const [decksRes, countsRes] = await Promise.all([
			supabase
				.from('decks')
				.select('id, name, description, icon, image_url, created_at')
				.order('name'),
			supabase
				.from('questions')
				.select('deck_id')
				.is('archived_at', null),
		]);

		if (decksRes.error) {
			error = decksRes.error.message;
			loading = false;
			return;
		}

		cardCounts.clear();
		for (const row of countsRes.data ?? []) {
			cardCounts.set(row.deck_id, (cardCounts.get(row.deck_id) ?? 0) + 1);
		}
		decks = decksRes.data ?? [];
		loading = false;
	}

	const filtered = $derived.by(() => {
		const q = filterText.trim().toLowerCase();
		if (!q) return decks;
		return decks.filter(
			(d) =>
				d.name.toLowerCase().includes(q) ||
				(d.description ?? '').toLowerCase().includes(q),
		);
	});

	const totalCards = $derived(
		decks.reduce((sum, d) => sum + (cardCounts.get(d.id) ?? 0), 0),
	);

	function relativeTime(/** @type {string} */ iso) {
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '—';
		const diff = Date.now() - then;
		const day = 86_400_000;
		if (diff < day) return 'today';
		const days = Math.floor(diff / day);
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) {
			const w = Math.floor(days / 7);
			return w === 1 ? '1 week ago' : `${w} weeks ago`;
		}
		if (days < 365) {
			const m = Math.floor(days / 30);
			return m === 1 ? '1 month ago' : `${m} months ago`;
		}
		const y = Math.floor(days / 365);
		return y === 1 ? '1 year ago' : `${y} years ago`;
	}

	async function doDelete() {
		if (!confirmTarget) return;
		const target = confirmTarget;
		deleting = true;
		const { error: err } = await supabase
			.from('decks')
			.delete()
			.eq('id', target.id);
		deleting = false;
		confirmTarget = null;
		if (err) {
			toastRef?.show(err.message, { variant: 'simple' });
			return;
		}
		decks = decks.filter((d) => d.id !== target.id);
		toastRef?.show(`Deleted "${target.name}".`);
	}

	function menuItems(/** @type {(typeof decks)[number]} */ deck) {
		return [
			{ label: 'Edit', onclick: () => goto(`/admin/decks/${deck.id}`) },
			{ separator: true },
			{
				label: 'Delete',
				onclick: () =>
					(confirmTarget = { id: deck.id, name: deck.name }),
				danger: true,
			},
		];
	}
</script>

<div class="decks">
	<!-- Page header -->
	<div class="decks__header">
		<div>
			<h1 class="decks__title">Decks</h1>
			<p class="decks__subtitle">
				Themed collections that players draw cards from.
				<span class="mono decks__stat">{decks.length}</span> decks ·
				<span class="mono decks__stat">{totalCards}</span> total cards.
			</p>
		</div>
		<div class="decks__actions">
			<a class="decks__btn decks__btn--primary" href="/admin/decks/new">
				<Plus size={14} />
				New deck
			</a>
		</div>
	</div>

	<!-- Filter bar -->
	<div class="decks__filters">
		<div class="decks__search">
			<Search size={14} />
			<input
				type="text"
				placeholder="Search decks…"
				bind:value={filterText}
			/>
			{#if filterText}
				<button
					class="decks__search-clear"
					onclick={() => (filterText = '')}
					aria-label="Clear search"
				>
					<X size={12} />
				</button>
			{/if}
		</div>
		<div class="decks__filters-spacer"></div>
		<span class="decks__counter mono">
			<span class="decks__counter-num">{filtered.length}</span>
			<span class="decks__counter-sep">/</span>
			<span>{decks.length}</span>
		</span>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="decks__status">Loading…</div>
	{:else if error}
		<div class="decks__status decks__status--error">{error}</div>
	{:else if decks.length === 0}
		<EmptyState
			title="No decks yet."
			body="Create your first deck to start grouping questions."
		>
			{#snippet icon()}
				<Layers size={18} />
			{/snippet}
		</EmptyState>
	{:else if filtered.length === 0}
		<EmptyState title="No decks match." body="Clear the search to see all.">
			{#snippet icon()}
				<Search size={18} />
			{/snippet}
		</EmptyState>
	{:else}
		<!-- Desktop table -->
		<div class="decks__table">
			<div class="decks__table-head">
				<span></span>
				<span class="decks__col-label">Deck</span>
				<span class="decks__col-label">Cards</span>
				<span class="decks__col-label">Created</span>
				<span></span>
			</div>
			{#each filtered as deck (deck.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="decks__row"
					onclick={() => goto(`/admin/decks/${deck.id}`)}
				>
					<DeckBadge
						icon={deck.icon}
						image={deck.image_url}
						size={40}
					/>
					<div class="decks__row-main">
						<div class="decks__row-name">{deck.name}</div>
						{#if deck.description}
							<div class="decks__row-desc">
								{deck.description}
							</div>
						{/if}
					</div>
					<span class="decks__row-count mono">
						{cardCounts.get(deck.id) ?? 0}
					</span>
					<span class="decks__row-created">
						{relativeTime(deck.created_at)}
					</span>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="decks__row-actions"
						onclick={(e) => e.stopPropagation()}
					>
						<DropdownMenu items={menuItems(deck)} />
					</div>
				</div>
			{/each}
		</div>

		<!-- Mobile cards -->
		<div class="decks__cards">
			{#each filtered as deck (deck.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="decks__card"
					onclick={() => goto(`/admin/decks/${deck.id}`)}
				>
					<DeckBadge
						icon={deck.icon}
						image={deck.image_url}
						size={44}
					/>
					<div class="decks__card-main">
						<div class="decks__card-name">{deck.name}</div>
						{#if deck.description}
							<div class="decks__card-desc">
								{deck.description}
							</div>
						{/if}
					</div>
					<div class="decks__card-count">
						<div class="decks__card-count-num mono">
							{cardCounts.get(deck.id) ?? 0}
						</div>
						<div class="decks__card-count-label">cards</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog
	open={!!confirmTarget}
	onclose={() => (confirmTarget = null)}
	title={confirmTarget ? `Delete "${confirmTarget.name}"?` : ''}
	description="This permanently deletes the deck and all of its questions. This cannot be undone."
	danger
	confirmLabel={deleting ? 'Deleting…' : 'Delete'}
	onconfirm={doDelete}
/>

<Toast bind:this={toastRef} />

<style>
	/* ─── Page header ──────────────────────────────────────────── */

	.decks__header {
		display: flex;
		margin-bottom: 4px;
		align-items: flex-start;
		justify-content: space-between;
	}

	.decks__title {
		margin: 0;

		font-size: 1.5rem;
		text-wrap: balance;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.decks__subtitle {
		margin: 4px 0 0;

		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.decks__stat {
		color: var(--fg);
	}

	.decks__actions {
		display: flex;
		align-items: center;

		gap: 8px;
	}

	/* ─── Buttons ──────────────────────────────────────────────── */

	.decks__btn {
		display: inline-flex;
		align-items: center;
		height: var(--h-button);
		padding: 0 14px;

		font-size: 0.75rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;

		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 6px;
	}

	.decks__btn--primary {
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);
	}

	.decks__btn--primary:hover {
		background: var(--accent-hover);
	}

	/* ─── Filter bar ───────────────────────────────────────────── */

	.decks__filters {
		display: flex;
		margin: 0 -24px;
		padding: 14px 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		background: var(--bg);

		flex-wrap: wrap;
		gap: 8px;
	}

	.decks__search {
		display: flex;
		height: var(--h-button);
		max-width: 360px;
		padding: 0 12px;
		align-items: center;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;

		flex: 1 1 220px;
		gap: 8px;
	}

	.decks__search:focus-within {
		border-color: var(--border-strong);
	}

	.decks__search :global(svg:first-child) {
		color: var(--fg-faint);

		flex-shrink: 0;
	}

	.decks__search input {
		min-width: 0;

		font-size: 0.875rem;

		color: var(--fg);
		background: transparent;
		border: 0;
		outline: none;

		flex: 1;
	}

	.decks__search input::placeholder {
		color: var(--fg-faint);
	}

	.decks__search-clear {
		display: grid;
		width: 18px;
		height: 18px;

		color: var(--fg-faint);
		border-radius: 3px;

		place-items: center;
		flex-shrink: 0;
	}

	.decks__search-clear:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.decks__filters-spacer {
		flex: 1;
	}

	.decks__counter {
		display: inline-flex;
		align-items: center;
		padding: 0 4px;

		font-size: 0.6875rem;

		color: var(--fg-mute);

		gap: 6px;
	}

	.decks__counter-num {
		color: var(--fg);
	}

	.decks__counter-sep {
		color: var(--fg-faint);
	}

	/* ─── Status ───────────────────────────────────────────────── */

	.decks__status {
		padding: 48px 24px;

		font-size: 0.75rem;
		text-align: center;

		color: var(--fg-mute);
	}

	.decks__status--error {
		color: var(--danger);
	}

	/* ─── Desktop table ────────────────────────────────────────── */

	.decks__table {
		margin: 0 -24px;
	}

	.decks__table-head {
		display: grid;
		height: 36px;
		padding: 0 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		background: var(--bg-2);

		grid-template-columns: 64px 1fr 120px 120px 80px;
		gap: 16px;
	}

	.decks__col-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.decks__row {
		display: grid;
		min-height: 62px;
		padding: 0 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		cursor: pointer;

		transition: background 80ms ease;

		grid-template-columns: 64px 1fr 120px 120px 80px;
		gap: 16px;
	}

	.decks__row:hover {
		background: var(--surface);
	}

	.decks__row-main {
		min-width: 0;
	}

	.decks__row-name {
		font-size: 0.875rem;
		font-weight: 500;

		color: var(--fg);
	}

	.decks__row-desc {
		overflow: hidden;
		margin-top: 2px;

		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg-mute);
	}

	.decks__row-count {
		font-size: 0.75rem;

		color: var(--fg);
	}

	.decks__row-created {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.decks__row-actions {
		display: flex;
		align-items: center;
		justify-self: end;

		gap: 4px;
	}

	/* ─── Mobile cards ─────────────────────────────────────────── */

	.decks__cards {
		display: none;
		margin: 0 -24px;
		padding: 12px 24px;

		flex-direction: column;
		gap: 8px;
	}

	.decks__card {
		display: flex;
		padding: 12px;
		align-items: center;

		text-align: left;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);
		cursor: pointer;

		transition: border-color 80ms ease;

		gap: 12px;
	}

	.decks__card:hover {
		border-color: var(--border-strong);
	}

	.decks__card-main {
		min-width: 0;

		flex: 1;
	}

	.decks__card-name {
		font-size: 0.875rem;
		font-weight: 500;

		color: var(--fg);
	}

	.decks__card-desc {
		overflow: hidden;
		margin-top: 2px;

		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg-mute);
	}

	.decks__card-count {
		text-align: right;
	}

	.decks__card-count-num {
		font-size: 1rem;

		color: var(--fg);
	}

	.decks__card-count-label {
		font-size: 0.625rem;

		color: var(--fg-faint);
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.decks__header {
			flex-direction: column;
			gap: 12px;
		}

		.decks__search {
			max-width: 100%;

			flex-basis: 100%;
		}

		.decks__table {
			display: none;
		}

		.decks__cards {
			display: flex;
		}
	}
</style>
