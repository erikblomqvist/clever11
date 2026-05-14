<script>
	import { _ } from 'svelte-i18n';
	import { Circle } from 'lucide-svelte';
	import { getPlayerIconComponent } from '$lib/playerIcons.js';

	/**
	 * @type {{ players: { id: string, name: string, icon: string, color: string, totalScore: number }[] }}
	 */
	let { players } = $props();

	const rankedPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);

	const getRank = (/** @type {number} */ index) => {
		if (index === 0) return 1;
		if (
			rankedPlayers[index].totalScore ===
			rankedPlayers[index - 1].totalScore
		) {
			return getRank(index - 1);
		}
		return index + 1;
	};

	const playersByRank = $derived.by(() => {
		/** @type {Record<number, typeof players>} */
		const map = {};
		rankedPlayers.forEach((p, i) => {
			const r = getRank(i);
			if (!map[r]) map[r] = [];
			map[r].push(p);
		});
		return map;
	});

	const podiumSlots = $derived([
		{ rank: 1, players: playersByRank[1] || [], id: 'first' },
		{ rank: 2, players: playersByRank[2] || [], id: 'second' },
		{ rank: 3, players: playersByRank[3] || [], id: 'third' },
	]);

	const remainingPlayers = $derived.by(() => {
		return rankedPlayers
			.map((p, i) => ({ ...p, rank: getRank(i) }))
			.filter((p) => p.rank > 3);
	});

	// --- Premium Shuffle State ---
	let activeIndices = $state(/** @type {Record<string, number>} */ ({}));

	$effect(() => {
		const intervals = podiumSlots
			.filter((s) => s.players.length > 1)
			.map((slot) => {
				return setInterval(() => {
					activeIndices[slot.id] =
						((activeIndices[slot.id] ?? 0) + 1) %
						slot.players.length;
				}, 3000);
			});

		return () => intervals.forEach(clearInterval);
	});
</script>

<section class="overall-score-list">
	{#if rankedPlayers.length > 0}
		<ol class="overall-score-list__podium">
			{#each [1, 0, 2] as slotIndex (slotIndex)}
				{@const slot = podiumSlots[slotIndex]}
				{@const activeIdx = activeIndices[slot.id] ?? 0}
				<li
					class="overall-score-list__podium-item"
					data-podium-rank={slot.id}
				>
					<div
						class="overall-score-list__podium-icons"
						class:overall-score-list__podium-icons--multiple={slot
							.players.length > 1}
					>
						{#if slot.players.length > 0}
							{#each slot.players as player, i (player.id)}
								{@const Icon = getPlayerIconComponent(
									player.icon,
								)}
								{@const position =
									i === activeIdx
										? 'left'
										: i ===
											  (activeIdx + 1) %
													slot.players.length
											? 'right'
											: 'hidden'}

								<span
									class="overall-score-list__podium-icon"
									data-position={position}
									style:--player-ring="var(--{player.color})"
									aria-hidden="true"
								>
									{#if Icon}
										<Icon
											size={slot.id === 'first' ? 28 : 24}
										/>
									{/if}
									<span
										class="overall-score-list__podium-rank"
										>{slot.rank}</span
									>
								</span>
							{/each}
						{:else}
							<span
								class="overall-score-list__podium-icon overall-score-list__podium-icon--placeholder"
							>
								<Circle size={20} />
								<span class="overall-score-list__podium-rank"
									>{slot.rank}</span
								>
							</span>
						{/if}
					</div>

					<span class="overall-score-list__podium-player">
						{#if slot.players.length === 0}
							—
						{:else if slot.players.length === 1}
							{slot.players[0].name}
						{:else if slot.players.length === 2}
							{slot.players[0].name} & {slot.players[1].name}
						{:else}
							{slot.players.length} {$_('game.standings_tied')}
						{/if}
					</span>
					<span class="overall-score-list__podium-score">
						{#if slot.players.length > 0}
							{$_('game.pts', {
								values: { n: slot.players[0].totalScore },
							})}
						{:else}
							—
						{/if}
					</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#if remainingPlayers.length > 0}
		<ol class="overall-score-list__remaining">
			{#each remainingPlayers as player (player.id)}
				{@const Icon = getPlayerIconComponent(player.icon)}
				<li class="overall-score-list__remaining-item">
					<span class="overall-score-list__remaining-rank"
						>{player.rank}</span
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
			--podium-color: var(--color-gold);
			order: 2;

			& .overall-score-list__podium-icon {
				width: 5rem;
				height: 5rem;
			}
		}

		&[data-podium-rank='second'] {
			--podium-color: var(--color-silver);
			order: 1;
			margin-block-start: 0.5rem;
		}

		&[data-podium-rank='third'] {
			--podium-color: var(--color-bronze);
			order: 3;
			margin-block-start: 0.5rem;
		}
	}

	.overall-score-list__podium-icons {
		position: relative;
		display: grid;
		place-items: center;
		height: 5rem;
		width: 100%;
		perspective: 1000px;
	}

	.overall-score-list__podium-icon {
		position: absolute;
		display: grid;
		place-items: center;

		border-radius: 50%;
		outline: 2px solid var(--podium-color);
		outline-offset: 4px;
		width: 4rem;
		height: 4rem;
		background-color: var(--player-ring, transparent);
		box-shadow: 0 4px 12px hsl(0 0% 0% / 0.2);

		color: var(--palette-white);

		opacity: 0;
		transform: scale(0.6) translateZ(-100px);
		z-index: 1;
		transition:
			opacity 0.8s,
			transform 0.8s,
			z-index 0.8s,
			outline-color 0.8s;
		transition-behavior: allow-discrete;
		pointer-events: none;

		&[data-position='left'] {
			opacity: 1;
			transform: translateX(-0.75rem) scale(1) translateZ(0);
			z-index: 10;
		}

		&[data-position='right'] {
			opacity: 1;
			transform: translateX(0.75rem) scale(1) translateZ(0);
			z-index: 5;
		}

		&[data-position='hidden'] {
			opacity: 0;
			transform: scale(0.6) translateZ(-100px);
			z-index: 1;
		}
	}

	.overall-score-list__podium-icon--placeholder {
		background-color: var(--palette-purple-dark);
		outline-style: dashed;
		opacity: 0.6;
		color: var(--palette-white);

		& :global(svg) {
			stroke-dasharray: 4 4;
			opacity: 0.5;
		}
	}

	.overall-score-list__podium-rank {
		position: absolute;
		bottom: -0.9rem;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		z-index: 10;

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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
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

		.overall-score-list__podium-icons {
			height: 3.4rem;
		}

		.overall-score-list__podium-rank {
			width: 1.65rem;
			height: 1.65rem;
			font-size: var(--font-size-sm);
		}

		.overall-score-list__podium-player {
			font-size: var(--font-size-md);
		}
	}
</style>
