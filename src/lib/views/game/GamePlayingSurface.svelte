<script>
	import GameMenu from '$lib/components/GameMenu.svelte';
	import QuestionWheel from '$lib/components/QuestionWheel.svelte';
	import AnswerDialog from '$lib/components/AnswerDialog.svelte';
	import UndoLastMoveDialog from '$lib/components/UndoLastMoveDialog.svelte';
	import TurnTimerBorder from '$lib/components/TurnTimerBorder.svelte';
	import GameActionButton from './GameActionButton.svelte';
	import { game } from '$lib/game.svelte.js';

	/**
	 * @type {{
	 *   surfaceElement: HTMLElement|null,
	 *   questionTypeToken?: string,
	 *   currentPlayer: import('$lib/game.svelte.js').GamePlayer|null,
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
	 *   question: import('$lib/game.svelte.js').GameQuestion|null,
	 *   questionType?: import('$lib/data/questionTypes.js').QuestionType|null,
	 *   deck?: string|null,
	 *   deckIcon?: string|null,
	 *   blobStates: (boolean|null)[],
	 *   seatRotation: number,
	 *   actionButtonSeatRotation: number,
	 *   rotationDurationMs: number,
	 *   rotationEasing: string,
	 *   streakLevel: number,
	 *   streakColor: string,
	 *   streakBurstKey: number,
	 *   undoableBlobIndex: number|null,
	 *   undoIsAvailable: boolean,
	 *   canSkipRound: boolean,
	 *   roundIsOver: boolean,
	 *   streakCelebrationActive: boolean,
	 *   dialogOpen: boolean,
	 *   pendingBlobLabel: string,
	 *   pendingBlobAnswer: import('$lib/data/game.js').CorrectAnswer|null,
	 *   pendingBlobImageUrl: string,
	 *   usedRankAnswers?: number[],
	 *   usesImageOptions: boolean,
	 *   undoDialogOpen: boolean,
	 *   turnTimerSeconds: number|null,
	 *   turnTimerRemaining: number,
	 *   turnTimerPaused: boolean,
	 *   onstartover: () => void,
	 *   onsave: () => void,
	 *   onundo: () => void,
	 *   onskipround: () => void,
	 *   onpassorend: () => void,
	 *   onblobclick: (index: number) => void,
	 *   onundoblobclick: (index: number) => void,
	 *   ondialogresult: (isCorrect: boolean) => void,
	 *   onundoconfirm: () => void,
	 *   onundocancel: () => void,
	 *   onpointerdown: (event: PointerEvent & { currentTarget: HTMLElement }) => void,
	 *   onpointermove: (event: PointerEvent) => void,
	 *   onpointerend: (event: PointerEvent & { currentTarget: HTMLElement }) => void,
	 * }}
	 */
	let {
		surfaceElement = $bindable(null),
		questionTypeToken,
		currentPlayer,
		players,
		question,
		questionType = null,
		deck = null,
		deckIcon = null,
		blobStates,
		seatRotation,
		actionButtonSeatRotation,
		rotationDurationMs,
		rotationEasing,
		streakLevel,
		streakColor,
		streakBurstKey,
		undoableBlobIndex,
		undoIsAvailable,
		canSkipRound,
		roundIsOver,
		streakCelebrationActive,
		dialogOpen,
		pendingBlobLabel,
		pendingBlobAnswer,
		pendingBlobImageUrl,
		usedRankAnswers = [],
		usesImageOptions,
		undoDialogOpen,
		turnTimerSeconds,
		turnTimerRemaining,
		turnTimerPaused,
		onstartover,
		onsave,
		onundo,
		onskipround,
		onpassorend,
		onblobclick,
		onundoblobclick,
		ondialogresult,
		onundoconfirm,
		onundocancel,
		onpointerdown,
		onpointermove,
		onpointerend,
	} = $props();
</script>

<main
	bind:this={surfaceElement}
	class="main--game"
	data-question-type={questionTypeToken}
	{onpointerdown}
	{onpointermove}
	onpointerup={onpointerend}
	onpointercancel={onpointerend}
	onlostpointercapture={onpointerend}
	style:--current-player-color={currentPlayer
		? `var(--${currentPlayer.color})`
		: null}
>
	<GameMenu
		{players}
		{questionType}
		{deck}
		{deckIcon}
		{onstartover}
		{onsave}
		{onundo}
		{onskipround}
		canundo={undoIsAvailable && !streakCelebrationActive}
		canskipround={canSkipRound && !streakCelebrationActive}
	/>

	{#if question}
		<QuestionWheel
			questionType={question.type}
			questionText={question.text}
			answers={question.options}
			correctAnswers={question.correctAnswers}
			answerMedia={question.answerMedia}
			blobs={blobStates}
			{seatRotation}
			{rotationDurationMs}
			{rotationEasing}
			{streakLevel}
			{streakColor}
			{streakBurstKey}
			{undoableBlobIndex}
			volcanoRumbleEnabled={game.volcanoRumble}
			onblobclick={streakCelebrationActive ? undefined : onblobclick}
			onundoblobclick={streakCelebrationActive
				? undefined
				: onundoblobclick}
		/>
	{/if}

	<GameActionButton
		{roundIsOver}
		disabled={streakCelebrationActive}
		onclick={onpassorend}
		seatRotation={actionButtonSeatRotation}
	/>

	<AnswerDialog
		open={dialogOpen}
		blobLabel={pendingBlobLabel}
		correctAnswer={pendingBlobAnswer}
		questionType={question?.type ?? 'standard'}
		{usesImageOptions}
		{usedRankAnswers}
		optionImageUrl={pendingBlobImageUrl}
		{seatRotation}
		{rotationDurationMs}
		{rotationEasing}
		onresult={ondialogresult}
	/>
	{#if undoDialogOpen}
		<UndoLastMoveDialog
			open={true}
			onconfirm={onundoconfirm}
			oncancel={onundocancel}
		/>
	{/if}

	{#if turnTimerSeconds !== null}
		<TurnTimerBorder
			durationSeconds={turnTimerSeconds}
			playerColor={currentPlayer
				? `var(--${currentPlayer.color})`
				: 'var(--orange-700)'}
			running={true}
			timeRemaining={turnTimerRemaining}
		/>
	{/if}
</main>
