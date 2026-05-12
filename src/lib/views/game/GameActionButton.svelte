<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   roundIsOver: boolean,
	 *   disabled?: boolean,
	 *   onclick: () => void,
	 *   seatRotation?: number,
	 * }}
	 */
	let { roundIsOver, disabled = false, onclick, seatRotation = 0 } = $props();
</script>

<div class="game-action" style="--seat-rotation:{seatRotation}turn">
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
		display: grid;
		place-items: center;

		width: 6rem;
		height: 6rem;
	}

	.game-action__btn {
		pointer-events: auto;
		border: none;
		border-radius: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: var(--grayscale-800);
		color: var(--white);
		font-family: var(--font-family-display);
		font-size: var(--font-size-base);
		font-weight: 600;
		cursor: pointer;
		rotate: var(--seat-rotation, 0turn);
		transform-origin: center;
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
		background-color: var(--palette-purple-start);

		&:hover {
			background-color: var(--palette-purple-mid);
		}
	}
</style>
