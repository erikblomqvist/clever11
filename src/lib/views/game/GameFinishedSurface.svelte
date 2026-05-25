<script>
	import GameFinishedPodium from '$lib/components/game/GameFinishedPodium.svelte';

	/**
	 * @type {{
	 *   questionTypeToken?: string,
	 *   players: import('$lib/game').GamePlayer[],
	 *   playedQuestions: import('$lib/game').GameQuestion[],
	 *   onstartover: () => void,
	 * }}
	 */
	let { questionTypeToken, players, playedQuestions, onstartover } = $props();
</script>

<main
	class="main--finished"
	data-question-type={questionTypeToken}
	data-game-scroll-lock-allow
>
	<GameFinishedPodium {players} {playedQuestions} {onstartover} />
</main>
