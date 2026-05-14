<script>
	import QuestionWheel from '$lib/components/QuestionWheel.svelte';
	import RoundReviewPanel from '$lib/components/RoundReviewPanel.svelte';
	import ManagePlayersOverlay from '$lib/components/ManagePlayersOverlay.svelte';
	import { game } from '$lib/game.svelte.js';
	import {
		SPRING_DRAG_RETURN_DURATION_MS,
		useSpringDrag,
	} from '$lib/hooks/useSpringDrag.svelte.js';

	/**
	 * @type {{
	 *   questionTypeToken?: string,
	 *   question: import('$lib/game.svelte.js').GameQuestion|null,
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
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

	const SPRING_DRAG_IGNORE_SELECTOR =
		'button, a, input, select, textarea, [role="button"], [popover], [data-game-scroll-lock-allow]';

	let surfaceEl = $state(/** @type {HTMLElement | null} */ (null));

	const springDrag = useSpringDrag({
		canStart: (/** @type {PointerEvent} */ event) =>
			event.isPrimary &&
			event.pointerType !== 'mouse' &&
			!showManagePlayers &&
			!(
				event.target instanceof Element &&
				event.target.closest(SPRING_DRAG_IGNORE_SELECTOR) !== null
			),
		getCenter: () => {
			if (!surfaceEl) return null;
			const rect = surfaceEl.getBoundingClientRect();
			return {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			};
		},
	});

	const interactiveSeatRotation = $derived(
		seatRotation + springDrag.rotationOffset,
	);
	const rotationDurationMs = $derived(
		springDrag.isActive ? 0 : SPRING_DRAG_RETURN_DURATION_MS,
	);

	let showManagePlayers = $state(false);

	$effect(() => {
		if (showManagePlayers) {
			springDrag.reset();
		}
	});
</script>

<main
	bind:this={surfaceEl}
	class="main--review"
	data-question-type={questionTypeToken}
	onpointerdown={springDrag.handlePointerDown}
	onpointermove={springDrag.handlePointerMove}
	onpointerup={springDrag.handlePointerEnd}
	onpointercancel={springDrag.handlePointerEnd}
	onlostpointercapture={springDrag.handlePointerEnd}
>
	{#if question}
		<QuestionWheel
			questionType={question.type}
			questionText={question.text}
			answers={question.options}
			correctAnswers={question.correctAnswers}
			answerMedia={question.answerMedia}
			blobs={reviewBlobStates}
			seatRotation={interactiveSeatRotation}
			{rotationDurationMs}
			volcanoRumbleEnabled={false}
			{onblobclick}
		/>
	{/if}

	<RoundReviewPanel
		{players}
		{roundNumber}
		{vote}
		{onvote}
		{onnext}
		onmanageplayers={() => (showManagePlayers = true)}
	/>

	{#if showManagePlayers}
		<ManagePlayersOverlay
			players={game.players}
			onremove={(id) => game.removePlayer(id)}
			onreplace={(id, identity) => game.replacePlayer(id, identity)}
			onadd={(params) => game.addPlayer(params)}
			onclose={() => (showManagePlayers = false)}
		/>
	{/if}
</main>
