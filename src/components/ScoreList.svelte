<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: { name: string, icon: string, color: string, status: string, roundScore: number }[],
	 * }}
	 */
	let { players } = $props();
</script>

<ol class="score-list">
	{#each players as player (player.id)}
		{@const Icon = getPlayerIconComponent(player.icon)}
		<li class="score-list__item" data-player-state={player.status}>
			{#if Icon}
				<span class="score-list__icon" style:--player-ring="var(--{player.color})" aria-hidden="true">
					<Icon size={14} />
				</span>
			{/if}
			<span class="score-list__player">{player.name}</span>
			<span class="score-list__status">
				{#if player.status === 'active'}
					{$_('score.playing')}
				{:else if player.status === 'passed'}
					{$_('score.passed')}
				{:else if player.status === 'out'}
					{$_('score.out')}
				{:else}
					{player.status}
				{/if}
			</span>
			<span class="score-list__score">{player.roundScore}</span>
		</li>
	{/each}
</ol>

<style>
	.score-list {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.score-list__item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.125rem 0.5rem;
		align-items: center;
		border: 2px solid var(--grayscale-200);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: var(--grayscale-100);
	}

	.score-list__icon {
		display: grid;
		place-items: center;
		grid-row: span 3;
		flex-shrink: 0;

		border-radius: 50%;
		width: 1.75rem;
		height: 1.75rem;
		background-color: var(--player-ring, transparent);
		
		color: var(--palette-white);
	}

	.score-list__player {
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.score-list__status {
		color: var(--grayscale-600);
		font-size: var(--font-size-base);
	}

	.score-list__score {
		grid-row: span 2;
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.score-list__item[data-player-state='active'] {
		border-color: var(--palette-purple-start);
		background-color: var(--palette-white);
	}

	.score-list__item[data-player-state='passed'],
	.score-list__item[data-player-state='incorrect'],
	.score-list__item[data-player-state='out'] {
		opacity: 0.58;
	}

	.score-list__item[data-player-state='passed'] {
		border-style: dashed;
	}

	.score-list__item[data-player-state='incorrect'],
	.score-list__item[data-player-state='out'] {
		border-color: hsl(0 86% 58%);
		background:
			linear-gradient(
				135deg,
				transparent calc(50% - 1px),
				hsl(0 86% 58% / 0.65) 50%,
				transparent calc(50% + 1px)
			),
			var(--grayscale-100);
	}
</style>
