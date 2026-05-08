<script>
	import { _ } from 'svelte-i18n';
	import { Shuffle } from 'lucide-svelte';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: import('../views/SetupView.svelte').SetupPlayer[],
	 *   sortedPlayers: import('../views/SetupView.svelte').SetupPlayer[],
	 *   startingPlayerIdx: number | null,
	 *   onrandomize: () => void,
	 * }}
	 */
	let {
		players,
		sortedPlayers,
		startingPlayerIdx = $bindable(),
		onrandomize,
	} = $props();
</script>

<ul class="starting-list" role="list">
	{#each sortedPlayers as player (player.id)}
		{@const idx = players.findIndex((p) => p.name === player.name)}
		{@const Icon = getPlayerIconComponent(player.icon)}
		<li>
			<button
				class="starting-card"
				class:starting-card--selected={startingPlayerIdx === idx}
				onclick={() => (startingPlayerIdx = idx)}
				type="button"
			>
				<span class="starting-card__icon" style:--player-ring="var(--{player.color})" aria-hidden="true">
					{#if Icon}
						<Icon size={20} />
					{/if}
				</span>
				<span class="starting-card__name">{player.name}</span>
			</button>
		</li>
	{/each}
</ul>

<button class="randomize-btn" onclick={onrandomize} type="button">
	<Shuffle size={16} />
	{$_('setup.randomize')}
</button>

<style>
	.starting-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.starting-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		text-align: left;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.starting-card:hover {
		background-color: hsl(0 0% 100% / 0.22);
	}

	.starting-card--selected {
		background-color: var(--orange-700);
		border-color: var(--orange-800);
	}

	.starting-card--selected:hover {
		background-color: var(--orange-800);
	}

	.starting-card__icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: 2px solid var(--player-ring, transparent);
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
	}

	.starting-card__name {
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.randomize-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 2px solid hsl(0 0% 100% / 0.4);
		border-radius: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-base);
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color 0.15s;
		align-self: flex-start;
	}

	.randomize-btn:hover {
		background-color: hsl(0 0% 100% / 0.25);
	}
</style>
