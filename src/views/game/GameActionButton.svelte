<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   roundIsOver: boolean,
	 *   disabled?: boolean,
	 *   onclick: () => void,
	 * }}
	 */
	let { roundIsOver, disabled = false, onclick } = $props();
</script>

<div class="game-action">
	<button
		class="game-action__btn"
		class:game-action__btn--end-round={roundIsOver}
		type="button"
		{disabled}
		{onclick}
	>
		{roundIsOver ? $_('game.end_round') : $_('game.pass')}
	</button>
</div>

<style>
	.game-action {
		position: fixed;
		bottom: max(1rem, env(safe-area-inset-bottom));
		right: max(1rem, env(safe-area-inset-right));
		z-index: 5;
	}

	.game-action__btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: var(--grayscale-800);
		color: var(--white);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-base);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color 0.15s;
		box-shadow: 0 2px 8px hsl(0 0% 0% / 0.25);
	}

	.game-action__btn:hover {
		background-color: var(--grayscale-700);
	}

	.game-action__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.game-action__btn--end-round {
		background-color: var(--orange-700);
	}

	.game-action__btn--end-round:hover {
		background-color: var(--orange-800);
	}
</style>
