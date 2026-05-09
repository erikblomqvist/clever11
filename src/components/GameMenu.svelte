<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Menu, X, RotateCcw, Shield, Save, Undo2, CircleDot, SkipForward } from 'lucide-svelte';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import LucideIcon from './LucideIcon.svelte';
	import OverallScoreList from './OverallScoreList.svelte';
	import ScoreList from './ScoreList.svelte';
	import Button from './Button.svelte';

	/**
	 * @type {{
	 *   players: import('../lib/game.svelte.js').GamePlayer[],
	 *   questionType?: import('../data/questionTypes.js').QuestionType | null,
	 *   deck?: string | null,
	 *   deckIcon?: string | null,
	 *   onstartover: () => void,
	 *   onsave: () => void,
	 *   onundo: () => void,
	 *   onskipround: () => void,
	 *   canundo: boolean,
	 *   canskipround: boolean,
	 * }}
	 */
	let {
		players,
		questionType = null,
		deck = null,
		deckIcon = null,
		onstartover,
		onsave,
		onundo,
		onskipround,
		canundo,
		canskipround,
	} = $props();

	let open = $state(false);

	const typeConfig = $derived(
		questionType ? (QUESTION_TYPES[questionType] ?? QUESTION_TYPES.standard) : null,
	);

	/** @type {((id: string|null|undefined) => Array<[string, Record<string, string>]>)|null} */
	let getDeckIconNode = $state(null);
	const deckIconNode = $derived(deckIcon ? getDeckIconNode?.(deckIcon) : null);

	onMount(async () => {
		const icons = await import('../lib/deckIcons.js');
		getDeckIconNode = icons.getDeckIconNode;
	});

	function handleBackdropClick() {
		open = false;
	}
</script>

<div class="game-menu" class:game-menu--open={open}>
	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="game-menu__backdrop" onclick={handleBackdropClick}></div>
	{/if}

	<button
		class="game-menu__trigger"
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label={open ? 'Close menu' : 'Open menu'}
	>
		{#if open}
			<X size={20} />
		{:else}
			<Menu size={20} />
		{/if}
	</button>

	{#if open}
		<div class="game-menu__panel" data-game-scroll-lock-allow>
			{#if typeConfig && questionType && deck}
				<div class="game-menu__question-info">
					<span class="game-menu__question-type" style:--qc="var(--question-color)">
						<typeConfig.icon size={16} />
						<span>{$_(`question_types.${questionType}`)}</span>
					</span>
					<span class="game-menu__question-deck">
						{#if deckIconNode}
							<LucideIcon name={deckIcon} iconNode={deckIconNode} size={16} />
						{:else}
							<CircleDot size={16} />
						{/if}
						<span>{deck}</span>
					</span>
				</div>
			{/if}

			<section class="game-menu__section">
				<h2 class="game-menu__heading">{$_('menu.current_round')}</h2>
				<ScoreList {players} />
			</section>

			<section class="game-menu__section">
				<h2 class="game-menu__heading">{$_('menu.overall_score')}</h2>
				<OverallScoreList {players} />
			</section>

			<section class="game-menu__section game-menu__section--actions">
				{#if canundo}
					<Button
						variant="cta"
						size="sm"
						icon={Undo2}
						text={$_('menu.undo_last_move')}
						onclick={onundo}
					/>
				{/if}
				{#if canskipround}
					<Button
						variant="cta"
						size="sm"
						icon={SkipForward}
						text={$_('menu.skip_round')}
						onclick={() => { onskipround(); open = false; }}
					/>
				{/if}
				<Button
					variant="cta"
					size="sm"
					icon={Save}
					text={$_('menu.save_game')}
					onclick={onsave}
				/>
				<Button
					variant="cta"
					size="sm"
					icon={RotateCcw}
					text={$_('menu.start_new_game')}
					onclick={onstartover}
				/>
				<Button
					variant="cta"
					size="sm"
					icon={Shield}
					text={$_('menu.admin')}
					href="/admin"
					target="_blank"
				/>
			</section>
		</div>
	{/if}
</div>

<style>
	.game-menu {
		position: fixed;
		top: max(0.75rem, env(safe-area-inset-top));
		left: max(0.75rem, env(safe-area-inset-left));
		z-index: 10;

		font-size: var(--font-size-md);
	}

	.game-menu__backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;

		background: hsl(0 0% 0% / 0.3);
		backdrop-filter: blur(2px);
	}

	.game-menu__trigger {
		cursor: pointer;
		display: grid;
		place-items: center;

		border: none;
		border-radius: 0.75rem;
		width: 2.75rem;
		height: 2.75rem;
		background-color: var(--palette-purple-neutral);
		box-shadow: 0 2px 10px hsl(0 0% 0% / 0.15);

		transition: background-color 0.15s, box-shadow 0.15s;

		color: var(--palette-white);
		
		&:hover {
			background-color: lch(from var(--palette-purple-neutral) calc(l + 5) c h);
			box-shadow: 0 2px 14px hsl(0 0% 0% / 0.22);
		}
	}

	.game-menu--open .game-menu__trigger {
		background-color: lch(from var(--palette-purple-neutral) calc(l + 5) c h);
		box-shadow: 0 2px 14px hsl(0 0% 0% / 0.22);
	}

	.game-menu__panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 1;
		display: grid;
		gap: 0.75rem;
		box-sizing: border-box;

		border: 3px solid var(--palette-purple-end);
		border-radius: 0.75rem;
		width: min(21rem, calc(100vw - 2rem));
		max-height: calc(100svh - 5rem);
		padding: 0.75rem;
		overflow: auto;
		overscroll-behavior: none;
		background-color: var(--palette-purple-neutral);
		box-shadow: 0 1rem 3rem hsl(0 0% 0% / 0.25);

		color: var(--palette-white);
	}

	.game-menu__question-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		border-bottom: 2px solid var(--palette-gray-muted);
		padding-bottom: 0.75rem;
	}

	.game-menu__question-type {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--qc, var(--grayscale-700));
		font-weight: 600;
	}

	.game-menu__question-deck {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--palette-white);
	}

	.game-menu__section {
		display: grid;
		gap: 0.5rem;
	}

	.game-menu__section--actions {
		border-top: 2px solid var(--palette-gray-muted);
		padding-block-start: 0.5rem;
	}

	.game-menu__heading {
		margin: 0;
		color: var(--palette-gray-muted);
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 400;
	}

	.game-menu__action {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.625rem;

		border: none;
		border-radius: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		background: none;

		color: var(--grayscale-900);
		text-decoration: none;
		font-family: inherit;
		font-size: var(--font-size-base);
		text-align: start;
		&:hover {
			background-color: var(--orange-100);
		}
	}

	.game-menu__action :global(svg) {
		color: var(--palette-purple-start);
		flex-shrink: 0;
	}
</style>
