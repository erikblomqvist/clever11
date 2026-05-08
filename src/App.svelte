<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import HomeView from './components/HomeView.svelte';
	import SetupView from './views/SetupView.svelte';
	import GameView from './views/GameView.svelte';
	import PreviousGamesView from './views/PreviousGamesView.svelte';
	import DemoView from './views/DemoView.svelte';
	import { initGame, loadGame } from './lib/game.svelte.js';
	import GameToaster from './components/GameToaster.svelte';

	/** @typedef {'landing'|'setup'|'game'|'previousGames'|'demo'} AppView */

	/** @returns {AppView} */
	function getInitialView() {
		return window.location.pathname === '/demo' ? 'demo' : 'landing';
	}

	/** @type {AppView} */
	let view = $state(getInitialView());
	let loading = $state(false);
	/** @type {string|null} */
	let loadError = $state(null);

	/** @param {AppView} newView */
	function navigate(newView) {
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				view = newView;
			});
		} else {
			view = newView;
		}

		const nextPath = newView === 'demo' ? '/demo' : '/';
		if (window.location.pathname !== nextPath) {
			window.history.pushState({}, '', nextPath);
		}
	}

	onMount(() => {
		function handlePopState() {
			view = getInitialView();
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
