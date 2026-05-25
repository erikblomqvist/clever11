<script>
	import PreviousGamesView from '$lib/views/PreviousGamesView.svelte';
	import { goto } from '$app/navigation';
	import { game } from '$lib/game';
	import { _ } from 'svelte-i18n';

	let loading = $state(false);

	async function handleLoadGame(/** @type {string} */ code) {
		loading = true;
		try {
			await game.loadGame(code);
			goto(`/game/${code.toUpperCase()}`);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('app.previous_games')} — Clever 11</title>
</svelte:head>

<main class="main--previous-games">
	<PreviousGamesView onloadgame={handleLoadGame} onback={() => goto('/')} />
</main>

{#if loading}
	<div
		class="loading-overlay"
		aria-label={$_('app.loading_aria')}
		aria-busy="true"
	>
		<span class="loading-spinner"></span>
	</div>
{/if}
