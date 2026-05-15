<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '$lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: Array<{ seatPosition: number, name: string, icon: string, color: string, [key: string]: any }>,
	 *   disabledSeats?: number[],
	 *   selectedSeat?: number,
	 *   onselect: (position: number) => void,
	 * }}
	 */
	let { players, disabledSeats = [], selectedSeat = -1, onselect } = $props();

	/** @param {number} position */
	function claimersAt(position) {
		return players.filter((p) => p.seatPosition === position);
	}
</script>

<div class="seat-map">
	{#each Array.from({ length: 8 }, (_, i) => i) as position (position)}
		{@const claimers = claimersAt(position)}
		{@const disabled = disabledSeats.includes(position)}
		<button
			class="seat-map__btn seat-map__btn--{position}"
			class:seat-map__btn--claimed={claimers.length > 0}
			class:seat-map__btn--selected={selectedSeat === position}
			class:seat-map__btn--disabled={disabled}
			onclick={() => onselect(position)}
			type="button"
			{disabled}
			aria-label={claimers.length > 0
				? claimers.map((p) => p.name).join(', ')
				: $_('setup.seat_aria', { values: { n: position + 1 } })}
		>
			{#if claimers.length > 0}
				<span class="seat-map__stack">
					{#each claimers as claimer (claimer.name)}
						{@const Icon = getPlayerIconComponent(claimer.icon)}
						<span
							class="seat-map__avatar"
							style:--player-ring="var(--{claimer.color})"
						>
							{#if Icon}<Icon size={40} />{/if}
						</span>
					{/each}
				</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.seat-map {
		container-type: size;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.seat-map__btn {
		position: absolute;
		display: grid;
		place-items: center;
		border: 3px solid hsl(0 0% 100% / 0.5);
		border-radius: 50%;
		width: 16cqmin;
		height: 16cqmin;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		padding: 0;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			transform 0.1s;
	}

	.seat-map__btn:hover:not(:disabled) {
		background-color: hsl(0 0% 100% / 0.3);
		border-color: var(--white);
	}

	.seat-map__btn--claimed {
		background-color: var(--palette-purple-mid);
		border-color: var(--palette-purple-start);
		overflow: hidden;
	}

	.seat-map__btn--selected {
		background-color: var(--orange-600);
		border-color: var(--white);
		box-shadow: 0 0 0 2px var(--orange-600);
	}

	.seat-map__btn--disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.seat-map__stack {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.seat-map__avatar {
		display: grid;
		place-items: center;
		width: 10cqmin;
		height: 10cqmin;
		border-radius: 50%;
		background-color: var(--player-ring, hsl(0 0% 100% / 0.4));
		flex-shrink: 0;

		:global(svg) {
			height: 5cqi;
		}
	}

	.seat-map__avatar + .seat-map__avatar {
		margin-inline-start: -2cqmin;
	}

	.seat-map__btn--0 {
		top: 0;
		left: 50%;
		transform: translate(-50%, 0);
	}
	.seat-map__btn--0:hover:not(:disabled) {
		transform: translate(-50%, 0) scale(1.1);
	}

	.seat-map__btn--1 {
		top: 0;
		left: 100%;
		transform: translate(-100%, 0);
	}
	.seat-map__btn--1:hover:not(:disabled) {
		transform: translate(-100%, 0) scale(1.1);
	}

	.seat-map__btn--2 {
		top: 50%;
		left: 100%;
		transform: translate(-100%, -50%);
	}
	.seat-map__btn--2:hover:not(:disabled) {
		transform: translate(-100%, -50%) scale(1.1);
	}

	.seat-map__btn--3 {
		top: 100%;
		left: 100%;
		transform: translate(-100%, -100%);
	}
	.seat-map__btn--3:hover:not(:disabled) {
		transform: translate(-100%, -100%) scale(1.1);
	}

	.seat-map__btn--4 {
		top: 100%;
		left: 50%;
		transform: translate(-50%, -100%);
	}
	.seat-map__btn--4:hover:not(:disabled) {
		transform: translate(-50%, -100%) scale(1.1);
	}

	.seat-map__btn--5 {
		top: 100%;
		left: 0;
		transform: translate(0, -100%);
	}
	.seat-map__btn--5:hover:not(:disabled) {
		transform: translate(0, -100%) scale(1.1);
	}

	.seat-map__btn--6 {
		top: 50%;
		left: 0;
		transform: translate(0, -50%);
	}
	.seat-map__btn--6:hover:not(:disabled) {
		transform: translate(0, -50%) scale(1.1);
	}

	.seat-map__btn--7 {
		top: 0;
		left: 0;
	}
	.seat-map__btn--7:hover:not(:disabled) {
		transform: scale(1.1);
	}
</style>
