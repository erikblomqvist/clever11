<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import GameView from '$lib/views/GameView.svelte';
	import { game, loadGame } from '$lib/game.svelte.js';
	import { _ } from 'svelte-i18n';

	let loading = $state(true);

	const code = $derived(page.params.code?.toUpperCase());

	onMount(async () => {
		if (game.code !== code) {
			try {
				await loadGame(code);
			} catch {
				goto('/');
			} finally {
				loading = false;
			}
		} else {
			loading = false;
		}
	});

	// Sync phase segment with game status
	const PHASE_TO_SEGMENT = {
		playing: 'playing',
		round_review: 'review',
		finished: 'finished'
	};

	$effect(() => {
		if (loading || !game.code) return;
		const segment = PHASE_TO_SEGMENT[game.status];
		if (!segment) return;
		const currentPhase = page.params.phase;
		if (currentPhase !== segment) {
			goto(`/game/${game.code}/${segment}`, { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Clever 11 — {code}</title>
</svelte:head>

{#if loading}
	<div class="loading-overlay" aria-label={$_('app.loading_aria')} aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{:else}
	<GameView onstartover={() => goto('/')} />
{/if}
