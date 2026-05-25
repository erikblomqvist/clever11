<script>
	import HomeView from '$lib/components/home/HomeView.svelte';
	import { goto } from '$app/navigation';
	import { game } from '$lib/game';
	import { _ } from 'svelte-i18n';

	let loading = $state(false);
	let loadError = $state(null);

	async function handleLoadGame(code) {
		loading = true;
		loadError = null;
		try {
			await game.loadGame(code);
			goto(`/game/${code.toUpperCase()}`);
		} catch (e) {
			loadError = e.message ?? $_('app.load_error');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Clever 11</title>
</svelte:head>

<main class="main--landing">
	<HomeView
		onnewgame={() => goto('/setup')}
		onloadgame={handleLoadGame}
		onpreviousgames={() => goto('/games')}
		loaderror={loadError}
	/>
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
