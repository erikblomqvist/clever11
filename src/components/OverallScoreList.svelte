<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

	/**
	 * @type {{ players: { name: string, icon: string, color: string, totalScore: number }[] }}
	 */
	let { players } = $props();

	const rankedPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);
</script>

<ol class="overall-score-list">
	{#each rankedPlayers as player, index (player.id)}
		{@const Icon = getPlayerIconComponent(player.icon)}
		<li class="overall-score-list__item">
			<span class="overall-score-list__rank">{index + 1}</span>
			{#if Icon}
				<span class="overall-score-list__icon" style:--player-ring="var(--{player.color})" aria-hidden="true">
					<Icon size={14} />
				</span>
			{/if}
			<span class="overall-score-list__player">{player.name}</span>
			<span class="overall-score-list__score"
				>{$_('game.pts', { values: { n: player.totalScore } })}</span
			>
		</li>
	{/each}
</ol>

<style>
	.overall-score-list {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.overall-score-list__item {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
		border: 2px solid var(--grayscale-200);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: var(--grayscale-100);
	}

	.overall-score-list__rank {
		display: grid;
		place-items: center;
		border-radius: 999px;
		width: 2rem;
		height: 2rem;
		background-color: var(--orange-600);
		color: hsl(0 0% 100%);
		font-size: var(--font-size-base);
		font-weight: 700;
	}

	.overall-score-list__icon {
		display: grid;
		place-items: center;
		border: 2px solid var(--player-ring, transparent);
		border-radius: 50%;
		width: 1.75rem;
		height: 1.75rem;
		color: var(--grayscale-700);
		flex-shrink: 0;
	}

	.overall-score-list__player {
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.overall-score-list__score {
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}
</style>
