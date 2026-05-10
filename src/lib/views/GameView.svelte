<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import {
		game,
		gameQueries,
		revealBlob,
		advanceCurrentPlayer,
		passCurrentPlayer,
		endRound,
		startNextRound,
		setRoundVote,
		undoLastMove,
		skipRound,
	} from '$lib/game.svelte.js';
	import * as engine from '$lib/gameEngine.js';
	import { QUESTION_TYPES } from '$lib/data/questionTypes.js';
	import GamePlayingSurface from './game/GamePlayingSurface.svelte';
	import GameRoundReviewSurface from './game/GameRoundReviewSurface.svelte';
	import GameFinishedSurface from './game/GameFinishedSurface.svelte';
	import {
		DEFAULT_ROTATION_EASING,
		getSeatRotationTurns,
		useRoundIntro,
	} from '$lib/hooks/useRoundIntro.svelte.js';
	import {
		SPRING_DRAG_RETURN_DURATION_MS,
		useSpringDrag,
	} from '$lib/hooks/useSpringDrag.svelte.js';
	import { useGameInteractionLock } from '$lib/hooks/useGameInteractionLock.js';

	/** @type {{ onstartover: () => void }} */
	let { onstartover } = $props();

	let dialogOpen = $state(false);
	let pendingBlobIndex = $state(/** @type {number|null} */ (null));
	let undoDialogOpen = $state(false);
	let reviewRevealedBlobIndexes = $state(/** @type {number[]} */ ([]));
	let reviewRevealRoundKey = /** @type {string|null} */ (null);

	const question = $derived(game.currentRound?.question ?? null);

	const questionTypeConfig = $derived(
		question ? (QUESTION_TYPES[question.type] ?? null) : null,
	);

	const reviewBlobStates = $derived(
		question
			? question.options.map((_, i) => {
					const result = game.currentRound?.blobResults?.[i];
					if (result !== undefined) return result;
					return reviewRevealedBlobIndexes.includes(i) ? true : null;
				})
			: [],
	);

	const STREAK_THRESHOLD = 3;
	const STREAK_CELEBRATION_MS = 1000;
	const SPRING_DRAG_IGNORE_SELECTOR =
		'button, a, input, select, textarea, [role="button"], [popover], [data-game-scroll-lock-allow]';
	let gameSurfaceEl = $state(/** @type {HTMLElement | null} */ (null));
	let streakCelebrationPlayerId = $state(/** @type {string|null} */ (null));
	let streakBurstKey = $state(0);
	let streakCelebrationTimerId =
		/** @type {ReturnType<typeof setTimeout>|null} */ (null);

	const roundIntro = useRoundIntro();

	let timerRemaining = $state(game.turnTimerSeconds ?? 0);

	const timerEnabled = $derived(
		game.turnTimerSeconds !== null && game.status === 'playing',
	);
	const timerPaused = $derived(
		dialogOpen ||
			undoDialogOpen ||
			streakCelebrationActive ||
			pendingBlobIndex !== null ||
			roundIntro.seatRotation !== null,
	);

	function resetTimer() {
		if (game.turnTimerSeconds !== null) {
			timerRemaining = game.turnTimerSeconds;
		}
	}

	function handleTimerExpiry() {
		const playerName = gameQueries.currentPlayer?.name ?? '';
		passCurrentPlayer();
		toast($_('game.times_up', { values: { name: playerName } }), {
			duration: 3000,
		});
		if (engine.checkRoundOver(game)) {
			endRound();
		}
	}

	$effect(() => {
		game.currentPlayerId;
		resetTimer();
	});

	$effect(() => {
		if (!timerEnabled || timerPaused) return;

		const interval = setInterval(() => {
			timerRemaining -= 1;
			if (timerRemaining <= 0) {
				timerRemaining = 0;
				clearInterval(interval);
				handleTimerExpiry();
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	const springDrag = useSpringDrag({
		canStart: canStartSpringDrag,
		getCenter: () => {
			if (!gameSurfaceEl) return null;
			const rect = gameSurfaceEl.getBoundingClientRect();
			return {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			};
		},
	});
	const interactionLock = useGameInteractionLock({
		getSurfaceElement: () => gameSurfaceEl,
	});

	const seatRotation = $derived(
		gameQueries.currentPlayer
			? getSeatRotationTurns(gameQueries.currentPlayer.seatPosition)
			: 0,
	);

	const lastPlayer = $derived(
		game.players.find((p) => p.id === game.currentRound?.lastPlayerId) ??
			null,
	);

	const reviewSeatRotation = $derived(
		lastPlayer ? getSeatRotationTurns(lastPlayer.seatPosition) : 0,
	);

	const wheelSeatRotation = $derived(roundIntro.seatRotation ?? seatRotation);
	const interactiveWheelSeatRotation = $derived(
		wheelSeatRotation + springDrag.rotationOffset,
	);
	/** Seat rotation for fixed UI (e.g. pass button): not driven by round intro animation or spring drag. */
	const actionButtonSeatRotation = $derived(seatRotation);
	const streakCelebrationActive = $derived(
		streakCelebrationPlayerId !== null,
	);
	const wheelStreakLevel = $derived(
		gameQueries.currentPlayer?.roundScore ?? 0,
	);
	const wheelStreakColor = $derived(
		gameQueries.currentPlayer
			? `var(--${gameQueries.currentPlayer.color})`
			: 'var(--orange-700)',
	);
	const wheelRotationDurationMs = $derived(
		roundIntro.resetIsInstant
			? 0
			: springDrag.isActive
				? 0
				: springDrag.rotationOffset !== 0
					? SPRING_DRAG_RETURN_DURATION_MS
					: roundIntro.seatRotation === null
						? SPRING_DRAG_RETURN_DURATION_MS
						: roundIntro.rotationDurationMs,
	);
	const wheelRotationEasing = $derived(
		roundIntro.seatRotation === null
			? DEFAULT_ROTATION_EASING
			: roundIntro.rotationEasing,
	);

	function clearStreakCelebration() {
		if (streakCelebrationTimerId !== null) {
			clearTimeout(streakCelebrationTimerId);
			streakCelebrationTimerId = null;
		}

		streakCelebrationPlayerId = null;
	}

	function startStreakCelebration(
		/** @type {NonNullable<ReturnType<typeof revealBlob>>} */ result,
	) {
		clearStreakCelebration();
		streakCelebrationPlayerId = result.playerId;
		streakBurstKey += 1;

		streakCelebrationTimerId = setTimeout(() => {
			streakCelebrationTimerId = null;
			streakCelebrationPlayerId = null;

			if (result.nextPlayerId) {
				advanceCurrentPlayer(result.playerId);
			}
		}, STREAK_CELEBRATION_MS);
	}

	function hasOpenPopover() {
		try {
			return document.querySelector('[popover]:popover-open') !== null;
		} catch {
			return false;
		}
	}

	function isSpringDragIgnoredTarget(
		/** @type {EventTarget | null} */ target,
	) {
		return (
			target instanceof Element &&
			target.closest(SPRING_DRAG_IGNORE_SELECTOR) !== null
		);
	}

	function canStartSpringDrag(/** @type {PointerEvent} */ event) {
		return (
			event.isPrimary &&
			event.pointerType !== 'mouse' &&
			game.status === 'playing' &&
			question !== null &&
			roundIntro.seatRotation === null &&
			!streakCelebrationActive &&
			!dialogOpen &&
			!undoDialogOpen &&
			!hasOpenPopover() &&
			!isSpringDragIgnoredTarget(event.target)
		);
	}

	onMount(() => clearStreakCelebration);

	$effect(() => {
		const roundNumber = game.currentRound?.roundNumber;

		if (game.status === 'playing' && roundNumber) {
			interactionLock.scheduleViewportReset();
		}
	});

	$effect(() => {
		if (
			game.status !== 'playing' ||
			dialogOpen ||
			undoDialogOpen ||
			streakCelebrationActive ||
			roundIntro.seatRotation !== null
		) {
			springDrag.reset();
		}
	});

	$effect(() => {
		roundIntro.syncRound({
			status: game.status,
			round: game.currentRound,
			starter: gameQueries.currentPlayer,
			playerCount: game.players.length,
		});
	});

	$effect(() => {
		const roundKey = game.currentRound
			? `${game.currentRound.roundNumber}:${game.currentRound.question.id}`
			: null;

		if (game.status !== 'round_review' || !roundKey) {
			reviewRevealedBlobIndexes = [];
			reviewRevealRoundKey = null;
			return;
		}

		if (reviewRevealRoundKey !== roundKey) {
			reviewRevealedBlobIndexes = [];
			reviewRevealRoundKey = roundKey;
		}
	});

	const pendingBlobLabel = $derived(
		pendingBlobIndex !== null && question
			? question.options[pendingBlobIndex]
			: '',
	);

	const pendingBlobAnswer = $derived(
		pendingBlobIndex !== null && question
			? (question.correctAnswers[pendingBlobIndex] ?? null)
			: null,
	);

	function handleBlobClick(/** @type {number} */ blobIndex) {
		if (streakCelebrationActive) return;
		pendingBlobIndex = blobIndex;
		dialogOpen = true;
	}

	function handleUndoBlobClick(/** @type {number} */ blobIndex) {
		if (streakCelebrationActive) return;
		if (blobIndex !== gameQueries.undoableBlobIndex) return;
		undoDialogOpen = true;
	}

	function handleReviewBlobClick(/** @type {number} */ blobIndex) {
		if (reviewRevealedBlobIndexes.includes(blobIndex)) return;
		reviewRevealedBlobIndexes = [...reviewRevealedBlobIndexes, blobIndex];
	}

	function handleDialogResult(/** @type {boolean} */ isCorrect) {
		dialogOpen = false;
		if (pendingBlobIndex !== null) {
			const shouldDeferAdvance =
				isCorrect &&
				gameQueries.currentPlayer?.roundScore === STREAK_THRESHOLD - 1;
			const result = revealBlob(pendingBlobIndex, isCorrect, {
				deferAdvance: shouldDeferAdvance,
			});

			if (isCorrect) resetTimer();

			if (
				result?.isCorrect &&
				result.previousRoundScore === STREAK_THRESHOLD - 1 &&
				result.newRoundScore === STREAK_THRESHOLD
			) {
				startStreakCelebration(result);
			}

			pendingBlobIndex = null;
		}
	}

	function handleUndoDialogConfirm() {
		if (streakCelebrationActive) return;
		undoDialogOpen = false;
		undoLastMove();
		resetTimer();
	}

	function handlePassOrEnd() {
		if (streakCelebrationActive) return;
		if (gameQueries.roundIsOver) {
			endRound();
		} else {
			passCurrentPlayer();
		}
	}

	function handleUndo() {
		if (streakCelebrationActive) return;
		undoLastMove();
		resetTimer();
	}

	function handleSave() {
		navigator.clipboard?.writeText(game.code).catch(() => {});
		alert($_('game.save_alert', { values: { code: game.code } }));
	}

	function handleSkipRound() {
		skipRound();
	}

	function handleStartOver() {
		if (confirm($_('game.new_game_confirm'))) {
			onstartover();
		}
	}
</script>

{#if game.status === 'playing'}
	<GamePlayingSurface
		bind:surfaceElement={gameSurfaceEl}
		questionTypeToken={questionTypeConfig?.cssToken}
		questionType={question?.type}
		deck={question?.deck}
		deckIcon={question?.deckIcon}
		currentPlayer={gameQueries.currentPlayer}
		players={game.players}
		{question}
		blobStates={gameQueries.blobStates}
		seatRotation={interactiveWheelSeatRotation}
		{actionButtonSeatRotation}
		rotationDurationMs={wheelRotationDurationMs}
		rotationEasing={wheelRotationEasing}
		streakLevel={wheelStreakLevel}
		streakColor={wheelStreakColor}
		{streakBurstKey}
		undoableBlobIndex={gameQueries.undoableBlobIndex}
		undoIsAvailable={gameQueries.undoIsAvailable}
		canSkipRound={gameQueries.canSkipRound}
		roundIsOver={gameQueries.roundIsOver}
		{streakCelebrationActive}
		{dialogOpen}
		{pendingBlobLabel}
		{pendingBlobAnswer}
		{undoDialogOpen}
		turnTimerSeconds={game.turnTimerSeconds}
		turnTimerRemaining={timerRemaining}
		turnTimerPaused={timerPaused}
		onstartover={handleStartOver}
		onsave={handleSave}
		onundo={handleUndo}
		onskipround={handleSkipRound}
		onpassorend={handlePassOrEnd}
		onblobclick={handleBlobClick}
		onundoblobclick={handleUndoBlobClick}
		ondialogresult={handleDialogResult}
		onundoconfirm={handleUndoDialogConfirm}
		onundocancel={() => (undoDialogOpen = false)}
		onpointerdown={springDrag.handlePointerDown}
		onpointermove={springDrag.handlePointerMove}
		onpointerend={springDrag.handlePointerEnd}
	/>
{:else if game.status === 'round_review'}
	<GameRoundReviewSurface
		questionTypeToken={questionTypeConfig?.cssToken}
		{question}
		players={game.players}
		roundNumber={game.currentRound?.roundNumber}
		vote={game.roundVote}
		{reviewBlobStates}
		seatRotation={reviewSeatRotation}
		onblobclick={handleReviewBlobClick}
		onvote={setRoundVote}
		onnext={startNextRound}
	/>
{:else if game.status === 'finished'}
	<GameFinishedSurface
		questionTypeToken={questionTypeConfig?.cssToken}
		players={game.players}
		onstartover={handleStartOver}
	/>
{/if}
