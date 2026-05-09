<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import HomeView from './components/HomeView.svelte';
	import SetupView from './views/SetupView.svelte';
	import GameView from './views/GameView.svelte';
	import PreviousGamesView from './views/PreviousGamesView.svelte';
	import DemoView from './views/DemoView.svelte';
	import { game, initGame, loadGame } from './lib/game.svelte.js';
	import GameToaster from './components/GameToaster.svelte';

	/** @typedef {'landing'|'setup'|'game'|'previousGames'|'demo'} AppView */

	const PHASE_TO_SEGMENT = /** @type {const} */ ({
		playing: 'playing',
		round_review: 'review',
		finished: 'finished',
	});

	/** @returns {{ view: AppView, gameCode?: string }} */
	function parseUrl() {
		const path = window.location.pathname;
		if (path === '/demo') return { view: 'demo' };
		if (path === '/setup') return { view: 'setup' };
		if (path === '/games') return { view: 'previousGames' };
		const gameMatch = path.match(/^\/game\/([A-Z0-9]+)(?:\/(playing|review|finished))?$/i);
		if (gameMatch) return { view: 'game', gameCode: gameMatch[1].toUpperCase() };
		return { view: 'landing' };
	}

	/** @param {AppView} newView */
	function getPath(newView) {
		if (newView === 'demo') return '/demo';
		if (newView === 'setup') return '/setup';
		if (newView === 'previousGames') return '/games';
		if (newView === 'game' && game.code) {
			const segment = PHASE_TO_SEGMENT[game.status] ?? 'playing';
			return `/game/${game.code}/${segment}`;
		}
		return '/';
	}

	const parsed = parseUrl();
	/** @type {AppView} */
	let view = $state(parsed.view);
	let loading = $state(parsed.view === 'game' && !!parsed.gameCode);
	/** @type {string|null} */
	let loadError = $state(null);

	/** @param {AppView} newView */
	function navigate(newView) {
		loadError = null;

		if (document.startViewTransition) {
			document.startViewTransition(() => {
				view = newView;
			});
		} else {
			view = newView;
		}

		const nextPath = getPath(newView);
		if (window.location.pathname !== nextPath) {
			window.history.pushState({}, '', nextPath);
		}
	}

	$effect(() => {
		if (view !== 'game' || !game.code) return;
		const segment = PHASE_TO_SEGMENT[game.status];
		if (!segment) return;
		const expected = `/game/${game.code}/${segment}`;
		if (window.location.pathname !== expected) {
			window.history.replaceState({}, '', expected);
		}
	});

	onMount(() => {
		if (parsed.view === 'game' && parsed.gameCode) {
			loadGame(parsed.gameCode)
				.then(() => {
					loading = false;
				})
				.catch((e) => {
					loadError = /** @type {Error} */ (e).message ?? $_('app.load_error');
					loading = false;
					view = 'landing';
					window.history.replaceState({}, '', '/');
				});
		}

		function handlePopState() {
			const { view: newView, gameCode } = parseUrl();
			if (newView === 'game' && gameCode && game.code !== gameCode) {
				loading = true;
				loadError = null;
				view = 'game';
				loadGame(gameCode)
					.then(() => {
						loading = false;
					})
					.catch((e) => {
						loadError = /** @type {Error} */ (e).message;
						loading = false;
						view = 'landing';
					});
			} else {
				view = newView;
			}
		}

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	});

	/** @param {import('./views/SetupView.svelte').GameSetup} setup */
	async function handleSetupComplete(setup) {
		loading = true;
		await initGame(setup);
		navigate('game');
		loading = false;
	}

	/** @param {string} code */
	async function handleLoadGame(code) {
		loading = true;
		loadError = null;
		try {
			await loadGame(code);
			navigate('game');
		} catch (e) {
			loadError = /** @type {Error} */ (e).message ?? $_('app.load_error');
		} finally {
			loading = false;
		}
	}
</script>

<GameToaster />

{#if loading}
	<div class="loading-overlay" aria-label={$_('app.loading_aria')} aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{/if}

{#if view === 'landing'}
	<main class="main--landing">
		<HomeView
			onnewgame={() => navigate('setup')}
			onloadgame={handleLoadGame}
			onpreviousgames={() => navigate('previousGames')}
			loaderror={loadError}
		/>
	</main>
{:else if view === 'setup'}
	<main class="main--setup">
		<SetupView oncomplete={handleSetupComplete} onback={() => navigate('landing')} />
	</main>
{:else if view === 'previousGames'}
	<main class="main--previous-games">
		<PreviousGamesView
			onback={() => navigate('landing')}
			onloadgame={handleLoadGame}
			loaderror={loadError}
		/>
	</main>
{:else if view === 'game'}
	<GameView onstartover={() => navigate('landing')} />
{:else if view === 'demo'}
	<DemoView onback={() => navigate('landing')} />
{/if}
