<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '$lib/playerIcons.js';

	/**
	 * @type {{ players: { id: string, name: string, icon: string, color: string, totalScore: number }[] }}
	 */
	let { players } = $props();

	const rankedPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);
	const topThree = $derived(rankedPlayers.slice(0, 3));
	const remainingPlayers = $derived(rankedPlayers.slice(3));
</script>

<section class="overall-score-list">
	{#if topThree.length > 0}
		<ol class="overall-score-list__podium">
			{#each [1, 0, 2] as podiumIndex (podiumIndex)}
				{@const player = topThree[podiumIndex]}
				{#if player}
					{@const Icon = getPlayerIconComponent(player.icon)}
					<li
						class="overall-score-list__podium-item"
						data-podium-rank={podiumIndex === 0 ? 'first' : podiumIndex === 1 ? 'second' : 'third'}
					>
						{#if Icon}
							<span
								class="overall-score-list__podium-icon"
								style:--player-ring="var(--{player.color})"
								aria-hidden="true"
							>
								<Icon size={28} />
								<span class="overall-score-list__podium-rank">{podiumIndex + 1}</span>
							</span>
						{/if}
						<span class="overall-score-list__podium-player">{player.name}</span>
						<span class="overall-score-list__podium-score">
							{$_('game.pts', {
								values: { n: player.totalScore },
							})}
						</span>
					</li>
				{/if}
			{/each}
		</ol>
	{/if}

	{#if remainingPlayers.length > 0}
		<ol class="overall-score-list__remaining">
			{#each remainingPlayers as player, index (player.id)}
				{@const Icon = getPlayerIconComponent(player.icon)}
				<li class="overall-score-list__remaining-item">
					<span class="overall-score-list__remaining-rank"
						>{index + 4}</span
					>
					{#if Icon}
						<span
							class="overall-score-list__remaining-icon"
							style:--player-ring="var(--{player.color})"
							aria-hidden="true"
						>
							<Icon size={12} />
						</span>
					{/if}
					<span class="overall-score-list__remaining-player"
						>{player.name}</span
					>
					<span class="overall-score-list__remaining-score"
						>{$_('game.pts', {
							values: { n: player.totalScore },
						})}</span
					>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.overall-score-list {
		display: grid;
		gap: 0.75rem;
		width: min(100%, 32rem);
	}

	.overall-score-list__podium {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.15rem;
		align-items: end;
		margin: 0;
		padding: 0 0.35rem;
		list-style: none;
	}

	.overall-score-list__podium-item {
		display: grid;
		justify-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.35rem;
		min-height: 7.6rem;
		color: var(--grayscale-900);

		&[data-podium-rank='first'] {
			--podium-color: lch(85% 83 86);
			
			order: 2;
			transform: translateY(-0.5rem);

			& .overall-score-list__podium-icon {
				width: 5rem;
				height: 5rem;
			}
		}

		&[data-podium-rank='second'] {
			--podium-color: lch(80% 0 0);

			order: 1;

			margin-block-start: 0.5rem;
		}

		&[data-podium-rank='third'] {
			--podium-color: lch(61% 60 62);

			order: 3;

			margin-block-start: 0.5rem;
		}
	}

	.overall-score-list__podium-icon {
		position: relative;
		display: grid;
		place-items: center;

		border-radius: 50%;
		outline: 2px solid var(--podium-color);
		outline-offset: 4px;
		width: 4rem;
		height: 4rem;
		background-color: var(--player-ring, transparent);

		color: var(--palette-white);
	}

	.overall-score-list__podium-rank {
		position: absolute;
		bottom: -0.9rem;
		display: grid;
		place-items: center;

		border-radius: 50%;
		width: 1.75rem;
		height: 1.75rem;
		background-color: var(--podium-color);

		font-size: var(--font-size-sm);
		font-weight: 600;
		color: contrast-color(var(--podium-color));
	}

	.overall-score-list__podium-player {
		margin-top: 1.15rem;
		font-size: var(--font-size-base);
		font-weight: 600;
		text-align: center;
		line-height: 1.1;
		color: var(--palette-white);
	}

	.overall-score-list__podium-score {
		font-size: var(--font-size-sm);
		color: var(--grayscale-100);
		font-weight: 400;
	}

	.overall-score-list__remaining {
		display: grid;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.overall-score-list__remaining-item {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		gap: 0.5rem;
		align-items: center;

		border: 1px solid lch(from var(--palette-purple-dark) calc(l + 5) c h);
		border-radius: 0.5rem;
		padding: 0.375rem 0.5rem;
		background-color: var(--palette-purple-dark);
		color: var(--palette-white);
	}

	.overall-score-list__remaining-rank {
		display: grid;
		place-items: center;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background-color: var(--grayscale-300);
		color: var(--grayscale-900);
		font-size: var(--font-size-xs);
		font-weight: 700;
	}

	.overall-score-list__remaining-icon {
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 50%;
		background-color: var(--player-ring, transparent);
		color: var(--palette-white);
	}

	.overall-score-list__remaining-player {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.overall-score-list__remaining-score {
		font-size: var(--font-size-sm);
		font-weight: 400;
	}

	@media (max-width: 28rem) {
		.overall-score-list__podium {
			gap: 0.75rem;
			padding: 0;
		}

		.overall-score-list__podium-item {
			min-height: 7.1rem;
		}

		.overall-score-list__podium-icon {
			width: 3.4rem;
			height: 3.4rem;
		}

		.overall-score-list__podium-rank {
			top: 2.5rem;
			width: 1.65rem;
			height: 1.65rem;
			font-size: var(--font-size-sm);
		}

		.overall-score-list__podium-player {
			font-size: var(--font-size-md);
		}
	}
</style>
