<script>
	import { _ } from 'svelte-i18n';
	import { ChevronLeft } from 'lucide-svelte';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

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

	{#each Array.from({ length: 8 }, (_, i) => i) as position (position)}
		{@const claimers = players.filter((p) => p.seatPosition === position)}
		<button
			class="seat-btn seat-btn--{position}"
			class:seat-btn--claimed={claimers.length > 0}
			onclick={() => onclaimseat(position)}
			type="button"
			aria-label={claimers.length > 0
				? claimers.map((p) => p.name).join(', ')
				: $_('setup.seat_aria', { values: { n: position + 1 } })}
		>
			{#if claimers.length > 0}
				<span class="seat-btn__stack">
					{#each claimers as claimer (claimer.id)}
						{@const Icon = getPlayerIconComponent(claimer.icon)}
						<span class="seat-btn__avatar" style:--player-ring="var(--{claimer.color})">
							{#if Icon}<Icon size={13} />{/if}
						</span>
					{/each}
				</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.seating-screen {
		--seat-btn-spacing: 3rem;

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
		text-align: center;
		pointer-events: none;
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

	.seat-btn {
		position: absolute;
		display: grid;
		place-items: center;
		border: 3px solid hsl(0 0% 100% / 0.5);
		border-radius: 50%;
		width: 3.25rem;
		height: 3.25rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			transform 0.1s;
	}

	.seat-btn:hover:not(:disabled) {
		background-color: hsl(0 0% 100% / 0.3);
		border-color: var(--white);
		transform: scale(1.1);
	}

	.seat-btn--claimed {
		background-color: var(--orange-700);
		border-color: var(--orange-800);
		overflow: hidden;
	}

	.seat-btn__stack {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.seat-btn__avatar {
		display: grid;
		place-items: center;
		width: 1.375rem;
		height: 1.375rem;
		border-radius: 50%;
		background: hsl(0 0% 0% / 0.25);
		border: 2px solid var(--player-ring, hsl(0 0% 100% / 0.4));
		flex-shrink: 0;
	}

	.seat-btn__avatar + .seat-btn__avatar {
		margin-inline-start: -0.35rem;
	}

	.seat-btn--0 {
		top: max(var(--seat-btn-spacing), env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
	}

	.seat-btn--0:hover:not(:disabled) {
		transform: translateX(-50%) scale(1.1);
	}

	.seat-btn--1 {
		top: max(var(--seat-btn-spacing), env(safe-area-inset-top));
		right: max(var(--seat-btn-spacing), env(safe-area-inset-right));
	}

	.seat-btn--2 {
		top: 50%;
		right: max(var(--seat-btn-spacing), env(safe-area-inset-right));
		transform: translateY(-50%);
	}

	.seat-btn--2:hover:not(:disabled) {
		transform: translateY(-50%) scale(1.1);
	}

	.seat-btn--3 {
		bottom: max(var(--seat-btn-spacing), env(safe-area-inset-bottom));
		right: max(var(--seat-btn-spacing), env(safe-area-inset-right));
	}

	.seat-btn--4 {
		bottom: max(var(--seat-btn-spacing), env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
	}

	.seat-btn--4:hover:not(:disabled) {
		transform: translateX(-50%) scale(1.1);
	}

	.seat-btn--5 {
		bottom: max(var(--seat-btn-spacing), env(safe-area-inset-bottom));
		left: max(var(--seat-btn-spacing), env(safe-area-inset-left));
	}

	.seat-btn--6 {
		top: 50%;
		left: max(var(--seat-btn-spacing), env(safe-area-inset-left));
		transform: translateY(-50%);
	}

	.seat-btn--6:hover:not(:disabled) {
		transform: translateY(-50%) scale(1.1);
	}

	.seat-btn--7 {
		top: max(var(--seat-btn-spacing), env(safe-area-inset-top));
		left: max(var(--seat-btn-spacing), env(safe-area-inset-left));
	}
</style>
