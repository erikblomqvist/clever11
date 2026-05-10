<script>
	import SetupView from '$views/SetupView.svelte';
	import { goto } from '$app/navigation';
	import { initGame } from '$lib/game.svelte.js';
	import { _ } from 'svelte-i18n';

	let loading = $state(false);

	async function handleSetupComplete(setup) {
		loading = true;
		await initGame(setup);
		// The game code is generated in initGame and stored in the game state
		const { game } = await import('$lib/game.svelte.js');
		goto(`/game/${game.code}`);
		loading = false;
	}
</script>

<svelte:head>
	<title>Clever 11 — Setup</title>
</svelte:head>

<main class="main--setup">
	<SetupView oncomplete={handleSetupComplete} onback={() => goto('/')} />
</main>

{#if loading}
	<div class="loading-overlay" aria-label={$_('app.loading_aria')} aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{/if}
