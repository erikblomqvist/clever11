<script>
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { ChevronLeft } from 'lucide-svelte';
	import { fetchPreviousGamesPage } from '../lib/previousGames.js';
	import Button from '../components/Button.svelte';
	import Message from '../components/Message.svelte';

	/**
	 * @type {{
	 *   onback: () => void,
	 *   onloadgame: (code: string) => void,
	 *   loaderror?: string|null,
	 * }}
	 */
	let { onback, onloadgame, loaderror = null } = $props();

	let games = $state(/** @type {import('../lib/previousGames.js').PreviousGame[]} */ ([]));
	let page = $state(1);
	let pageSize = $state(10);
	let total = $state(0);
	let totalPages = $state(1);
	let loading = $state(true);
	let error = $state(/** @type {string|null} */ (null));

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

	function formatDate(/** @type {string|null} */ value) {
		if (!value) return '';

		return new Intl.DateTimeFormat($locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	function formatNames(/** @type {string[]} */ names, fallback) {
		return names.length ? names.join(', ') : fallback;
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
		<Button variant="secondary" size="sm" icon={ChevronLeft} text={$_('setup.back')} onclick={onback} style="--btn-padding: 0.375rem 0.625rem" />
		<h1 class="previous-games__title">{$_('previous_games.title')}</h1>
	</header>

	<section class="previous-games__content" aria-busy={loading}>
		{#if loaderror}
			<Message variant="error" title={$_('previous_games.load_error_title')} description={loaderror} />
		{/if}

		{#if loading}
			<p class="previous-games__hint">{$_('previous_games.loading')}</p>
		{:else if error}
			<p class="previous-games__error">{error}</p>
		{:else if games.length === 0}
			<p class="previous-games__hint">{$_('previous_games.empty')}</p>
		{:else}
			<ul class="previous-games__list" role="list">
				{#each games as previousGame (previousGame.code)}
					<li>
						<button
							class="previous-game-card"
							type="button"
							onclick={() => onloadgame(previousGame.code)}
							aria-label={$_('previous_games.load_game_aria', {
								values: { code: previousGame.code },
							})}
						>
							<span class="previous-game-card__topline">
								<span class="previous-game-card__code">{previousGame.code}</span>
								<span class="previous-game-card__started">
									{$_('previous_games.started')}: {formatDate(previousGame.startedAt)}
								</span>
							</span>

							<span class="previous-game-card__details">
								<span>
									<strong>{$_('previous_games.decks')}:</strong>
									{formatNames(
										previousGame.deckNames,
										$_('previous_games.no_decks'),
									)}
								</span>
								<span>
									<strong>{$_('previous_games.participants')}:</strong>
									{formatNames(
										previousGame.participantNames,
										$_('previous_games.no_participants'),
									)}
								</span>
								{#if previousGame.lastMoveAt}
									<span>
										<strong>{$_('previous_games.last_move')}:</strong>
										{formatDate(previousGame.lastMoveAt)}
									</span>
								{/if}
							</span>
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
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100svh;
		box-sizing: border-box;
		color: var(--white);
	}

	.previous-games__header {
		display: flex;
		align-items: center;
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
		color: hsl(0 0% 100% / 0.8);
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

	.previous-game-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.625rem;
		padding: 0.875rem 1rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		font-family: var(--font-family-body);
		text-align: left;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.previous-game-card:hover {
		background-color: hsl(0 0% 100% / 0.22);
		border-color: hsl(0 0% 100% / 0.42);
	}

	.previous-game-card__topline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.previous-game-card__code {
		font-family: var(--font-family-monospace);
		font-size: var(--font-size-xl);
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.previous-game-card__started {
		color: hsl(0 0% 100% / 0.75);
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}

	.previous-game-card__details {
		display: grid;
		gap: 0.25rem;
		font-size: var(--font-size-base);
		line-height: 1.25;
	}

	.previous-game-card__details strong {
		margin-inline-end: 0.25rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.previous-games__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem max(1rem, env(safe-area-inset-bottom));
		border-top: 1px solid hsl(0 0% 100% / 0.2);
	}

	.previous-games__page-range {
		color: hsl(0 0% 100% / 0.8);
		font-size: var(--font-size-sm);
	}

	.previous-games__pagination {
		display: flex;
		gap: 0.5rem;
	}

	@media (max-width: 520px) {
		.previous-games__footer,
		.previous-game-card__topline {
			align-items: stretch;
			flex-direction: column;
		}

		.previous-games__pagination {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
