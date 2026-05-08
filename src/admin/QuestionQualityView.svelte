<script>
	import { supabase } from '../lib/supabase.js';
	import { ThumbsUp, ThumbsDown } from 'lucide-svelte';

	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let filterDeckId = $state('');
	let loading = $state(true);
	let error = $state('');

	/**
	 * @typedef {{
	 *   id: string,
	 *   question_text: string,
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

	$effect(() => { init(); });

	async function init() {
		loading = true;
		error = '';

		try {
			const [decksResult, votesResult, roundsResult, questionsResult] = await Promise.all([
				supabase.from('decks').select('id, name').order('name'),
				supabase.from('question_votes').select('question_id, vote'),
				supabase.from('game_rounds').select('question_id'),
				supabase
					.from('questions')
					.select('id, question_text, deck_id, decks(name)'),
			]);

			if (decksResult.error) throw decksResult.error;
			if (votesResult.error) throw votesResult.error;
			if (roundsResult.error) throw roundsResult.error;
			if (questionsResult.error) throw questionsResult.error;

			decks = decksResult.data ?? [];

			// Build vote counts map: question_id -> { up, down }
			/** @type {Map<string, { up: number, down: number }>} */
			const voteMap = new Map();
			for (const v of votesResult.data ?? []) {
				const entry = voteMap.get(v.question_id) ?? { up: 0, down: 0 };
				if (v.vote) entry.up++;
				else entry.down++;
				voteMap.set(v.question_id, entry);
			}

			// Build play counts map: question_id -> count of rounds
			/** @type {Map<string, number>} */
			const playMap = new Map();
			for (const r of roundsResult.data ?? []) {
				if (r.question_id) {
					playMap.set(r.question_id, (playMap.get(r.question_id) ?? 0) + 1);
				}
			}

			// Build question lookup
			const questions = questionsResult.data ?? [];

			// Only include questions that have at least one vote
			/** @type {QualityRow[]} */
			const result = [];
			for (const q of questions) {
				const votes = voteMap.get(q.id);
				if (!votes) continue;
				result.push({
					id: q.id,
					question_text: q.question_text,
					deck_name: q.decks?.name ?? '—',
					deck_id: q.deck_id,
					up: votes.up,
					down: votes.down,
					net: votes.up - votes.down,
					times_played: playMap.get(q.id) ?? 0,
				});
			}

			// Sort by net score ascending (worst first)
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
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<h1 class="admin-page__title">Question Quality</h1>
	</div>

	<div class="admin-filters">
		<select class="admin-select" bind:value={filterDeckId}>
			<option value="">All decks</option>
			{#each decks as deck (deck.id)}
				<option value={deck.id}>{deck.name}</option>
			{/each}
		</select>
	</div>

	{#if loading}
		<p class="admin-hint">Loading...</p>
	{:else if error}
		<p class="admin-form-error">{error}</p>
	{:else if filtered.length === 0}
		<p class="admin-hint">No voted questions found{filterDeckId ? ' in this deck' : ''}.</p>
	{:else}
		<table class="admin-table">
			<thead>
				<tr>
					<th>Question</th>
					<th>Deck</th>
					<th style="text-align:center">
						<ThumbsUp size={12} />
					</th>
					<th style="text-align:center">
						<ThumbsDown size={12} />
					</th>
					<th style="text-align:center">Net</th>
					<th style="text-align:center">Played</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as row (row.id)}
					<tr>
						<td class="quality-question">{row.question_text}</td>
						<td class="quality-deck">{row.deck_name}</td>
						<td style="text-align:center">
							{#if row.up}
								<span class="quality-vote quality-vote--up">{row.up}</span>
							{:else}
								<span class="quality-vote quality-vote--zero">0</span>
							{/if}
						</td>
						<td style="text-align:center">
							{#if row.down}
								<span class="quality-vote quality-vote--down">{row.down}</span>
							{:else}
								<span class="quality-vote quality-vote--zero">0</span>
							{/if}
						</td>
						<td style="text-align:center">
							<span class="quality-net" class:quality-net--negative={row.net < 0} class:quality-net--positive={row.net > 0}>{row.net > 0 ? '+' : ''}{row.net}</span>
						</td>
						<td style="text-align:center">
							<span class="quality-played">{row.times_played}</span>
						</td>
						<td>
							<a class="admin-btn admin-btn--sm" href={`/admin#/questions/${row.id}`}>Edit</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="admin-hint" style="margin-top:12px">{filtered.length} question{filtered.length !== 1 ? 's' : ''} with votes</p>
	{/if}
</div>

<style>
	.quality-question {
		max-width: 340px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quality-deck {
		color: #555;
		font-size: 12px;
		white-space: nowrap;
	}

	.quality-vote {
		font-size: 12px;
		font-weight: 600;
	}

	.quality-vote--up {
		color: #4ade80;
	}

	.quality-vote--down {
		color: #f87171;
	}

	.quality-vote--zero {
		color: #444;
	}

	.quality-net {
		font-size: 13px;
		font-weight: 700;
		color: #888;
	}

	.quality-net--negative {
		color: #f87171;
	}

	.quality-net--positive {
		color: #4ade80;
	}

	.quality-played {
		font-size: 12px;
		color: #888;
	}
</style>
