import { onMount } from 'svelte';
import { game } from '../lib/game.svelte.js';

const INTRO_INITIAL_FRAME_MS = 30;
const INTRO_SLOW_ARC_TURNS = 4 / 360;
const INTRO_TRAVEL_MS_PER_TURN = 1800;
const INTRO_TRAVEL_MIN_MS = 280;
const INTRO_TRAVEL_MAX_MS = 720;
const INTRO_SLOW_EASING = 'cubic-bezier(0.37, 0.12, 0.63, 0.88)';
const INTRO_TRAVEL_EASING = 'cubic-bezier(0.3, 0.28, 0.7, 0.92)';
export const DEFAULT_ROTATION_EASING =
	'linear(0, 0.0016 0.34%, 0.0084 0.79%, 0.0369 1.7%, 0.0894, 0.1594 3.73%, 0.3141 5.54%, 0.7904 10.52%, 0.9119, 1.0156, 1.0992, 1.1617 16.39%, 1.1836 17.07%, 1.2039 17.86%, 1.2168 18.54%, 1.2271 19.33%, 1.2329 20.24%, 1.2327, 1.2263, 1.2146, 1.1988 24.31%, 1.1774 25.44%, 1.0565 30.87%, 1.0055 33.58%, 0.9826 35.16%, 0.9664 36.63%, 0.9544, 0.9476 39.8%, 0.9455 41.83%, 0.9498 43.98%, 0.959 46.24%, 0.9861 51.44%, 0.9978 54.04%, 1.007, 1.0118 59.92%, 1.0118 64.56%, 1.0006 74.62%, 0.9974 80.05%, 1.0005 99.95%)';
const INTRO_READING_BASE_MS = 1400;
const INTRO_READING_MS_PER_CHARACTER = 25;
const INTRO_READING_MIN_MS = 1800;
const INTRO_READING_MAX_MS = 4000;

function clamp(
	/** @type {number} */ value,
	/** @type {number} */ min,
	/** @type {number} */ max,
) {
	return Math.min(Math.max(value, min), max);
}

export function getSeatRotationTurns(/** @type {number} */ seatPosition) {
	return ((seatPosition + 4) % 8) / 8;
}

function getQuestionReadingMs(/** @type {string} */ text) {
	return clamp(
		INTRO_READING_BASE_MS + text.length * INTRO_READING_MS_PER_CHARACTER,
		INTRO_READING_MIN_MS,
		INTRO_READING_MAX_MS,
	);
}

export function useRoundIntro() {
	let introSeatRotation = $state(/** @type {number|null} */ (null));
	let introRotationDurationMs = $state(0);
	let introRotationEasing = $state(INTRO_SLOW_EASING);
	let introResetIsInstant = $state(false);
	let playedIntroRoundKey = /** @type {string | null} */ (null);
	let introTimerIds = /** @type {ReturnType<typeof setTimeout>[]} */ ([]);
	let introResetFrameIds = /** @type {number[]} */ ([]);

	function clearIntroTimers() {
		introTimerIds.forEach(clearTimeout);
		introTimerIds = [];
	}

	function clearIntroResetFrames() {
		introResetFrameIds.forEach(cancelAnimationFrame);
		introResetFrameIds = [];
	}

	function scheduleIntroResetFrame(/** @type {() => void} */ callback) {
		const frameId = requestAnimationFrame(() => {
			introResetFrameIds = introResetFrameIds.filter(
				(id) => id !== frameId,
			);
			callback();
		});

		introResetFrameIds = [...introResetFrameIds, frameId];
	}

	function reset(/** @type {{ instant?: boolean }} */ options = {}) {
		clearIntroTimers();
		clearIntroResetFrames();
		introRotationDurationMs = 0;
		introSeatRotation = null;

		if (options.instant) {
			introResetIsInstant = true;
			scheduleIntroResetFrame(() => {
				scheduleIntroResetFrame(() => {
					introResetIsInstant = false;
				});
			});
		} else {
			introResetIsInstant = false;
		}
	}

	function scheduleIntroStep(
		/** @type {number} */ delay,
		/** @type {() => void} */ callback,
	) {
		const timerId = setTimeout(callback, delay);
		introTimerIds = [...introTimerIds, timerId];
	}

	function getIntroPlayerPath(
		/** @type {{ id: string, seatPosition: number }} */ starter,
	) {
		const sortedPlayers = [...game.players].sort(
			(a, b) => a.turnOrder - b.turnOrder,
		);
		const starterIndex = sortedPlayers.findIndex(
			(player) => player.id === starter.id,
		);

		if (starterIndex === -1 || sortedPlayers.length <= 1) {
			return [];
		}

		const rotatedPlayers = [
			...sortedPlayers.slice(starterIndex),
			...sortedPlayers.slice(0, starterIndex),
		];

		return [...rotatedPlayers, starter];
	}

	function getForwardRotationTarget(
		/** @type {number} */ fromTurns,
		/** @type {number} */ targetTurns,
	) {
		let target = targetTurns;

		while (target <= fromTurns) {
			target += 1;
		}

		return target;
	}

	function getIntroTravelMs(/** @type {number} */ distanceTurns) {
		return clamp(
			distanceTurns * INTRO_TRAVEL_MS_PER_TURN,
			INTRO_TRAVEL_MIN_MS,
			INTRO_TRAVEL_MAX_MS,
		);
	}

	function startRoundIntro(
		/** @type {{ id: string, seatPosition: number }} */ starter,
		/** @type {string} */ questionText,
	) {
		const playerPath = getIntroPlayerPath(starter);
		if (!playerPath.length) return false;

		clearIntroTimers();
		clearIntroResetFrames();

		const readingMs = getQuestionReadingMs(questionText);
		const seatStops = playerPath.map((player) =>
			getSeatRotationTurns(player.seatPosition),
		);
		let elapsedMs = INTRO_INITIAL_FRAME_MS;
		let currentRotation = seatStops[0] - INTRO_SLOW_ARC_TURNS;
		const firstSlowEnd = seatStops[0] + INTRO_SLOW_ARC_TURNS;

		introResetIsInstant = false;
		introRotationDurationMs = 0;
		introRotationEasing = INTRO_SLOW_EASING;
		introSeatRotation = currentRotation;

		scheduleIntroStep(elapsedMs, () => {
			introRotationDurationMs = readingMs;
			introRotationEasing = INTRO_SLOW_EASING;
			introSeatRotation = firstSlowEnd;
		});

		elapsedMs += readingMs;
		currentRotation = firstSlowEnd;

		seatStops.slice(1).forEach((seatRotationTurns, index, stops) => {
			const isFinalStop = index === stops.length - 1;
			const slowStart = getForwardRotationTarget(
				currentRotation,
				seatRotationTurns - INTRO_SLOW_ARC_TURNS,
			);
			const travelMs = getIntroTravelMs(slowStart - currentRotation);
			const slowEnd =
				slowStart + INTRO_SLOW_ARC_TURNS * (isFinalStop ? 1 : 2);

			scheduleIntroStep(elapsedMs, () => {
				introRotationDurationMs = travelMs;
				introRotationEasing = INTRO_TRAVEL_EASING;
				introSeatRotation = slowStart;
			});

			elapsedMs += travelMs;

			scheduleIntroStep(elapsedMs, () => {
				introRotationDurationMs = readingMs;
				introRotationEasing = INTRO_SLOW_EASING;
				introSeatRotation = slowEnd;
			});

			elapsedMs += readingMs;
			currentRotation = slowEnd;
		});

		scheduleIntroStep(elapsedMs, () => {
			reset({ instant: true });
		});

		return true;
	}

	function syncRound(
		/** @type {{
		 *   status: string,
		 *   round: import('../lib/game.svelte.js').Round|null|undefined,
		 *   starter: { id: string, seatPosition: number }|null,
		 *   playerCount: number,
		 * }} */ options,
	) {
		const roundQuestion = options.round?.question ?? null;
		const roundKey = roundQuestion
			? `${options.round?.roundNumber ?? 0}:${roundQuestion.id}`
			: null;
		const hasRoundProgress =
			(options.round?.answeredBlobs.length ?? 0) > 0 ||
			options.round?.lastPlayerId !== null;

		if (
			options.status !== 'playing' ||
			!roundKey ||
			!options.starter ||
			options.playerCount <= 1 ||
			hasRoundProgress ||
			playedIntroRoundKey === roundKey
		) {
			if (options.status !== 'playing' || hasRoundProgress) {
				reset();
			}
			return;
		}

		if (startRoundIntro(options.starter, roundQuestion.text)) {
			playedIntroRoundKey = roundKey;
		}
	}

	onMount(() => reset);

	return {
		get seatRotation() {
			return introSeatRotation;
		},
		get rotationDurationMs() {
			return introRotationDurationMs;
		},
		get rotationEasing() {
			return introRotationEasing;
		},
		get resetIsInstant() {
			return introResetIsInstant;
		},
		reset,
		syncRound,
	};
}
