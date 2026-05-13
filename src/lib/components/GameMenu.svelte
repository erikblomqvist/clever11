<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		Menu,
		X,
		RotateCcw,
		Shield,
		Save,
		Undo2,
		CircleDot,
		SkipForward,
	} from 'lucide-svelte';
	import { game } from '$lib/game.svelte.js';
	import { QUESTION_TYPES } from '$lib/data/questionTypes.js';
	import LucideIcon from './LucideIcon.svelte';
	import OverallScoreList from './OverallScoreList.svelte';
	import ScoreList from './ScoreList.svelte';
	import Button from './Button.svelte';

	/**
	 * @type {{
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
	 *   questionType?: import('$lib/data/questionTypes.js').QuestionType | null,
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
		questionType
			? (QUESTION_TYPES[questionType] ?? QUESTION_TYPES.standard)
			: null,
	);

	/** @type {((id: string|null|undefined) => Array<[string, Record<string, string>]>)|null} */
	let getDeckIconNode = $state(null);
	const deckIconNode = $derived(
		deckIcon ? getDeckIconNode?.(deckIcon) : null,
	);

	onMount(async () => {
		const icons = await import('$lib/deckIcons.js');
		getDeckIconNode = icons.getDeckIconNode;
	});

	function handleBackdropClick() {
		open = false;
	}
</script>

<div class="game-menu" class:game-menu--open={open}>
	{#if open}
		<div
			class="game-menu__backdrop"
			onclick={handleBackdropClick}
			aria-hidden="true"
		></div>
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
					<span
						class="game-menu__question-type"
						style:--qc="var(--question-color)"
					>
						<typeConfig.icon size={16} />
						<span>{$_(`question_types.${questionType}`)}</span>
					</span>
					<span class="game-menu__question-deck">
						{#if deckIconNode}
							<LucideIcon
								name={deckIcon}
								iconNode={deckIconNode}
								size={16}
							/>
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

			<section class="game-menu__section">
				<h2 class="game-menu__heading">{$_('menu.rules')}</h2>
				<div class="rule-toggle">
					<span class="rule-toggle__label"
						>{$_('setup.volcano_rumble_label')}</span
					>
					<button
						class="toggle"
						class:toggle--on={game.volcanoRumble}
						type="button"
						role="switch"
						aria-checked={game.volcanoRumble}
						aria-label={$_('setup.volcano_rumble_label')}
						onclick={() => game.toggleVolcanoRumble()}
					>
						<span class="toggle__thumb"></span>
					</button>
				</div>
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
						onclick={() => {
							onskipround();
							open = false;
						}}
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

		transition:
			background-color 0.15s,
			box-shadow 0.15s;

		color: var(--palette-white);

		&:hover {
			background-color: lch(
				from var(--palette-purple-neutral) calc(l + 5) c h
			);
			box-shadow: 0 2px 14px hsl(0 0% 0% / 0.22);
		}
	}

	.game-menu--open .game-menu__trigger {
		background-color: lch(
			from var(--palette-purple-neutral) calc(l + 5) c h
		);
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
		justify-content: space-between;
		gap: 1rem;

		border-bottom: 2px solid var(--palette-gray-muted);
		padding-bottom: 0.75rem;

		font-size: var(--font-size-base);
	}

	.game-menu__question-type {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--qc, var(--palette-white));
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

	.rule-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.25rem 0;
	}

	.rule-toggle__label {
		color: var(--palette-white);
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	/* Toggle switch (reused from SetupRulesStep) */
	.toggle {
		position: relative;
		flex-shrink: 0;
		width: 2.5rem;
		height: 1.45rem;
		border: none;
		border-radius: 999px;
		background: var(--palette-gray-muted);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.toggle--on {
		background-color: var(--palette-purple-start);
	}

	.toggle__thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: var(--palette-white);
		transition: transform 0.2s;
	}

	.toggle--on .toggle__thumb {
		transform: translateX(1rem);
	}
</style>
