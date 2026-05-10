<script>
	import GameFinishedPodium from '$lib/components/GameFinishedPodium.svelte';

	/**
	 * @type {{
	 *   questionTypeToken?: string,
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
	 *   onstartover: () => void,
	 * }}
	 */
	let { questionTypeToken, players, onstartover } = $props();
</script>

<main class="main--finished" data-question-type={questionTypeToken}>
	<GameFinishedPodium {players} {onstartover} />
</main>
