<script>
	import { _ } from 'svelte-i18n';
	import { Users, ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import Button from './Button.svelte';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

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
	let { players, roundNumber, vote = null, onvote, onnext, onmanageplayers } = $props();

	function handleVote(/** @type {boolean} */ value) {
		onvote?.(vote === value ? null : value);
	}

	const activePlayers = $derived(players.filter((p) => p.status !== 'removed'));

	const rankedPlayers = $derived(
		[...activePlayers].sort((a, b) => b.roundScore - a.roundScore),
	);
</script>

<div class="review-panel">
	<h2 class="review-panel__heading">
		{$_('game.round_heading', { values: { n: roundNumber } })}
	</h2>
	<ol class="review-panel__scores">
		{#each rankedPlayers as player (player.id)}
			{@const PlayerIcon = getPlayerIconComponent(player.icon)}
			<li class="review-panel__score-item">
				<span class="review-panel__player-icon" aria-hidden="true">
					{#if PlayerIcon}<PlayerIcon size={14} />{/if}
				</span>
				<span class="review-panel__player-name">{player.name}</span>
				<span class="review-panel__round-score"
					>+{player.roundScore}</span
				>
				<span class="review-panel__total-score">
					{$_('game.pts', { values: { n: player.totalScore } })}
				</span>
			</li>
		{/each}
	</ol>
	<div class="review-panel__actions">
		<div class="review-panel__vote" role="group" aria-label={$_('game.question_vote_aria')}>
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
		<Button variant="secondary" size="sm" icon={Users} text={$_('manage_players.title')} onclick={onmanageplayers} />
	</div>
</div>

<style>
	.review-panel {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		height: var(--review-panel-height);
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto 1fr;
		gap: 0.4rem 1rem;
		padding: 0.75rem 1.25rem max(0.75rem, env(safe-area-inset-bottom));
		background: hsl(0 0% 5% / 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid hsl(0 0% 100% / 0.1);
	}

	.review-panel__heading {
		grid-column: 1 / -1;
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: hsl(0 0% 100% / 0.45);
	}

	.review-panel__scores {
		grid-column: 1;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.2rem;
		overflow-y: auto;
		min-width: 0;
	}

	.review-panel__score-item {
		display: grid;
		grid-template-columns: 1.25rem 1fr auto auto;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--white);
	}

	.review-panel__player-icon {
		display: grid;
		place-items: center;
		color: hsl(0 0% 100% / 0.55);
	}

	.review-panel__player-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.review-panel__round-score {
		color: var(--white);
		font-size: var(--font-size-xl);
		min-width: 2.5rem;
		text-align: right;
	}

	.review-panel__total-score {
		color: hsl(0 0% 100% / 0.4);
		font-size: var(--font-size-md);
		min-width: 3.25rem;
		text-align: right;
	}

	.review-panel__actions {
		grid-column: 2;
		grid-row: 2;
		align-self: center;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		align-items: stretch;
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
		transition: color 0.15s, border-color 0.15s, background-color 0.15s;
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
