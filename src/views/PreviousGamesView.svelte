<script>
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { ChevronLeft, ArrowRight } from 'lucide-svelte';
	import { fetchPreviousGamesPage } from '../lib/previousGames.js';
	import Button from '../components/Button.svelte';
	import Message from '../components/Message.svelte';
	import PlayerIcon from '../components/PlayerIcon.svelte';
	import SearchInput from '../components/SearchInput.svelte';

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
	let page = $state(0);
	let totalPages = $state(1);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state(/** @type {string|null} */ (null));

	let sentinel = $state(/** @type {HTMLDivElement|null} */ (null));
	let searchQuery = $state('');
	let debouncedSearch = $state('');

	let hasMore = $derived(page < totalPages);

	const MAX_ICONS = 4;
	const MAX_NAMES = 3;
	const MAX_DECKS = 3;

	let requestGeneration = 0;

	async function loadNextPage() {
		const gen = requestGeneration;
		const nextPage = page + 1;
		const isInitial = nextPage === 1;

		if (isInitial) {
			loading = true;
		} else {
			loadingMore = true;
		}
		error = null;

		try {
			const result = await fetchPreviousGamesPage(
				nextPage,
				debouncedSearch,
			);
			if (gen !== requestGeneration) return;
			games = [...games, ...result.games];
			page = result.page;
			totalPages = result.totalPages;
		} catch (e) {
			if (gen !== requestGeneration) return;
			error = /** @type {Error} */ (e).message;
			if (isInitial) {
				games = [];
				totalPages = 1;
			}
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	onMount(() => {
		loadNextPage();
	});

	$effect(() => {
		const q = searchQuery;
		const timeout = setTimeout(() => {
			debouncedSearch = q;
		}, 300);
		return () => clearTimeout(timeout);
	});

	let prevSearch = '';
	$effect(() => {
		const search = debouncedSearch;
		if (search === prevSearch) return;
		prevSearch = search;
		requestGeneration++;
		games = [];
		page = 0;
		totalPages = 1;
		loadNextPage();
	});

	$effect(() => {
		const el = sentinel;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (
					entries[0]?.isIntersecting &&
					hasMore &&
					!loading &&
					!loadingMore
				) {
					loadNextPage();
				}
			},
			{ rootMargin: '200px' },
		);

		observer.observe(el);

		return () => {
			observer.disconnect();
		};
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

		const yesterday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - 1,
		);
		if (then.toDateString() === yesterday.toDateString()) {
			return $_('previous_games.yesterday_time', { values: { time } });
		}

		return new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(
			then,
		);
	}

	/**
	 * Groups games into time-based sections: Today, Yesterday, Earlier this week, Older.
	 * Uses lastMoveAt, falling back to startedAt when no moves exist.
	 */
	const groupedGames = $derived.by(() => {
		const now = new Date();
		const today = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const yesterday = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() - 1,
		);

		const dayOfWeek = today.getDay();
		const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const weekStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() - daysFromMonday,
		);

		/** @type {{ label: string, games: import('../lib/previousGames.js').PreviousGame[] }[]} */
		const buckets = [
			{ label: 'previous_games.group_today', games: [] },
			{ label: 'previous_games.group_yesterday', games: [] },
			{ label: 'previous_games.group_earlier_this_week', games: [] },
			{ label: 'previous_games.group_older', games: [] },
		];

		for (const game of games) {
			const timestamp = game.lastMoveAt ?? game.startedAt;
			const date = new Date(timestamp);
			const dateDay = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
			);

			if (dateDay.getTime() >= today.getTime()) {
				buckets[0].games.push(game);
			} else if (dateDay.getTime() >= yesterday.getTime()) {
				buckets[1].games.push(game);
			} else if (dateDay.getTime() >= weekStart.getTime()) {
				buckets[2].games.push(game);
			} else {
				buckets[3].games.push(game);
			}
		}

		return buckets.filter((b) => b.games.length > 0);
	});
</script>

<div class="previous-games">
	<header class="previous-games__header">
		<Button
			variant="secondary"
			size="sm"
			icon={ChevronLeft}
			onclick={onback}
			aria-label={$_('setup.back')}
		/>
		<div class="previous-games__header-text">
			<h1 class="previous-games__title">
				{$_('previous_games.continue_title')}
			</h1>
			<p class="previous-games__subtitle">
				{$_('previous_games.subtitle')}
			</p>
		</div>
	</header>

	<div class="previous-games__search">
		<SearchInput
			placeholder={$_('previous_games.search_placeholder')}
			bind:value={searchQuery}
		/>
	</div>

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
			{#each groupedGames as group (group.label)}
				<div class="previous-games__group">
					<h2 class="previous-games__group-header">
						<span class="previous-games__group-label"
							>{$_(group.label)}</span
						>
						<span class="previous-games__group-line"></span>
					</h2>
					<ul class="previous-games__list" role="list">
						{#each group.games as game (game.code)}
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
									aria-label={$_(
										'previous_games.load_game_aria',
										{
											values: { code: game.code },
										},
									)}
								>
									<div class="game-card__code-box">
										<span class="game-card__code-label"
											>CODE</span
										>
										<span class="game-card__code"
											>{game.code}</span
										>
									</div>

									<div class="game-card__body">
										<div class="game-card__players">
											{#if game.participants.length > 0}
												<span class="game-card__icons">
													{#each game.participants.slice(0, MAX_ICONS) as p (p.name)}
														<PlayerIcon
															player={p}
															size={24}
															className="game-card__icon"
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
												<span
													class="game-card__status-pill"
												>
													{$_(
														'previous_games.round_leads',
														{
															values: {
																round: game.roundNumber,
																name: leader.name,
															},
														},
													)}
												</span>
											{/if}
											{#each game.deckNames.slice(0, MAX_DECKS) as deck (deck)}
												<span
													class="game-card__deck-pill"
													>{deck}</span
												>
											{/each}
											{#if deckOverflow > 0}
												<span
													class="game-card__deck-pill"
													>+{deckOverflow}</span
												>
											{/if}
										</div>

										<div class="game-card__meta">
											{#if game.lastMoveAt}
												<span
													>{$_(
														'previous_games.last_move',
													)}
													{formatRelativeTime(
														game.lastMoveAt,
													)}</span
												>
												<span
													class="game-card__meta-sep"
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
													>{$_(
														'previous_games.started_at',
														{
															values: {
																time: formatStartedTime(
																	game.startedAt,
																),
															},
														},
													)}</span
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
				</div>
			{/each}

			{#if loadingMore}
				<p class="previous-games__loading-more">
					{$_('previous_games.loading')}
				</p>
			{/if}

			{#if hasMore}
				<div
					bind:this={sentinel}
					class="previous-games__sentinel"
				></div>
			{/if}
		{/if}
	</section>
</div>

<style>
	.previous-games {
		box-sizing: border-box;
		display: grid;
		grid-template-rows: auto auto 1fr;

		margin-inline: auto;
		width: max(50vw, 50rem);
		height: 100svh;

		color: var(--white);
	}

	.previous-games__header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: max(1rem, env(safe-area-inset-top)) 1rem 0.75rem;
		border-bottom: 1px solid hsl(0 0% 100% / 0.2);
	}

	.previous-games__search {
		padding: 0.75rem 1rem;
	}

	.previous-games__header-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.previous-games__title {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-xl);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.previous-games__subtitle {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-muted);
		line-height: 1.4;
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

	/* Time group sections */

	.previous-games__group {
		max-width: 54rem;
		margin: 0 auto;
	}

	.previous-games__group + .previous-games__group {
		margin-top: 1.5rem;
	}

	.previous-games__group-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 0.75rem;
	}

	.previous-games__group-label {
		font-family: var(--font-family-monospace);
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.previous-games__group-line {
		flex: 1;
		height: 1px;
		background-color: hsl(0 0% 100% / 0.15);
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
		display: grid;
		grid-template-columns: repeat(auto-fit, 20px);
		flex-shrink: 0;

		width: 100%;
	}

	:global(.game-card__icon) {
		--size: 10px;
		
		mask-image: radial-gradient(
			circle at calc(100% + 4px) 50%,
			transparent var(--size),
			black var(--size)
		);

		&:last-child {
			mask-image: none;
		}
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
		border-radius: 1rem;
		padding: 0.1875rem 0.625rem;
		background-color: color-mix(in lch, var(--accent) 20%, transparent);

		font-size: var(--font-size-sm);
		font-weight: 500;
		line-height: 1.3;
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

	/* Infinite scroll */

	.previous-games__loading-more {
		margin: 1rem 0 0;
		color: var(--color-muted);
		font-size: var(--font-size-base);
		text-align: center;
	}

	.previous-games__sentinel {
		height: 1px;
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
			justify-content: center;
			gap: 0.5rem;
			padding: 0.5rem;
			border-radius: 0.5rem;
			background-color: hsl(0 0% 100% / 0.05);
		}

		.game-card__resume-circle {
			width: 2.5rem;
			height: 2.5rem;
		}
	}
</style>
