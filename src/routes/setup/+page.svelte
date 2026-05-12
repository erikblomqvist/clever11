<script>
	import SetupView from '$lib/views/SetupView.svelte';
	import { goto } from '$app/navigation';
	import { game } from '$lib/game.svelte.js';
	import { _ } from 'svelte-i18n';

	let loading = $state(false);

	async function handleGameInit(/** @type {any} */ setup) {
		loading = true;
		try {
			await game.initGame(setup);
			goto(`/game/${game.code}`);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('app.setup')} — Clever 11</title>
</svelte:head>

<main class="main--setup">
	<SetupView oninit={handleGameInit} onback={() => goto('/')} />
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
