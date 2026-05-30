<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import LucideIcon from '../LucideIcon.svelte';

	/**
	 * @type {{
	 *   decks: import('$lib/views/SetupView.svelte').Deck[],
	 *   decksLoading: boolean,
	 *   selectedDeckIds: string[],
	 *   ontoggledeck: (id: string) => void,
	 * }}
	 */
	let { decks, decksLoading, selectedDeckIds, ontoggledeck } = $props();

	/** @type {((id: string|null|undefined) => Array<[string, Record<string, string>]>)|null} */
	let getDeckIconNode = $state(null);

	onMount(async () => {
		const icons = await import('$lib/deckIcons.js');
		getDeckIconNode = icons.getDeckIconNode;
	});

	const customStyleTag = $derived.by(() => {
		const blocks = decks.filter((d) => d.css).map((d) => d.css);
		return blocks.length ? `<style>${blocks.join('\n')}</style>` : '';
	});
</script>

{#if decksLoading}
	<p class="setup-hint">{$_('setup.loading_decks')}</p>
{:else if decks.length === 0}
	<p class="setup-hint">{$_('setup.no_decks')}</p>
{:else}
	<ul class="deck-grid" role="list">
		{#each decks as deck (deck.id)}
			{@const isSelected = selectedDeckIds.includes(deck.id)}
			{@const iconNode = getDeckIconNode?.(deck.icon)}
			<li>
				<button
					class="deck"
					class:is-selected={isSelected}
					data-deck-id={deck.id}
					onclick={() => ontoggledeck(deck.id)}
					type="button"
					role="checkbox"
					aria-checked={isSelected}
				>
					<span class="deck__back deck__back--2" aria-hidden="true"
					></span>
					<span class="deck__back deck__back--1" aria-hidden="true"
					></span>
					<span class="deck__pop deck__pop--1" aria-hidden="true"
					></span>
					<span class="deck__pop deck__pop--2" aria-hidden="true"
					></span>
					<span class="deck__pop deck__pop--3" aria-hidden="true"
					></span>
					<span class="deck__face">
						<span class="deck__icon" aria-hidden="true">
							{#if iconNode}
								<LucideIcon
									name={deck.icon ?? 'Layers'}
									{iconNode}
									size={38}
									strokeWidth={1.75}
								/>
							{/if}
						</span>
						<span class="deck__text">
							<span class="deck__name">{deck.name}</span>
							<span class="deck__count">
								{$_('setup.deck_questions', {
									values: { n: deck.questionCount },
								})}
							</span>
						</span>
					</span>
					<span class="deck__check" aria-hidden="true">✓</span>
				</button>
			</li>
		{/each}
	</ul>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html customStyleTag}
{/if}

<style>
	.setup-hint {
		margin: 0;
		color: hsl(0 0% 100% / 0.7);
		font-size: var(--font-size-base);
		text-align: center;
	}

	/* ===============================================================
	   GRID + DECK STACK STRUCTURE (shared across all decks)
	   Per-deck themed faces live in each deck's `css` field, scoped to
	   `.deck.is-selected[data-deck-id="…"]` and injected via {@html} above.
	   =============================================================== */
	.deck-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		/* row gap sized to contain the fan (rises ~71px); column gap
		   sized so two adjacent fans (~18px each) never meet */
		gap: 5.5rem 2.5rem;
		margin-block-start: 4rem;
		padding: 0;
		list-style: none;
	}
	@media (max-width: 560px) {
		.deck-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.deck {
		--accent: var(--palette-purple-light);
		--card-radius: 0.85rem;
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 3 / 4;
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--palette-white);
		cursor: pointer;
		transition: transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1);
	}
	/* selected decks paint above neighbours so a fan never z-fights */
	.deck.is-selected {
		z-index: 2;
	}

	/* layers behind = deck thickness */
	.deck__back {
		position: absolute;
		inset: 0;
		border-radius: var(--card-radius);
		background: linear-gradient(160deg, lch(16% 10 285), lch(10% 8 280));
		border: 1px solid hsl(0 0% 100% / 0.05);
		z-index: 1;
	}
	.deck__back--1 {
		transform: translate(4px, 5px);
		filter: brightness(0.8);
	}
	.deck__back--2 {
		transform: translate(8px, 10px);
		filter: brightness(0.62);
	}

	/* the cards that fan out of the top when selected */
	.deck__pop {
		position: absolute;
		inset: 0;
		border-radius: var(--card-radius);
		background: linear-gradient(
			160deg,
			var(--accent),
			color-mix(in oklab, var(--accent) 55%, black)
		);
		border: 1px solid hsl(0 0% 100% / 0.18);
		box-shadow: 0 6px 14px -6px oklch(8% 0.05 280 / 0.7);
		z-index: 2;
		transform: translateY(0) rotate(0deg);
		/* pivot from where cards tuck into the deck so the fan splays
		   from the bottom and the visible tops swing the least */
		transform-origin: 50% 100%;
		opacity: 0;
		transition:
			transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 240ms ease;
	}
	/* little motif so the peeking cards read as cards */
	.deck__pop::after {
		content: '';
		position: absolute;
		inset: 12% 18% auto 18%;
		height: 0;
		border-top: 2px dashed hsl(0 0% 100% / 0.28);
	}

	/* top face = where the deck's theme lives */
	.deck__face {
		position: absolute;
		inset: 0;
		z-index: 3;
		border-radius: var(--card-radius);
		border: 1px solid lch(20% 12 285);
		background: linear-gradient(180deg, lch(14% 10 285), lch(9% 8 280));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		padding: 0.9rem;
		overflow: hidden;
		box-shadow: 0 10px 22px -14px oklch(6% 0.05 280 / 0.7);
		transition:
			border-color 220ms ease,
			box-shadow 260ms ease;
	}
	.deck__icon {
		display: grid;
		place-items: center;
		opacity: 0.7;
		transition: opacity 200ms ease;
	}
	.deck__text {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}
	.deck__name {
		font-family: var(--font-family-display);
		font-weight: 600;
		font-size: 1.05rem;
		text-align: center;
		text-wrap: balance;
		line-height: 1.15;
	}
	.deck__count {
		font-family: var(--font-family-body);
		font-size: 0.78rem;
		font-weight: 500;
		/* opacity (not a fixed colour) so it adapts to each themed face,
		   whether the face text is light (neon) or dark (parchment) */
		opacity: 0.6;
	}
	.deck__check {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		width: 1.4rem;
		height: 1.4rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--accent);
		color: lch(8% 5 280);
		font-size: 0.85rem;
		font-weight: 800;
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity 180ms ease,
			transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
		z-index: 4;
	}

	/* ---- selected: lift the deck, reveal check, fan the pops ---- */
	.deck.is-selected {
		transform: translateY(-4px);
	}
	.deck.is-selected .deck__icon {
		opacity: 1;
	}
	.deck.is-selected .deck__check {
		opacity: 1;
		transform: scale(1);
	}
	.deck.is-selected .deck__face {
		box-shadow: 0 18px 30px -16px oklch(5% 0.06 280 / 0.85);
	}
	.deck.is-selected .deck__pop {
		opacity: 1;
	}
	/* spread kept tight: no translateX, rotation ≤3° → ~18px overhang,
	   well inside the 40px column gap; rise ≤71px fits the row gap */
	.deck.is-selected .deck__pop--1 {
		transform: translateY(-17%) rotate(-3deg);
		transition-delay: 40ms;
	}
	.deck.is-selected .deck__pop--2 {
		transform: translateY(-21%) rotate(0deg);
		transition-delay: 90ms;
	}
	.deck.is-selected .deck__pop--3 {
		transform: translateY(-17%) rotate(3deg);
		transition-delay: 140ms;
	}

	@media (prefers-reduced-motion: reduce) {
		.deck,
		.deck__pop,
		.deck__check {
			transition: none;
		}
	}
</style>
