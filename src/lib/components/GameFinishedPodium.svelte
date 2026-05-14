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

	const sortedPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);

	const winners = $derived(
		sortedPlayers.filter(
			(p) => p.totalScore === sortedPlayers[0]?.totalScore,
		),
	);

	const getRank = (/** @type {number} */ index) => {
		if (index === 0) return 1;
		if (
			sortedPlayers[index].totalScore ===
			sortedPlayers[index - 1].totalScore
		) {
			return getRank(index - 1);
		}
		return index + 1;
	};

	// --- Premium Shuffle State ---
	let activeIdx = $state(0);

	$effect(() => {
		if (winners.length <= 1) return;
		const interval = setInterval(() => {
			activeIdx = (activeIdx + 1) % winners.length;
		}, 3000);
		return () => clearInterval(interval);
	});
</script>

<div class="podium">
	<p class="podium__label">{$_('game.game_over')}</p>

	{#if winners.length > 0}
		<div class="podium__winner">
			<div class="podium__winner-icons">
				{#each winners as winner, i (winner.id)}
					{@const WinnerIcon = getPlayerIconComponent(winner.icon)}
					{@const position =
						winners.length === 1
							? 'center'
							: i === activeIdx
								? 'left'
								: i === (activeIdx + 1) % winners.length
									? 'right'
									: 'hidden'}

					<div
						class="podium__winner-icon"
						data-position={position}
						style:--player-color="var(--{winner.color})"
					>
						{#if WinnerIcon}<WinnerIcon
								size={winners.length > 2 ? 32 : 56}
							/>{/if}
					</div>
				{/each}
			</div>
			<p class="podium__winner-name">
				{#if winners.length === 1}
					{$_('game.wins', { values: { name: winners[0].name } })}
				{:else}
					{$_('game.wins_joint', {
						values: {
							names:
								winners
									.slice(0, -1)
									.map((w) => w.name)
									.join(', ') +
								' & ' +
								winners[winners.length - 1].name,
						},
					})}
				{/if}
			</p>
			<p class="podium__winner-score">
				{$_('game.pts', { values: { n: winners[0].totalScore } })}
			</p>
		</div>
	{/if}

	<ol class="podium__list">
		{#each sortedPlayers as player, i (player.id)}
			{@const Icon = getPlayerIconComponent(player.icon)}
			{@const rank = getRank(i)}
			<li class="podium__list-item">
				<span class="podium__rank">#{rank}</span>
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

	.podium__winner-icons {
		display: flex;
		justify-content: center;
		margin-bottom: 0.5rem;
		position: relative;
		height: 6.5rem;
		width: 100%;
		perspective: 1000px;
	}

	.podium__winner-icon {
		position: absolute;
		display: grid;
		place-items: center;
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		background: var(--player-color, var(--orange-600));
		color: var(--white);
		box-shadow:
			0 0 0 4px var(--palette-purple-dark),
			0 10px 30px hsl(0 0% 0% / 0.3);

		opacity: 0;
		transform: scale(0.6) translateZ(-150px);
		z-index: 1;
		transition:
			opacity 0.8s,
			transform 0.8s,
			z-index 0.8s;
		transition-behavior: allow-discrete;
		pointer-events: none;

		&[data-position='center'] {
			opacity: 1;
			transform: scale(1) translateZ(0);
			z-index: 10;
		}

		&[data-position='left'] {
			opacity: 1;
			transform: translateX(-2rem) scale(1) translateZ(0);
			z-index: 10;
		}

		&[data-position='right'] {
			opacity: 1;
			transform: translateX(2rem) scale(1) translateZ(0);
			z-index: 5;
		}

		&[data-position='hidden'] {
			opacity: 0;
			transform: scale(0.6) translateZ(-150px) blur(4px);
			z-index: 1;
		}
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
