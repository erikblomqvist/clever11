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

	function formatDecks(/** @type {string[]} */ names, fallback) {
		return names.length ? names.join('\n') : fallback;
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
		<Button variant="secondary" size="sm" icon={ChevronLeft} text={$_('setup.back')} onclick={onback} style="--btn-padding: 0.375rem 0.625rem" />
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
							<span class="previous-game-card__participants">
								{formatNames(
									previousGame.participantNames,
									$_('previous_games.no_participants'),
								)}
							</span>

							<span class="previous-game-card__code">{previousGame.code}</span>

							<dl class="previous-game-card__details">
								<dt>{$_('previous_games.decks')}</dt>
								<dd class="previous-game-card__decks">
									{formatDecks(
										previousGame.deckNames,
										$_('previous_games.no_decks'),
									)}
								</dd>
								<dt>{$_('previous_games.started')}</dt>
								<dd>
									{formatDate(previousGame.startedAt)}
								</dd>
								{#if previousGame.lastMoveAt}
									<dt>{$_('previous_games.last_move')}</dt>
									<dd>
										{formatDate(previousGame.lastMoveAt)}
									</dd>
								{/if}
							</dl>
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
		width: max(50vw, 30rem);
		height: 100svh;
		box-sizing: border-box;
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

	.previous-game-card {
		cursor: pointer;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: center;

		border: 2px solid lch(from var(--palette-purple-dark) calc(l + 5) c h);
		border-radius: 0.625rem;
		width: 100%;
		padding: 0.875rem 1rem;
		background-color: var(--palette-purple-dark);

		font-family: var(--font-family-body);
		text-align: start;
		color: var(--white);
		
		&:hover {
			background-color: lch(from var(--palette-purple-dark) calc(l + 5) c h);
		}
	}

	.previous-game-card__participants {
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
	}

	.previous-game-card__code {
		font-family: var(--font-family-monospace);
		font-size: var(--font-size-sm);
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.previous-game-card__details {
		display: grid;
		grid-template-columns: 15ch 1fr;
		gap: 0.5rem 1.5rem;
		grid-column: 1 / -1;

		font-size: var(--font-size-sm);
		line-height: 1.5;

		dt {
			font-weight: 500;
		}

		dd {
			margin: 0;
		}
	}

	.previous-game-card__decks {
		white-space: pre-line;
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
		color: var(--color-muted);
		font-size: var(--font-size-sm);
	}

	.previous-games__pagination {
		display: flex;
		gap: 0.5rem;
	}

	@media (max-width: 520px) {
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
