<script>
	import { supabase } from '../lib/supabase.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import { ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const QUESTIONS_FILTERS_KEY = 'clever11-admin-questions-filters';
	const SORT_FIELDS = new Set(['question_text', 'question_number', 'votes']);

	function readPersistedFilters() {
		if (typeof sessionStorage === 'undefined') return null;
		try {
			const raw = sessionStorage.getItem(QUESTIONS_FILTERS_KEY);
			if (!raw) return null;
			const o = JSON.parse(raw);
			if (!o || typeof o !== 'object') return null;
			const sf =
				typeof o.sortField === 'string' && SORT_FIELDS.has(o.sortField)
					? o.sortField
					: 'question_text';
			return {
				filterDeckId:
					typeof o.filterDeckId === 'string' ? o.filterDeckId : '',
				filterType:
					typeof o.filterType === 'string' ? o.filterType : '',
				filterText:
					typeof o.filterText === 'string' ? o.filterText : '',
				showArchived: Boolean(o.showArchived),
				sortField: sf,
				sortAsc: typeof o.sortAsc === 'boolean' ? o.sortAsc : true,
			};
		} catch {
			return null;
		}
	}

	function writePersistedFilters(
		/** @type {{ filterDeckId: string, filterType: string, filterText: string, showArchived: boolean, sortField: string, sortAsc: boolean }} */ snapshot,
	) {
		if (typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.setItem(
				QUESTIONS_FILTERS_KEY,
				JSON.stringify(snapshot),
			);
		} catch {
			/* quota / private mode */
		}
	}

	const persisted = readPersistedFilters();

	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();

	/** @type {{ id: string, question_text: string, type: string, question_number: number|null, archived_at: string|null, decks: { name: string }|null }[]} */
	let questions = $state([]);
	let loading = $state(true);
	let error = $state('');
	let filterDeckId = $state(persisted?.filterDeckId ?? '');
	let filterType = $state(persisted?.filterType ?? '');
	let filterText = $state(persisted?.filterText ?? '');
	let showArchived = $state(persisted?.showArchived ?? false);
	let sortField = $state(persisted?.sortField ?? 'question_text');
	let sortAsc = $state(persisted?.sortAsc ?? true);
	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	/** @type {SvelteMap<string, { up: number, down: number }>} */
	let voteCounts = new SvelteMap();

	$effect(() => {
		writePersistedFilters({
			filterDeckId,
			filterType,
			filterText,
			showArchived,
			sortField,
			sortAsc,
		});
	});

	$effect(() => {
		init();
	});

	async function init() {
		const [{ data: deckData }] = await Promise.all([
			supabase.from('decks').select('id, name').order('name'),
		]);
		decks = deckData ?? [];
		await fetchQuestions();
		await loadVoteCounts();
		loading = false;
	}

	async function fetchQuestions() {
		let query = supabase
			.from('questions')
			.select(
				'id, question_text, type, question_number, archived_at, decks(name)',
			)
			.order('created_at', { ascending: false });
		if (!showArchived) query = query.is('archived_at', null);
		if (filterDeckId) query = query.eq('deck_id', filterDeckId);
		if (filterType) query = query.eq('type', filterType);
		const { data, error: err } = await query;
		if (err) error = err.message;
		else questions = data ?? [];
	}

	async function loadVoteCounts() {
		const { data: votes } = await supabase
			.from('question_votes')
			.select('question_id, vote');
		voteCounts.clear();
		if (!votes) return;
		for (const v of votes) {
			const entry = voteCounts.get(v.question_id) ?? { up: 0, down: 0 };
			if (v.vote) entry.up++;
			else entry.down++;
			voteCounts.set(v.question_id, entry);
		}
	}

	const filtered = $derived(
		questions.filter((q) => {
			if (filterType && q.type !== filterType) return false;
			if (filterDeckId) {
				// We need deck_id — fetch via joined name is approximate; re-filter by deck
				// Deck filter works by re-querying; for now, filter by deck name
			}
			if (
				filterText &&
				!q.question_text
					.toLowerCase()
					.includes(filterText.toLowerCase())
			)
				return false;
			return true;
		}),
	);

	function netVotes(/** @type {string} */ id) {
		const v = voteCounts.get(id);
		return v ? v.up - v.down : 0;
	}

	const sorted = $derived(
		[...filtered].sort((a, b) => {
			const cmp =
				sortField === 'question_number'
					? (a.question_number ?? 0) - (b.question_number ?? 0)
					: sortField === 'votes'
						? netVotes(a.id) - netVotes(b.id)
						: a.question_text.localeCompare(b.question_text, 'sv');
			return sortAsc ? cmp : -cmp;
		}),
	);

	async function applyFilter() {
		loading = true;
		await fetchQuestions();
		await loadVoteCounts();
		loading = false;
	}

	function toggleSort(/** @type {string} */ field) {
		if (sortField === field) {
			sortAsc = !sortAsc;
		} else {
			sortField = field;
			sortAsc = field === 'question_number';
		}
	}

	function sortIndicator(/** @type {string} */ field) {
		if (sortField !== field) return '';
		return sortAsc ? ' ↑' : ' ↓';
	}

	async function archiveQuestion(/** @type {string} */ id) {
		if (
			!confirm(
				'Archive this question? It will no longer appear in games.',
			)
		)
			return;
		const { error: err } = await supabase
			.from('questions')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (err) {
			alert(err.message);
			return;
		}
		questions = questions.filter((q) => q.id !== id);
	}

	async function restoreQuestion(/** @type {string} */ id) {
		const { error: err } = await supabase
			.from('questions')
			.update({ archived_at: null })
			.eq('id', id);
		if (err) {
			alert(err.message);
			return;
		}
		questions = questions.filter((q) => q.id !== id);
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<h1 class="admin-page__title">Questions</h1>
		<button
			class="admin-btn"
			type="button"
			onclick={() => navigate('/questions/import')}
		>
			Import cards
		</button>
		<button
			class="admin-btn admin-btn--primary"
			type="button"
			onclick={() => navigate('/questions/new')}
		>
			New question
		</button>
	</div>

	<div class="admin-filters">
		<select
			class="admin-select"
			bind:value={filterDeckId}
			onchange={applyFilter}
		>
			<option value="">All decks</option>
			{#each decks as deck (deck.id)}
				<option value={deck.id}>{deck.name}</option>
			{/each}
		</select>
		<select
			class="admin-select"
			bind:value={filterType}
			onchange={applyFilter}
		>
			<option value="">All types</option>
			{#each Object.entries(QUESTION_TYPES) as [key, config] (key)}
				<option value={key}>{config.label}</option>
			{/each}
		</select>
		<input
			class="admin-input admin-input--inline"
			type="search"
			placeholder="Search questions…"
			bind:value={filterText}
		/>
		<label class="admin-toggle-wrap">
			<input
				type="checkbox"
				bind:checked={showArchived}
				onchange={applyFilter}
			/>
			<span class="admin-toggle" class:admin-toggle--on={showArchived}
				>Archived</span
			>
		</label>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else if error}
		<p class="admin-form-error">{error}</p>
	{:else if filtered.length === 0}
		<p class="admin-hint">No questions found.</p>
	{:else}
		<div class="admin-list admin-list--grid">
			<div class="admin-list__header">
				<span
					class="admin-list__col admin-list__col--sortable{sortField ===
					'question_number'
						? ' admin-list__col--active'
						: ''}"
					role="button"
					tabindex="0"
					onclick={() => toggleSort('question_number')}
					onkeydown={(e) =>
						e.key === 'Enter' && toggleSort('question_number')}
					>#{sortIndicator('question_number')}</span
				>
				<span class="admin-list__col">Type</span>
				<span
					class="admin-list__col admin-list__col--sortable{sortField ===
					'question_text'
						? ' admin-list__col--active'
						: ''}"
					role="button"
					tabindex="0"
					onclick={() => toggleSort('question_text')}
					onkeydown={(e) =>
						e.key === 'Enter' && toggleSort('question_text')}
					>Question{sortIndicator('question_text')}</span
				>
				<span class="admin-list__col">Deck</span>
				<span
					class="admin-list__col admin-list__col--sortable{sortField ===
					'votes'
						? ' admin-list__col--active'
						: ''}"
					role="button"
					tabindex="0"
					onclick={() => toggleSort('votes')}
					onkeydown={(e) => e.key === 'Enter' && toggleSort('votes')}
					>Votes{sortIndicator('votes')}</span
				>
				<span class="admin-list__col"></span>
			</div>
			{#each sorted as q (q.id)}
				{@const typeConfig = QUESTION_TYPES[q.type]}
				{@const votes = voteCounts.get(q.id)}
				<div class="admin-list__item">
					<span class="admin-list__num"
						>{q.question_number
							? `#${q.question_number}`
							: ''}</span
					>
					<span class="admin-list__badge" data-type={q.type}
						>{typeConfig?.label ?? q.type}</span
					>
					<span class="admin-list__name">{q.question_text}</span>
					<span class="admin-list__meta">{q.decks?.name ?? '—'}</span>
					<span class="admin-list__votes">
						{#if votes?.up}
							<span
								class="admin-list__vote admin-list__vote--up"
								title="Thumbs up"
							>
								<ThumbsUp size={12} />{votes.up}
							</span>
						{/if}
						{#if votes?.down}
							<span
								class="admin-list__vote admin-list__vote--down"
								title="Thumbs down"
							>
								<ThumbsDown size={12} />{votes.down}
							</span>
						{/if}
					</span>
					<div class="admin-list__actions">
						<a
							class="admin-btn admin-btn--sm"
							href={`/admin#/questions/${q.id}`}>Edit</a
						>
						{#if q.archived_at}
							<button
								class="admin-btn admin-btn--sm"
								type="button"
								onclick={() => restoreQuestion(q.id)}
								>Restore</button
							>
						{:else}
							<button
								class="admin-btn admin-btn--sm admin-btn--danger"
								type="button"
								onclick={() => archiveQuestion(q.id)}
								>Archive</button
							>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<p class="admin-hint">
			{filtered.length} question{filtered.length !== 1 ? 's' : ''}
		</p>
	{/if}
</div>
