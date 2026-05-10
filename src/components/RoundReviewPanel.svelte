<script>
	import { _ } from 'svelte-i18n';
	import { Users, ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import Button from './Button.svelte';
	import PlayerIcon from './PlayerIcon.svelte';

	/**
	 * @type {{
	 *   players: import('../lib/game.svelte.js').GamePlayer[],
	 *   roundNumber?: number,
	 *   vote?: boolean|null,
	 *   onvote?: (vote: boolean|null) => void,
	 *   onnext: () => void,
	 *   onmanageplayers: () => void,
	 * }}
	 */
	let {
		players,
		roundNumber,
		vote = null,
		onvote,
		onnext,
		onmanageplayers,
	} = $props();

	function handleVote(/** @type {boolean} */ value) {
		onvote?.(vote === value ? null : value);
	}

	const activePlayers = $derived(
		players.filter((p) => p.status !== 'removed'),
	);

	const rankedPlayers = $derived(
		[...activePlayers].sort((a, b) => b.roundScore - a.roundScore),
	);

	const highestTotalScore = $derived(
		activePlayers.length > 0
			? Math.max(...activePlayers.map((p) => p.totalScore))
			: null,
	);
</script>

<div class="review-panel">
	<div class="review-panel__header">
		<div class="review-panel__header--start">
			<h2 class="review-panel__round-heading">
				{$_('game.round_heading', { values: { n: roundNumber } })}
			</h2>
			<h1 class="review-panel__standings-heading">
				{$_('game.standings')}
			</h1>
		</div>
		<Button
			variant="tertiary"
			size="sm"
			icon={Users}
			text={$_('manage_players.title')}
			onclick={onmanageplayers}
			class="review-panel__manage-players-btn"
			style="--btn-padding: 0.75rem 1rem;"
		/>
	</div>
	<ol class="review-panel__scores">
		{#each rankedPlayers as player (player.id)}
			{@const rank = rankedPlayers.indexOf(player) + 1}
			<li
				class="review-panel__score-item"
				class:leader={player.totalScore === highestTotalScore}
				style="--player-color: var(--{player.color});"
			>
				<span
					class="review-panel__player-icon"
					data-rank={rank}
					aria-hidden="true"
				>
					<PlayerIcon
						player={player}
						size={40}
					/>
				</span>
				<span class="review-panel__player-name">{player.name}</span>
				<span class="review-panel__player-meta">
					<span class="review-panel__round-score">+{player.roundScore}</span>
					<span class="review-panel__total-score">
						<b>{player.totalScore}</b>
						{$_('game.pts_short')}
					</span>
				</span>
			</li>
		{/each}
	</ol>
	<div class="review-panel__actions">
		<div
			class="review-panel__vote"
			role="group"
			aria-label={$_('game.question_vote_aria')}
		>
			<button
				class="review-panel__vote-btn"
				class:review-panel__vote-btn--active={vote === true}
				type="button"
				aria-label={$_('game.thumbs_up_aria')}
				aria-pressed={vote === true}
				onclick={() => handleVote(true)}
			>
				<ThumbsUp size={16} />
			</button>
			<button
				class="review-panel__vote-btn"
				class:review-panel__vote-btn--active={vote === false}
				type="button"
				aria-label={$_('game.thumbs_down_aria')}
				aria-pressed={vote === false}
				onclick={() => handleVote(false)}
			>
				<ThumbsDown size={16} />
			</button>
		</div>
		<Button text={$_('game.next_round')} onclick={onnext} />
	</div>
</div>

<style>
	.review-panel {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		container-type: inline-size;
		container-name: review-panel;

		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		border-top: 1px solid var(--palette-purple-neutral);
		padding: 1.5rem 1.5rem max(1.5rem, env(safe-area-inset-bottom));
		background: var(--palette-purple-dark);
	}

	.review-panel__header {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;

		h1 {
			margin: 0;

			font-family: var(--font-family-display);
			color: var(--palette-white);
		}
	}

	.review-panel__round-heading {
		grid-column: 1;

		margin-block: 0 0.25rem;

		font-family: var(--font-family-display);
		font-size: var(--font-size-base);
		font-weight: 400;
		text-transform: uppercase;
		color: var(--color-muted-light);
	}

	:global(.review-panel__manage-players-btn) {
		grid-column: 2;
		grid-row: 1;
	}

	.review-panel__scores {
		display: flex;
		gap: 0.5rem;

		margin: 0 -1.5rem;
		max-width: 100cqi;
		padding: 0 1.5rem;
		list-style: none;
		overflow-y: auto;
	}

	.review-panel__score-item {
		display: grid;
		grid-template-rows: 1fr 1fr;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.125rem 0.75rem;

		border-radius: 0.75rem;
		border: 1px solid color-mix(in oklab, var(--player-color) 28%, transparent);
		min-width: 10rem;
		padding: 0.75rem;
		background-color: color-mix(in oklab, var(--player-color) 14%, transparent);

		font-family: var(--font-family-primary);
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--white);

		&.leader {
			border-color: color-mix(in oklab, var(--player-color) 35%, transparent);
			background-color: color-mix(in oklab, var(--player-color) 22%, transparent);
		}
	}
	
	.review-panel__player-icon {
		grid-row: 1 / 3;
		display: grid;
		place-items: center;
		box-sizing: border-box;

		border-radius: 50%;
		outline: 2px solid color-mix(in oklab, var(--player-color) 50%, var(--palette-white) 30%);
		width: 40px;
		height: 40px;
		color: var(--palette-white);
	}

	.review-panel__player-name {
		font-weight: 700;
		font-size: var(--font-size-base);
	}

	.review-panel__player-meta {
		font-family: var(--font-family-display);
		font-size: var(--font-size-base);
		font-variant-numeric: tabular-nums;
	}

	.review-panel__round-score {
		min-width: 4rem;
		
		font-weight: 700;
		text-align: end;
		color: var(--player-color);
	}

	.review-panel__total-score {
		margin-inline-start: 0.5rem;
		min-width: 4rem;
		
		font-weight: 400;
		text-align: end;
		color: hsl(0 0% 100% / 0.4);

		b {
			font-weight: 700;
			color: var(--palette-white);
		}
	}

	.review-panel__actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.review-panel__vote {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.review-panel__vote-btn {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid hsl(0 0% 100% / 0.15);
		border-radius: 0.5rem;
		background: none;
		color: hsl(0 0% 100% / 0.35);
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s,
			background-color 0.15s;
	}

	.review-panel__vote-btn:hover {
		color: hsl(0 0% 100% / 0.6);
		border-color: hsl(0 0% 100% / 0.3);
	}

	.review-panel__vote-btn--active {
		color: hsl(0 0% 100% / 0.9);
		border-color: hsl(0 0% 100% / 0.4);
		background-color: hsl(0 0% 100% / 0.1);
	}

	.review-panel__vote-btn--active:hover {
		color: hsl(0 0% 100% / 0.9);
		border-color: hsl(0 0% 100% / 0.4);
	}
</style>
