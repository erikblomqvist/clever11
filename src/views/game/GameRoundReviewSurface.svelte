<script>
	import QuestionWheel from '../../components/QuestionWheel.svelte';
	import RoundReviewPanel from '../../components/RoundReviewPanel.svelte';
	import ManagePlayersOverlay from '../../components/ManagePlayersOverlay.svelte';
	import { game, removePlayer, replacePlayer, addPlayer } from '../../lib/game.svelte.js';

	/**
	 * @type {{
	 *   questionTypeToken?: string,
	 *   question: import('../../lib/game.svelte.js').GameQuestion|null,
	 *   players: import('../../lib/game.svelte.js').GamePlayer[],
	 *   roundNumber?: number,
	 *   vote?: boolean|null,
	 *   reviewBlobStates: (boolean|null)[],
	 *   seatRotation: number,
	 *   onblobclick: (index: number) => void,
	 *   onvote?: (vote: boolean|null) => void,
	 *   onnext: () => void,
	 * }}
	 */
	let {
		questionTypeToken,
		question,
		players,
		roundNumber,
		vote,
		reviewBlobStates,
		seatRotation,
		onblobclick,
		onvote,
		onnext,
	} = $props();

	let showManagePlayers = $state(false);
</script>

<main class="main--review" data-question-type={questionTypeToken}>
	{#if question}
		<QuestionWheel
			questionType={question.type}
			questionText={question.text}
			answers={question.options}
			correctAnswers={question.correctAnswers}
			answerMedia={question.answerMedia}
			blobs={reviewBlobStates}
			{seatRotation}
			{onblobclick}
		/>
	{/if}

	<RoundReviewPanel {players} {roundNumber} {vote} {onvote} {onnext} onmanageplayers={() => (showManagePlayers = true)} />

	{#if showManagePlayers}
		<ManagePlayersOverlay
			players={game.players}
			onremove={(id) => removePlayer(id)}
			onreplace={(id, identity) => replacePlayer(id, identity)}
			onadd={(params) => addPlayer(params)}
			onclose={() => (showManagePlayers = false)}
		/>
	{/if}
</main>
