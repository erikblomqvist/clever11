<script>
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { ChevronLeft, ArrowRight } from 'lucide-svelte';
	import { fetchPreviousGamesPage } from '../lib/previousGames.js';
	import Button from '../components/Button.svelte';
	import Message from '../components/Message.svelte';
	import PlayerIcon from '../components/PlayerIcon.svelte';

	/**
	 * @type {{
	 *   onback: () => void,
	 *   onloadgame: (code: string) => void,
	 *   loaderror?: string|null,
	 * }}
	 */
	let { onback, onloadgame, loaderror = null } = $props();

	let games = $state(
		/** @type {import('../lib/previousGames.js').PreviousGame[]} */ ([]),
	);
	let page = $state(1);
	let pageSize = $state(10);
	let total = $state(0);
	let totalPages = $state(1);
	let loading = $state(true);
	let error = $state(/** @type {string|null} */ (null));

	const MAX_ICONS = 4;
	const MAX_NAMES = 3;
	const MAX_DECKS = 3;

	async function loadPage(/** @type {number} */ nextPage) {
		loading = true;
		error = null;

		try {
			const result = await fetchPreviousGamesPage(nextPage);
			games = result.games;
			page = result.page;
			pageSize = result.pageSize;
			total = result.total;
			totalPages = result.totalPages;
		} catch (e) {
			error = /** @type {Error} */ (e).message;
			games = [];
			total = 0;
			totalPages = 1;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadPage(1);
	});

	/** @param {import('../lib/previousGames.js').PreviousGameParticipant[]} participants */
	function getLeader(participants) {
		if (!participants.length) return null;
		return participants.reduce((a, b) =>
			a.totalScore >= b.totalScore ? a : b,
		);
	}

	/** @param {string|null} value */
	function formatRelativeTime(value) {
		if (!value) return '';
		const diffMs = Date.now() - new Date(value).getTime();
		const diffMin = Math.floor(diffMs / 60_000);
		const diffHr = Math.floor(diffMs / 3_600_000);
		const diffDay = Math.floor(diffMs / 86_400_000);

		if (diffMin < 1) return $_('previous_games.just_now');

		const rtf = new Intl.RelativeTimeFormat($locale, {
			style: 'short',
			numeric: 'always',
		});
		if (diffMin < 60) return rtf.format(-diffMin, 'minute');
		if (diffHr < 24) return rtf.format(-diffHr, 'hour');
		return rtf.format(-diffDay, 'day');
	}

	/** @param {string|null} value */
	function formatStartedTime(value) {
		if (!value) return '';
		const now = new Date();
		const then = new Date(value);
		const time = new Intl.DateTimeFormat($locale, {
			timeStyle: 'short',
		}).format(then);

		if (then.toDateString() === now.toDateString()) {
			return $_('previous_games.today_time', { values: { time } });
		}

		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		if (then.toDateString() === yesterday.toDateString()) {
			return $_('previous_games.yesterday_time', { values: { time } });
		}

		return new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(
			then,
		);
	}

	const pageRange = $derived.by(() => {
		if (total === 0) return $_('previous_games.page_empty');

		const start = (page - 1) * pageSize + 1;
		const end = Math.min(total, start + games.length - 1);
		return $_('previous_games.page_range', {
			values: { start, end, total },
		});
	});
</script>

<div class="previous-games">
	<header class="previous-games__header">
		<h1 class="previous-games__title">{$_('previous_games.title')}</h1>
		<Button
			variant="secondary"
			size="sm"
			icon={ChevronLeft}
			text={$_('setup.back')}
			onclick={onback}
			style="--btn-padding: 0.375rem 0.625rem"
		/>
	</header>

	<section class="previous-games__content" aria-busy={loading}>
		{#if loaderror}
			<Message variant="error" description={loaderror} />
		{/if}

		{#if loading}
			<p class="previous-games__hint">{$_('previous_games.loading')}</p>
		{:else if error}
			<p class="previous-games__error">{error}</p>
		{:else if games.length === 0}
			<p class="previous-games__hint">{$_('previous_games.empty')}</p>
		{:else}
			<ul class="previous-games__list" role="list">
				{#each games as game (game.code)}
					{@const leader = getLeader(game.participants)}
					{@const accentColor = leader
						? `var(--${leader.color})`
						: 'var(--palette-purple)'}
					{@const iconOverflow = Math.max(
						0,
						game.participants.length - MAX_ICONS,
					)}
					{@const nameOverflow = Math.max(
						0,
						game.participants.length - MAX_NAMES,
					)}
					{@const deckOverflow = Math.max(
						0,
						game.deckNames.length - MAX_DECKS,
					)}
					<li>
						<button
							class="game-card"
							type="button"
							style="--accent: {accentColor}"
							onclick={() => onloadgame(game.code)}
							aria-label={$_('previous_games.load_game_aria', {
								values: { code: game.code },
							})}
						>
							<div class="game-card__code-box">
								<span class="game-card__code-label">CODE</span>
								<span class="game-card__code">{game.code}</span>
							</div>

							<div class="game-card__body">
								<div class="game-card__players">
									{#if game.participants.length > 0}
										<span class="game-card__icons">
											{#each game.participants.slice(0, MAX_ICONS) as p (p.name)}
												<PlayerIcon
													player={p}
													size={24}
												/>
											{/each}
											{#if iconOverflow > 0}
												<span
													class="game-card__icon-overflow"
													>+{iconOverflow}</span
												>
											{/if}
										</span>
										<span class="game-card__names">
											{game.participants
												.slice(0, MAX_NAMES)
												.map((p) => p.name)
												.join(', ')}
											{#if nameOverflow > 0}
												<span
													class="game-card__name-overflow"
													>&nbsp;+{nameOverflow}</span
												>
											{/if}
										</span>
									{:else}
										<span
											class="game-card__names game-card__names--empty"
										>
											{$_(
												'previous_games.no_participants',
											)}
										</span>
									{/if}
								</div>

								<div class="game-card__pills">
									{#if leader}
										<span class="game-card__status-pill">
											{$_('previous_games.round_leads', {
												values: {
													round: game.roundNumber,
													name: leader.name,
												},
											})}
										</span>
									{/if}
									{#each game.deckNames.slice(0, MAX_DECKS) as deck}
										<span class="game-card__deck-pill"
											>{deck}</span
										>
									{/each}
									{#if deckOverflow > 0}
										<span class="game-card__deck-pill"
											>+{deckOverflow}</span
										>
									{/if}
								</div>

								<div class="game-card__meta">
									{#if game.lastMoveAt}
										<span
											>{$_('previous_games.last_move')}
											{formatRelativeTime(
												game.lastMoveAt,
											)}</span
										>
										<span class="game-card__meta-sep"
											>&middot;</span
										>
									{/if}
									{#if game.roundNumber === 1}
										<span
											>{$_(
												'previous_games.only_one_round',
											)}</span
										>
									{:else}
										<span
											>{$_('previous_games.started_at', {
												values: {
													time: formatStartedTime(
														game.startedAt,
													),
												},
											})}</span
										>
									{/if}
								</div>
							</div>

							<div class="game-card__resume">
								<span class="game-card__resume-circle">
									<ArrowRight size={20} />
								</span>
								<span class="game-card__resume-label"
									>{$_('previous_games.resume')}</span
								>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<footer class="previous-games__footer">
		<span class="previous-games__page-range">{pageRange}</span>
		<div class="previous-games__pagination">
			<Button
				variant="secondary"
				size="sm"
				text={$_('previous_games.previous')}
				onclick={() => loadPage(page - 1)}
				disabled={loading || page <= 1}
			/>
			<Button
				variant="secondary"
				size="sm"
				text={$_('previous_games.next')}
				onclick={() => loadPage(page + 1)}
				disabled={loading || page >= totalPages}
			/>
		</div>
	</footer>
</div>

<style>
	.previous-games {
		box-sizing: border-box;
		display: grid;
		grid-template-rows: auto 1fr auto;

		margin-inline: auto;
		width: max(50vw, 50rem);
		height: 100svh;

		color: var(--white);
	}

	.previous-games__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: max(1rem, env(safe-area-inset-top)) 1rem 0.75rem;
		border-bottom: 1px solid hsl(0 0% 100% / 0.2);
	}

	.previous-games__title {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-xl);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.previous-games__content {
		overflow-y: auto;
		overscroll-behavior: none;
		padding: 1rem;
	}

	.previous-games__hint,
	.previous-games__error {
		margin: 0;
		color: var(--color-muted);
		font-size: var(--font-size-base);
		text-align: center;
	}

	.previous-games__error {
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		border: 1px solid hsl(0 86% 58% / 0.4);
		border-radius: 0.5rem;
		background: hsl(0 86% 58% / 0.2);
		color: var(--white);
	}

	.previous-games__list {
		display: grid;
		gap: 0.75rem;
		max-width: 54rem;
		margin: 0 auto;
		padding: 0;
		list-style: none;
	}

	/* Game card */

	.game-card {
		cursor: pointer;
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
		align-items: center;

		width: 100%;
		padding: 1rem;
		border: 1px solid hsl(0 0% 100% / 0.08);
		border-radius: 0.75rem;
		background-color: var(--palette-purple-dark);

		font-family: var(--font-family-body);
		text-align: start;
		color: var(--white);

		&:hover {
			background-color: lch(
				from var(--palette-purple-dark) calc(l + 3) c h
			);
		}
	}

	.game-card__code-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;

		min-width: 5.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		border-left: 3px solid var(--accent);
		background-color: lch(from var(--palette-purple-dark) calc(l - 3) c h);
	}

	.game-card__code-label {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.game-card__code {
		font-family: var(--font-family-monospace);
		font-size: var(--font-size-lg);
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.game-card__body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.game-card__players {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.game-card__icons {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.game-card__icon-overflow {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: hsl(0 0% 100% / 0.15);
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.game-card__names {
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.game-card__names--empty {
		color: var(--color-muted);
		font-style: italic;
	}

	.game-card__name-overflow {
		color: var(--color-muted);
		font-weight: 400;
	}

	.game-card__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.game-card__status-pill {
		padding: 0.1875rem 0.625rem;
		border-radius: 1rem;
		background-color: color-mix(in lch, var(--accent) 20%, transparent);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.game-card__deck-pill {
		padding: 0.1875rem 0.625rem;
		border-radius: 1rem;
		border: 1px solid hsl(0 0% 100% / 0.15);
		font-size: var(--font-size-sm);
	}

	.game-card__meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.game-card__meta-sep {
		opacity: 0.5;
	}

	.game-card__resume {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.game-card__resume-circle {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: var(--accent);
		color: var(--palette-white);
		transition: transform var(--transition-default-duration);
	}

	.game-card:hover .game-card__resume-circle {
		transform: scale(1.05);
	}

	.game-card__resume-label {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	/* Pagination footer */

	.previous-games__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem max(1rem, env(safe-area-inset-bottom));
		border-top: 1px solid hsl(0 0% 100% / 0.2);
	}

	.previous-games__page-range {
		color: var(--color-muted);
		font-size: var(--font-size-sm);
	}

	.previous-games__pagination {
		display: flex;
		gap: 0.5rem;
	}

	/* Mobile */

	@media (max-width: 640px) {
		.game-card {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.game-card__code-box {
			flex-direction: row;
			gap: 0.75rem;
			min-width: unset;
		}

		.game-card__resume {
			flex-direction: row;
			gap: 0.5rem;
		}

		.game-card__resume-circle {
			width: 2.5rem;
			height: 2.5rem;
		}

		.previous-games__footer {
			align-items: stretch;
			flex-direction: column;
		}

		.previous-games__pagination {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
