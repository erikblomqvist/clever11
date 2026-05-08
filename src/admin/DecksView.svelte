<script>
	import LucideIcon from '../components/LucideIcon.svelte';
	import { supabase } from '../lib/supabase.js';
	import { getDeckIconNode } from '../lib/deckIcons.js';

	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();

	/** @type {{ id: string, name: string, description: string|null, icon: string|null, image_url: string|null }[]} */
	let decks = $state([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		loadDecks();
	});

	async function loadDecks() {
		loading = true;
		const { data, error: err } = await supabase
			.from('decks')
			.select('id, name, description, icon, image_url')
			.order('name');
		if (err) { error = err.message; }
		else { decks = data ?? []; }
		loading = false;
	}

	async function deleteDeck(/** @type {string} */ id) {
		if (!confirm('Delete this deck? All its questions will also be deleted.')) return;
		const { error: err } = await supabase.from('decks').delete().eq('id', id);
		if (err) { alert(err.message); return; }
		decks = decks.filter((d) => d.id !== id);
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<h1 class="admin-page__title">Decks</h1>
		<button class="admin-btn admin-btn--primary" type="button" onclick={() => navigate('/decks/new')}>
			New deck
		</button>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else if error}
		<p class="admin-form-error">{error}</p>
	{:else if decks.length === 0}
		<p class="admin-hint">No decks yet.</p>
	{:else}
		<ul class="admin-list">
			{#each decks as deck (deck.id)}
				{@const iconNode = getDeckIconNode(deck.icon)}
				<li class="admin-list__item">
					<span class="admin-list__icon">
						<LucideIcon name={deck.icon ?? 'Layers'} iconNode={iconNode} size={18} aria-hidden="true" />
					</span>
					<span class="admin-list__name">{deck.name}</span>
					{#if deck.description}
						<span class="admin-list__meta">{deck.description}</span>
					{/if}
					<div class="admin-list__actions">
						<button class="admin-btn admin-btn--sm" type="button" onclick={() => navigate(`/decks/${deck.id}`)}>Edit</button>
						<button class="admin-btn admin-btn--sm admin-btn--danger" type="button" onclick={() => deleteDeck(deck.id)}>Delete</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
