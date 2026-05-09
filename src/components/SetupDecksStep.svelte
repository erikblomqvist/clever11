<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import LucideIcon from './LucideIcon.svelte';

	/**
	 * @type {{
	 *   decks: import('../views/SetupView.svelte').Deck[],
	 *   decksLoading: boolean,
	 *   selectedDeckIds: string[],
	 *   ontoggledeck: (id: string) => void,
	 * }}
	 */
	let { decks, decksLoading, selectedDeckIds, ontoggledeck } = $props();

	/** @type {((id: string|null|undefined) => Array<[string, Record<string, string>]>)|null} */
	let getDeckIconNode = $state(null);

	onMount(async () => {
		const icons = await import('../lib/deckIcons.js');
		getDeckIconNode = icons.getDeckIconNode;
	});
</script>

{#if decksLoading}
	<p class="setup-hint">{$_('setup.loading_decks')}</p>
{:else if decks.length === 0}
	<p class="setup-hint">{$_('setup.no_decks')}</p>
{:else}
	<ul class="deck-list" role="list">
		{#each decks as deck (deck.id)}
			{@const isSelected = selectedDeckIds.includes(deck.id)}
			{@const iconNode = getDeckIconNode?.(deck.icon)}
			<li>
				<button
					class="deck-card"
					class:deck-card--selected={isSelected}
					onclick={() => ontoggledeck(deck.id)}
					type="button"
					role="checkbox"
					aria-checked={isSelected}
				>
					<span class="deck-card__icon" aria-hidden="true">
						{#if iconNode}
							<LucideIcon name={deck.icon ?? 'Layers'} iconNode={iconNode} size={22} />
						{/if}
					</span>
					<span class="deck-card__info">
						<span class="deck-card__name">{deck.name}</span>
						{#if deck.description}
							<span class="deck-card__desc"
								>{deck.description}</span
							>
						{/if}
					</span>
					<span class="deck-card__check" aria-hidden="true">
						{#if isSelected}✓{/if}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.setup-hint {
		margin: 0;
		color: hsl(0 0% 100% / 0.7);
		font-size: var(--font-size-base);
		text-align: center;
	}

	.deck-list {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.deck-card {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		width: 100%;
		border: 2px solid var(--orange-500);
		border-radius: 0.625rem;
		padding: 0.875rem 1rem;
		background-color: var(--orange-600);
		color: var(--white);
		text-align: left;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	
		&:hover {
			background-color: hsl(0 0% 100% / 0.22);
		}
	}

	.deck-card--selected {
		background-color: var(--orange-700);
		border-color: var(--orange-800);
	}

	.deck-card--selected:hover {
		background-color: var(--orange-800);
	}

	.deck-card__icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		opacity: 0.8;
	}

	.deck-card__info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.deck-card__name {
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.deck-card__desc {
		font-family: var(--font-family-body);
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.deck-card__check {
		font-size: var(--font-size-lg);
		font-weight: 700;
		width: 1.5rem;
		text-align: center;
		flex-shrink: 0;
	}
</style>
