<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { game } from '$lib/game';
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
	import { ENABLE_STREAK_ANIMATIONS } from '$lib/streak-config.js';

	/** @type {{ onstartover: () => void }} */
	let { onstartover } = $props();

	let dialogOpen = $state(false);
	let pendingBlobIndex = $state(/** @type {number|null} */ (null));
	let undoDialogOpen = $state(false);
	let gamePaused = $state(false);
	let reviewToggledBlobIndexes = $state(/** @type {number[]} */ ([]));
	let reviewToggleRoundKey = /** @type {string|null} */ (null);

	const question = $derived(game.currentRound?.question ?? null);

	const questionTypeConfig = $derived(
		question ? (QUESTION_TYPES[question.type] ?? null) : null,
	);

	const usesImageOptions = $derived(
		question?.options?.length > 0 &&
			question?.options?.length === question?.answerMedia?.length &&
			question?.answerMedia?.every(
				(media) =>
					typeof media?.option_image_url === 'string' &&
					media.option_image_url.trim() !== '',
			),
	);

	const reviewBlobStates = $derived(
		question
			? question.options.map((_, i) => {
					const result = game.currentRound?.blobResults?.[i];
					const isToggled = reviewToggledBlobIndexes.includes(i);
					if (result !== undefined) {
						return isToggled ? null : result;
					}
					return isToggled ? true : null;
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
		gamePaused ||
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
		const playerName = game.currentPlayer?.name ?? '';
		game.passCurrentPlayer();
		toast($_('game.times_up', { values: { name: playerName } }), {
			duration: 3000,
		});
	}

	$effect(() => {
		game.currentPlayerId;
		game.currentRound?.roundNumber;
		resetTimer();
	});

	$effect(() => {
		if (!timerEnabled || timerPaused) return;

		let last = performance.now();
		let raf = requestAnimationFrame(function tick(now) {
			const dt = (now - last) / 1000;
			last = now;
			if (timerRemaining > 0) {
				const next = timerRemaining - dt;
				if (next <= 0) {
					timerRemaining = 0;
					handleTimerExpiry();
				} else {
					timerRemaining = next;
				}
			}
			raf = requestAnimationFrame(tick);
		});

		return () => cancelAnimationFrame(raf);
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
		game.currentPlayer
			? getSeatRotationTurns(game.currentPlayer.seatPosition)
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
	const wheelStreakLevel = $derived(game.currentPlayer?.roundScore ?? 0);
	const wheelStreakColor = $derived(
		game.currentPlayer
			? `var(--${game.currentPlayer.color})`
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
		/** @type {NonNullable<ReturnType<typeof game.revealBlob>>} */ result,
	) {
		clearStreakCelebration();
		streakCelebrationPlayerId = result.playerId;
		streakBurstKey += 1;

		streakCelebrationTimerId = setTimeout(() => {
			streakCelebrationTimerId = null;
			streakCelebrationPlayerId = null;

			if (result.nextPlayerId) {
				game.advanceCurrentPlayer(result.playerId);
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
			!gamePaused &&
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
			gamePaused ||
			dialogOpen ||
			undoDialogOpen ||
			streakCelebrationActive ||
			roundIntro.seatRotation !== null
		) {
			springDrag.reset();
		}
	});

	$effect(() => {
		if (game.status !== 'playing') {
			gamePaused = false;
		}
	});

	$effect(() => {
		roundIntro.syncRound({
			status: game.status,
			round: game.currentRound,
			starter: game.currentPlayer,
			playerCount: game.players.length,
		});
	});

	$effect(() => {
		const roundKey = game.currentRound
			? `${game.currentRound.roundNumber}:${game.currentRound.question.id}`
			: null;

		if (game.status !== 'round_review' || !roundKey) {
			reviewToggledBlobIndexes = [];
			reviewToggleRoundKey = null;
			return;
		}

		if (reviewToggleRoundKey !== roundKey) {
			reviewToggledBlobIndexes = [];
			reviewToggleRoundKey = roundKey;
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

	const pendingBlobImageUrl = $derived(
		pendingBlobIndex !== null && question
			? (question.answerMedia?.[pendingBlobIndex]?.option_image_url ?? '')
			: '',
	);

	const usedRankAnswers = $derived.by(() => {
		if (question?.type !== 'rank') return [];
		const round = game.currentRound;
		if (!round) return [];
		return Object.keys(round.blobResults)
			.map(Number)
			.filter((i) => i !== pendingBlobIndex)
			.map((i) => question.correctAnswers[i])
			.filter((v) => typeof v === 'number');
	});

	function handleBlobClick(/** @type {number} */ blobIndex) {
		if (streakCelebrationActive) return;
		pendingBlobIndex = blobIndex;
		dialogOpen = true;
	}

	function handleUndoBlobClick(/** @type {number} */ blobIndex) {
		if (streakCelebrationActive) return;
		if (blobIndex !== game.undoableBlobIndex) return;
		undoDialogOpen = true;
	}

	function handleReviewBlobClick(/** @type {number} */ blobIndex) {
		reviewToggledBlobIndexes = reviewToggledBlobIndexes.includes(blobIndex)
			? reviewToggledBlobIndexes.filter((i) => i !== blobIndex)
			: [...reviewToggledBlobIndexes, blobIndex];
	}

	function handleDialogResult(/** @type {boolean} */ isCorrect) {
		dialogOpen = false;
		if (pendingBlobIndex !== null) {
			const shouldDeferAdvance =
				ENABLE_STREAK_ANIMATIONS &&
				isCorrect &&
				game.currentPlayer?.roundScore === STREAK_THRESHOLD - 1;
			const result = game.revealBlob(pendingBlobIndex, isCorrect, {
				deferAdvance: shouldDeferAdvance,
			});

			if (isCorrect) resetTimer();

			if (
				ENABLE_STREAK_ANIMATIONS &&
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
		game.undoLastMove();
		resetTimer();
	}

	function handlePassOrEnd() {
		if (streakCelebrationActive) return;
		if (game.roundIsOver) {
			game.endRound();
		} else {
			game.passCurrentPlayer();
		}
	}

	function handleUndo() {
		if (streakCelebrationActive) return;
		game.undoLastMove();
		resetTimer();
	}

	function handleSkipRound() {
		game.skipRound();
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
		currentPlayer={game.currentPlayer}
		players={game.players}
		{question}
		blobStates={game.blobStates}
		seatRotation={interactiveWheelSeatRotation}
		{actionButtonSeatRotation}
		rotationDurationMs={wheelRotationDurationMs}
		rotationEasing={wheelRotationEasing}
		streakLevel={wheelStreakLevel}
		streakColor={wheelStreakColor}
		{streakBurstKey}
		undoableBlobIndex={game.undoableBlobIndex}
		undoIsAvailable={game.undoIsAvailable}
		canSkipRound={game.canSkipRound}
		roundIsOver={game.roundIsOver}
		{streakCelebrationActive}
		{dialogOpen}
		{pendingBlobLabel}
		{pendingBlobAnswer}
		{pendingBlobImageUrl}
		{usedRankAnswers}
		{usesImageOptions}
		{undoDialogOpen}
		{gamePaused}
		turnTimerSeconds={game.turnTimerSeconds}
		turnTimerRemaining={timerRemaining}
		turnTimerPaused={timerPaused}
		onstartover={handleStartOver}
		onundo={handleUndo}
		onskipround={handleSkipRound}
		ontogglepause={() => (gamePaused = !gamePaused)}
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
		onvote={(vote) => game.setRoundVote(vote)}
		onnext={() => game.startNextRound()}
	/>
{:else if game.status === 'finished'}
	<GameFinishedSurface
		questionTypeToken={questionTypeConfig?.cssToken}
		players={game.players}
		playedQuestions={game.playedQuestions}
		onstartover={handleStartOver}
	/>
{/if}
