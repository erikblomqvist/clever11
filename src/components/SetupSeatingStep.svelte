<script>
	import { _ } from 'svelte-i18n';
	import { ChevronLeft } from 'lucide-svelte';
	import SeatMap from './SeatMap.svelte';

	/**
	 * @type {{
	 *   players: import('../views/SetupView.svelte').SetupPlayer[],
	 *   currentSeatingIdx: number,
	 *   currentSeatingPlayer: import('../views/SetupView.svelte').SetupPlayer | null,
	 *   onback: () => void,
	 *   onclaimseat: (position: number) => void,
	 * }}
	 */
	let {
		players,
		currentSeatingIdx,
		currentSeatingPlayer,
		onback,
		onclaimseat,
	} = $props();
</script>

<div class="seating-screen">
	<button
		class="seating-back"
		type="button"
		onclick={onback}
		aria-label={$_('setup.back_to_players_aria')}
	>
		<ChevronLeft size={20} />
	</button>

	<div class="seating-center">
		<p class="seating-player-name">{currentSeatingPlayer?.name}</p>
		<p class="seating-prompt">{$_('setup.seated_prompt')}</p>
		<p class="seating-progress">
			{currentSeatingIdx + 1} / {players.length}
		</p>
	</div>

	<div class="seating-map-wrapper">
		<SeatMap {players} onselect={onclaimseat} />
	</div>
</div>

<style>
	.seating-screen {
		position: fixed;
		inset: 0;
		background: linear-gradient(
			to bottom,
			var(--orange-500),
			var(--orange-600)
		);
		display: grid;
		place-items: center;
	}

	.seating-back {
		position: absolute;
		top: max(1rem, env(safe-area-inset-top));
		left: max(1rem, env(safe-area-inset-left));
		display: grid;
		place-items: center;
		border: 2px solid hsl(0 0% 100% / 0.4);
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		z-index: 1;
		transition: background-color 0.15s;
	}

	.seating-back:hover {
		background-color: hsl(0 0% 100% / 0.25);
	}

	.seating-center {
		position: absolute;
		text-align: center;
		pointer-events: none;
		z-index: 1;
	}

	.seating-player-name {
		margin: 0 0 0.375rem;
		font-family: 'Erica One', sans-serif;
		font-size: clamp(2rem, 8vw, 3.5rem);
		font-weight: 400;
		color: var(--white);
		text-shadow: 0 2px 8px hsl(0 0% 0% / 0.2);
	}

	.seating-prompt {
		margin: 0 0 0.5rem;
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-base);
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: hsl(0 0% 100% / 0.8);
	}

	.seating-progress {
		margin: 0;
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-sm);
		color: hsl(0 0% 100% / 0.6);
	}

	.seating-map-wrapper {
		position: absolute;
		inset: max(3rem, env(safe-area-inset-top)) max(3rem, env(safe-area-inset-right)) max(3rem, env(safe-area-inset-bottom)) max(3rem, env(safe-area-inset-left));
	}
</style>
