<script>
	import { supabase } from '$lib/supabase.js';
	import { BarChart3 } from 'lucide-svelte';
	import TypeBadge from './components/TypeBadge.svelte';
	import VoteChips from './components/VoteChips.svelte';
	import SortHeader from './components/SortHeader.svelte';
	import EmptyState from './components/EmptyState.svelte';
	import Select from './components/Select.svelte';

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let filterDeckId = $state('');
	let loading = $state(true);
	let error = $state('');
	let sortField = $state('net');
	let sortAsc = $state(true);

	/**
	 * @typedef {{
	 *   id: string,
	 *   question_text: string,
	 *   question_number: number|null,
	 *   type: string,
	 *   deck_name: string,
	 *   deck_id: string,
	 *   up: number,
	 *   down: number,
	 *   net: number,
	 *   times_played: number,
	 * }} QualityRow
	 */

	/** @type {QualityRow[]} */
	let rows = $state([]);

	$effect(() => {
		init();
	});

	async function init() {
		loading = true;
		error = '';

		try {
			const [decksResult, votesResult, roundsResult, questionsResult] =
				await Promise.all([
					supabase.from('decks').select('id, name').order('name'),
					supabase.from('question_votes').select('question_id, vote'),
					supabase.from('game_rounds').select('question_id'),
					supabase
						.from('questions')
						.select(
							'id, question_text, question_number, type, deck_id, decks(name)',
						),
				]);

			if (decksResult.error) throw decksResult.error;
			if (votesResult.error) throw votesResult.error;
			if (roundsResult.error) throw roundsResult.error;
			if (questionsResult.error) throw questionsResult.error;

			decks = decksResult.data ?? [];

			/** @type {Map<string, { up: number, down: number }>} */
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const voteMap = new Map();
			for (const v of votesResult.data ?? []) {
				const entry = voteMap.get(v.question_id) ?? { up: 0, down: 0 };
				if (v.vote) entry.up++;
				else entry.down++;
				voteMap.set(v.question_id, entry);
			}

			/** @type {Map<string, number>} */
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const playMap = new Map();
			for (const r of roundsResult.data ?? []) {
				if (r.question_id) {
					playMap.set(
						r.question_id,
						(playMap.get(r.question_id) ?? 0) + 1,
					);
				}
			}

			const questions = questionsResult.data ?? [];

			/** @type {QualityRow[]} */
			const result = [];
			for (const q of questions) {
				const votes = voteMap.get(q.id);
				if (!votes) continue;
				result.push({
					id: q.id,
					question_text: q.question_text,
					question_number: q.question_number,
					type: q.type,
					deck_name: q.decks?.name ?? '—',
					deck_id: q.deck_id,
					up: votes.up,
					down: votes.down,
					net: votes.up - votes.down,
					times_played: playMap.get(q.id) ?? 0,
				});
			}

			result.sort((a, b) => a.net - b.net);
			rows = result;
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	const filtered = $derived(
		filterDeckId ? rows.filter((r) => r.deck_id === filterDeckId) : rows,
	);

	const sorted = $derived(
		[...filtered].sort((a, b) => {
			let cmp;
			if (sortField === 'question_number') {
				cmp = (a.question_number ?? 0) - (b.question_number ?? 0);
			} else if (sortField === 'net') {
				cmp = a.net - b.net;
			} else if (sortField === 'times_played') {
				cmp = a.times_played - b.times_played;
			} else {
				cmp = a.question_text.localeCompare(b.question_text, 'sv');
			}
			return sortAsc ? cmp : -cmp;
		}),
	);

	function handleSort(/** @type {string} */ key) {
		if (sortField === key) {
			sortAsc = !sortAsc;
		} else {
			sortField = key;
			sortAsc = key === 'question_number';
		}
	}

	function handleDeckChange(/** @type {string|null} */ val) {
		filterDeckId = val ?? '';
	}

	const deckOptions = $derived(
		decks.map((d) => ({ value: d.id, label: d.name })),
	);
</script>

<div class="qq">
	<div class="qq__header">
		<h1 class="qq__title">Question Quality</h1>
		<p class="qq__subtitle">
			Questions sorted by player vote score. Worst first.
		</p>
	</div>

	<div class="qq__filters">
		<Select
			label="Deck"
			value={filterDeckId || null}
			options={deckOptions}
			onchange={handleDeckChange}
			allowClear
		/>
		<div class="qq__filters-spacer"></div>
		<span class="qq__counter mono">
			<span class="qq__counter-num">{sorted.length}</span>
			<span class="qq__counter-sep">/</span>
			<span>{rows.length}</span>
		</span>
	</div>

	{#if loading}
		<div class="qq__status">Loading…</div>
	{:else if error}
		<div class="qq__status qq__status--error">{error}</div>
	{:else if sorted.length === 0}
		<EmptyState
			title={filterDeckId
				? 'No voted questions in this deck.'
				: 'No voted questions found.'}
			body="Questions appear here once players start voting."
		>
			{#snippet icon()}
				<BarChart3 size={18} />
			{/snippet}
		</EmptyState>
	{:else}
		<!-- Desktop table -->
		<div class="qq__table">
			<div class="qq__table-head">
				<SortHeader
					label="#"
					sortKey="question_number"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<span class="qq__col-label">Type</span>
				<SortHeader
					label="Question"
					sortKey="question_text"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<span class="qq__col-label">Deck</span>
				<SortHeader
					label="Votes"
					sortKey="net"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<SortHeader
					label="Played"
					sortKey="times_played"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
					align="right"
				/>
			</div>
			{#each sorted as row (row.id)}
				<a class="qq__row" href={`/admin/questions/${row.id}`}>
					<span class="qq__row-num mono">
						{row.question_number ? `#${row.question_number}` : ''}
					</span>
					<TypeBadge type={row.type} />
					<span class="qq__row-text">{row.question_text}</span>
					<span class="qq__row-deck">{row.deck_name}</span>
					<VoteChips up={row.up} down={row.down} />
					<span class="qq__row-played mono">
						{row.times_played}
					</span>
				</a>
			{/each}
		</div>

		<!-- Mobile cards -->
		<div class="qq__cards">
			{#each sorted as row (row.id)}
				<a class="qq__card" href={`/admin/questions/${row.id}`}>
					<div class="qq__card-top">
						<span class="qq__card-num mono">
							{row.question_number
								? `#${row.question_number}`
								: ''}
						</span>
						<TypeBadge type={row.type} />
					</div>
					<div class="qq__card-text">{row.question_text}</div>
					<div class="qq__card-meta">
						<span>{row.deck_name}</span>
						<span class="qq__card-dot"></span>
						<VoteChips up={row.up} down={row.down} compact />
						<span class="qq__card-dot"></span>
						<span>{row.times_played}× played</span>
					</div>
				</a>
			{/each}
		</div>

		<div class="qq__hint">
			{sorted.length} question{sorted.length !== 1 ? 's' : ''} with votes
		</div>
	{/if}
</div>

<style>
	/* ─── Page header ──────────────────────────────────────────── */

	.qq__header {
		margin-bottom: 4px;
	}

	.qq__title {
		margin: 0;

		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.qq__subtitle {
		margin: 4px 0 0;

		font-size: 13px;

		color: var(--fg-mute);
	}

	/* ─── Filter bar ───────────────────────────────────────────── */

	.qq__filters {
		display: flex;
		margin: 0 -24px;
		padding: 14px 24px;
		align-items: center;

		background: var(--bg);
		border-bottom: 1px solid var(--border);

		flex-wrap: wrap;
		gap: 8px;
	}

	.qq__filters-spacer {
		flex: 1;
	}

	.qq__counter {
		display: inline-flex;
		padding: 0 4px;
		align-items: center;

		font-size: 11.5px;

		color: var(--fg-mute);

		gap: 6px;
	}

	.qq__counter-num {
		color: var(--fg);
	}

	.qq__counter-sep {
		color: var(--fg-faint);
	}

	/* ─── Status ───────────────────────────────────────────────── */

	.qq__status {
		padding: 48px 24px;

		font-size: 13px;
		text-align: center;

		color: var(--fg-mute);
	}

	.qq__status--error {
		color: var(--danger);
	}

	/* ─── Desktop table ────────────────────────────────────────── */

	.qq__table {
		margin: 0 -24px;
	}

	.qq__table-head {
		display: grid;
		height: 36px;
		padding: 0 24px;
		align-items: center;

		background: var(--bg-2);
		border-bottom: 1px solid var(--border);

		grid-template-columns: 64px 88px 1fr 120px 124px 64px;
		gap: 16px;
	}

	.qq__col-label {
		font-size: 11.5px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.qq__row {
		display: grid;
		min-height: 52px;
		padding: 0 24px;
		align-items: center;

		text-decoration: none;

		color: inherit;
		border-bottom: 1px solid var(--border);
		cursor: pointer;

		transition: background 80ms ease;

		grid-template-columns: 64px 88px 1fr 120px 124px 64px;
		gap: 16px;
	}

	.qq__row:hover {
		background: var(--surface);
	}

	.qq__row-num {
		font-size: 12px;

		color: var(--fg-mute);
	}

	.qq__row-text {
		overflow: hidden;

		font-size: 13.5px;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.qq__row-deck {
		font-size: 12.5px;

		color: var(--fg-mute);
	}

	.qq__row-played {
		font-size: 12px;
		text-align: right;

		color: var(--fg-mute);
	}

	/* ─── Hint ─────────────────────────────────────────────────── */

	.qq__hint {
		margin-top: 12px;

		font-size: 12px;

		color: var(--fg-faint);
	}

	/* ─── Mobile cards ─────────────────────────────────────────── */

	.qq__cards {
		display: none;
		margin: 0 -24px;
		padding: 12px 24px;

		flex-direction: column;
		gap: 8px;
	}

	.qq__card {
		display: block;
		padding: 12px;

		text-decoration: none;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);
		cursor: pointer;

		transition: border-color 80ms ease;
	}

	.qq__card:hover {
		border-color: var(--border-strong);
	}

	.qq__card-top {
		display: flex;
		margin-bottom: 8px;
		align-items: center;

		gap: 8px;
	}

	.qq__card-num {
		font-size: 11px;

		color: var(--fg-mute);
	}

	.qq__card-text {
		margin-bottom: 8px;

		font-size: 14px;
		line-height: 1.4;

		color: var(--fg);
	}

	.qq__card-meta {
		display: flex;
		align-items: center;

		font-size: 12px;

		color: var(--fg-mute);

		gap: 10px;
	}

	.qq__card-dot {
		width: 2px;
		height: 2px;

		background: var(--border-strong);
		border-radius: 50%;
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.qq__table {
			display: none;
		}

		.qq__cards {
			display: flex;
		}
	}
</style>
