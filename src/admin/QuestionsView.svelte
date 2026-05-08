<script>
	import { supabase } from '../lib/supabase.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';

	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();

	/** @type {{ id: string, question_text: string, type: string, question_number: number|null, decks: { name: string }|null }[]} */
	let questions = $state([]);
	let loading = $state(true);
	let error = $state('');
	let filterDeckId = $state('');
	let filterType = $state('');
	let filterText = $state('');
	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);

	$effect(() => { init(); });

	async function init() {
		const [{ data: deckData }, { data: qData, error: qErr }] = await Promise.all([
			supabase.from('decks').select('id, name').order('name'),
			supabase.from('questions').select('id, question_text, type, question_number, decks(name)').order('created_at', { ascending: false }),
		]);
		decks = deckData ?? [];
		if (qErr) { error = qErr.message; }
		else { questions = qData ?? []; }
		loading = false;
	}

	const filtered = $derived(
		questions.filter((q) => {
			if (filterType && q.type !== filterType) return false;
			if (filterDeckId) {
				// We need deck_id — fetch via joined name is approximate; re-filter by deck
				// Deck filter works by re-querying; for now, filter by deck name
			}
			if (filterText && !q.question_text.toLowerCase().includes(filterText.toLowerCase())) return false;
			return true;
		}),
	);

	async function applyDeckFilter() {
		loading = true;
		let query = supabase
			.from('questions')
			.select('id, question_text, type, question_number, decks(name)')
			.order('created_at', { ascending: false });
		if (filterDeckId) query = query.eq('deck_id', filterDeckId);
		if (filterType) query = query.eq('type', filterType);
		const { data, error: err } = await query;
		if (err) error = err.message;
		else questions = data ?? [];
		loading = false;
	}

	async function deleteQuestion(/** @type {string} */ id) {
		if (!confirm('Delete this question?')) return;
		const { error: err } = await supabase.from('questions').delete().eq('id', id);
		if (err) { alert(err.message); return; }
		questions = questions.filter((q) => q.id !== id);
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<h1 class="admin-page__title">Questions</h1>
		<button class="admin-btn" type="button" onclick={() => navigate('/questions/import')}>
			Import cards
		</button>
		<button class="admin-btn admin-btn--primary" type="button" onclick={() => navigate('/questions/new')}>
			New question
		</button>
	</div>

	<div class="admin-filters">
		<select class="admin-select" bind:value={filterDeckId} onchange={applyDeckFilter}>
			<option value="">All decks</option>
			{#each decks as deck (deck.id)}
				<option value={deck.id}>{deck.name}</option>
			{/each}
		</select>
		<select class="admin-select" bind:value={filterType} onchange={applyDeckFilter}>
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
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else if error}
		<p class="admin-form-error">{error}</p>
	{:else if filtered.length === 0}
		<p class="admin-hint">No questions found.</p>
	{:else}
		<ul class="admin-list">
			{#each filtered as q (q.id)}
				{@const typeConfig = QUESTION_TYPES[q.type]}
				<li class="admin-list__item">
					{#if q.question_number}
						<span class="admin-list__num">#{q.question_number}</span>
					{/if}
					<span class="admin-list__badge" data-type={q.type}>{typeConfig?.label ?? q.type}</span>
					<span class="admin-list__name">{q.question_text}</span>
					<span class="admin-list__meta">{q.decks?.name ?? '—'}</span>
					<div class="admin-list__actions">
						<a class="admin-btn admin-btn--sm" href={`/admin#/questions/${q.id}`}>Edit</a>
						<button class="admin-btn admin-btn--sm admin-btn--danger" type="button" onclick={() => deleteQuestion(q.id)}>Delete</button>
					</div>
				</li>
			{/each}
		</ul>
		<p class="admin-hint">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</p>
	{/if}
</div>
