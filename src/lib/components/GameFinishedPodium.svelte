<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '$lib/playerIcons.js';
	import Button from './Button.svelte';

	/**
	 * @type {{
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
	 *   onstartover: () => void,
	 * }}
	 */
	let { players, onstartover } = $props();

	const podiumPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);
</script>

<div class="podium">
	<p class="podium__label">{$_('game.game_over')}</p>

	{#if podiumPlayers[0]}
		{@const WinnerIcon = getPlayerIconComponent(podiumPlayers[0].icon)}
		<div class="podium__winner">
			<div class="podium__winner-icon">
				{#if WinnerIcon}<WinnerIcon size={56} />{/if}
			</div>
			<p class="podium__winner-name">
				{$_('game.wins', { values: { name: podiumPlayers[0].name } })}
			</p>
			<p class="podium__winner-score">
				{$_('game.pts', { values: { n: podiumPlayers[0].totalScore } })}
			</p>
		</div>
	{/if}

	<ol class="podium__list">
		{#each podiumPlayers as player, i (player.id)}
			{@const Icon = getPlayerIconComponent(player.icon)}
			<li class="podium__list-item">
				<span class="podium__rank">#{i + 1}</span>
				<span class="podium__icon" aria-hidden="true">
					{#if Icon}<Icon size={16} />{/if}
				</span>
				<span class="podium__name">{player.name}</span>
				<span class="podium__score">
					{$_('game.pts', { values: { n: player.totalScore } })}
				</span>
			</li>
		{/each}
	</ol>

	<Button size="lg" text={$_('game.new_game')} onclick={onstartover} />
</div>

<style>
	.podium {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 28rem;
	}

	.podium__label {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		color: hsl(0 0% 100% / 0.4);
	}

	.podium__winner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.podium__winner-icon {
		display: grid;
		place-items: center;
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		background: var(--question-color, var(--orange-600));
		color: var(--white);
	}

	.podium__winner-name {
		margin: 0;
		font-family: 'Erica One', sans-serif;
		font-size: var(--font-size-3xl);
		font-weight: 400;
		color: var(--white);
		line-height: 1.1;
		text-align: center;
	}

	.podium__winner-score {
		margin: 0;
		font-family: var(--font-family-body);
		font-size: var(--font-size-xl);
		font-weight: 600;
		color: var(--question-color, var(--orange-400));
	}

	.podium__list {
		width: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.podium__list-item {
		display: grid;
		grid-template-columns: 2rem 1.75rem 1fr auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.875rem;
		border-radius: 0.5rem;
		background: hsl(0 0% 100% / 0.06);
		font-family: var(--font-family-body);
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--white);
	}

	.podium__rank {
		color: hsl(0 0% 100% / 0.35);
		font-size: var(--font-size-md);
	}

	.podium__icon {
		display: grid;
		place-items: center;
		color: hsl(0 0% 100% / 0.6);
	}

	.podium__score {
		color: hsl(0 0% 100% / 0.5);
		font-size: var(--font-size-md);
	}

</style>
