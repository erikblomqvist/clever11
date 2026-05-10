/**
 * @typedef {'active'|'passed'|'out'|'removed'} PlayerStatus
 *
 * @typedef {{
 *   id: string,
 *   dbId: string|null,
 *   name: string,
 *   icon: string,
 *   color: string,
 *   seatPosition: number,
 *   turnOrder: number,
 *   totalScore: number,
 *   roundScore: number,
 *   status: PlayerStatus,
 * }} GamePlayer
 *
 * @typedef {{
 *   id: string,
 *   type: import('$lib/data/questionTypes.js').QuestionType,
 *   text: string,
 *   deck: string,
 *   deckIcon: string|null,
 *   options: string[],
 *   correctAnswers: import('$lib/data/game.js').CorrectAnswer[],
 *   answerMedia: object[],
 * }} GameQuestion
 *
 * @typedef {{
 *   blobIndex: number,
 *   playerId: string,
 *   previousRoundScore: number,
 *   previousStatus: PlayerStatus,
 *   previousCurrentPlayerId: string|null,
 *   previousLastPlayerId: string|null,
 *   [key: string]: any,
 * }} LastAnswerMove
 *
 * @typedef {{
 *   roundNumber: number,
 *   question: GameQuestion,
 *   answeredBlobs: number[],
 *   blobResults: Record<number, boolean>,
 *   lastPlayerId: string|null,
 *   dbId: string|null,
 *   lastAnswerMove: LastAnswerMove|null,
 * }} Round
 *
 * @typedef {{
 *   status: 'idle'|'playing'|'round_review'|'finished',
 *   code: string|null,
 *   winScore: number,
 *   players: GamePlayer[],
 *   currentPlayerId: string|null,
 *   startingTurnOrderIndex: number,
 *   selectedDeckIds: string[],
 *   usedQuestionIds: string[],
 *   currentRound: Round|null,
 *   turnTimerSeconds: number|null,
 * }} GameState
 *
 * @typedef {{
 *   playerId: string|null,
 *   roundScore: number,
 *   isCorrect: boolean,
 *   nextPlayerId: string|null,
 *   roundIsOver: boolean,
 * }} RevealBlobResult
 */

// --- Queries ---

/** @param {GameState} state */
export function checkRoundOver(state) {
	if (!state.currentRound) return false;
	const allAnswered =
		state.currentRound.answeredBlobs.length >= state.currentRound.question.options.length;
	const allInactive = state.players.every(
		(p) => p.status === 'passed' || p.status === 'out' || p.status === 'removed',
	);
	return allAnswered || allInactive;
}

/** @param {GameState} state */
export function canUndoLastMove(state) {
	const round = state.currentRound;
	if (!round?.lastAnswerMove) return false;
	const lastAnsweredBlob = round.answeredBlobs.at(-1);
	return lastAnsweredBlob === round.lastAnswerMove.blobIndex;
}

/**
 * @param {GameState} state
 * @param {string|null} currentPlayerId
 * @returns {string|null}
 */
export function getNextActivePlayerId(state, currentPlayerId) {
	const sorted = [...state.players].filter((p) => p.status !== 'removed').sort((a, b) => a.turnOrder - b.turnOrder);
	const currentIdx = sorted.findIndex((p) => p.id === currentPlayerId);
	for (let i = 1; i <= sorted.length; i++) {
		const idx = (currentIdx + i) % sorted.length;
		if (sorted[idx].status === 'active') return sorted[idx].id;
	}
	return null;
}

// --- State construction ---

/** @param {Partial<GameState>} [config] */
export function createGameState(config = {}) {
	return /** @type {GameState} */ ({
		status: 'idle',
		code: null,
		winScore: 50,
		players: [],
		currentPlayerId: null,
		startingTurnOrderIndex: 0,
		selectedDeckIds: [],
		usedQuestionIds: [],
		currentRound: null,
		turnTimerSeconds: null,
		...config,
	});
}

// --- Mutations ---

/**
 * @param {GameState} state
 * @param {number} blobIndex
 * @param {boolean} isCorrect
 * @returns {RevealBlobResult|null}
 */
export function revealBlob(state, blobIndex, isCorrect) {
	if (!state.currentRound) return null;

	const playerIdx = state.players.findIndex((p) => p.id === state.currentPlayerId);
	if (playerIdx === -1) return null;

	const round = state.currentRound;
	const actingPlayerId = state.currentPlayerId;
	const previousRoundScore = state.players[playerIdx].roundScore;

	round.lastAnswerMove = {
		blobIndex,
		playerId: actingPlayerId,
		previousRoundScore,
		previousStatus: state.players[playerIdx].status,
		previousCurrentPlayerId: actingPlayerId,
		previousLastPlayerId: round.lastPlayerId,
	};
	round.answeredBlobs.push(blobIndex);
	round.blobResults[blobIndex] = isCorrect;
	round.lastPlayerId = actingPlayerId;

	if (isCorrect) {
		state.players[playerIdx].roundScore += 1;
	} else {
		state.players[playerIdx].roundScore = 0;
		state.players[playerIdx].status = 'out';
	}

	const roundIsOver = checkRoundOver(state);
	const nextPlayerId = roundIsOver
		? null
		: getNextActivePlayerId(state, actingPlayerId);

	return {
		playerId: actingPlayerId,
		roundScore: state.players[playerIdx].roundScore,
		isCorrect,
		nextPlayerId,
		roundIsOver,
	};
}

/**
 * @param {GameState} state
 * @param {string} playerId
 */
export function advanceToPlayer(state, playerId) {
	state.currentPlayerId = playerId;
}

/** @param {GameState} state */
export function canSkipRound(state) {
	if (!state.currentRound) return false;
	if (state.currentRound.answeredBlobs.length !== 0) return false;
	return state.players
		.filter((p) => p.status !== 'removed')
		.every((p) => p.status === 'active');
}

/** @param {GameState} state */
export function skipRound(state) {
	state.players.forEach((_, idx) => {
		if (state.players[idx].status === 'active') {
			state.players[idx].status = /** @type {PlayerStatus} */ ('passed');
		}
	});
	if (state.currentRound) {
		state.currentRound.lastAnswerMove = null;
	}
}

/** @param {GameState} state */
export function passCurrentPlayer(state) {
	const playerIdx = state.players.findIndex((p) => p.id === state.currentPlayerId);
	if (playerIdx === -1) return;

	state.players[playerIdx].status = 'passed';
	if (state.currentRound) state.currentRound.lastPlayerId = state.currentPlayerId;
	if (state.currentRound) state.currentRound.lastAnswerMove = null;

	if (!checkRoundOver(state)) {
		const nextId = getNextActivePlayerId(state, state.currentPlayerId);
		if (nextId) state.currentPlayerId = nextId;
	}
}

/** @param {GameState} state */
export function endRound(state) {
	if (state.currentRound) state.currentRound.lastAnswerMove = null;

	state.players.forEach((_, idx) => {
		if (state.players[idx].status !== 'removed') {
			state.players[idx].totalScore += state.players[idx].roundScore;
		}
	});

	const winner = state.players.find((p) => p.status !== 'removed' && p.totalScore >= state.winScore);
	state.status = winner ? 'finished' : 'round_review';
}

/**
 * @param {GameState} state
 * @param {GameQuestion} question
 */
export function startNextRound(state, question) {
	const activePlayers = state.players.filter((p) => p.status !== 'removed');
	const allPassed = activePlayers.every((p) => p.status === 'passed');

	state.players.forEach((_, idx) => {
		if (state.players[idx].status !== 'removed') {
			state.players[idx].status = /** @type {PlayerStatus} */ ('active');
			state.players[idx].roundScore = 0;
		}
	});

	const sorted = [...activePlayers].sort((a, b) => a.turnOrder - b.turnOrder);
	if (!allPassed) {
		state.startingTurnOrderIndex = (state.startingTurnOrderIndex + 1) % sorted.length;
	}
	const nextStarter = sorted[state.startingTurnOrderIndex % sorted.length];
	state.currentPlayerId = nextStarter.id;

	state.currentRound = {
		roundNumber: (state.currentRound?.roundNumber ?? 0) + 1,
		question,
		answeredBlobs: [],
		blobResults: {},
		lastPlayerId: null,
		dbId: null,
		lastAnswerMove: null,
	};

	state.status = 'playing';
}

/** @param {GameState} state */
export function undoLastMove(state) {
	const round = state.currentRound;
	const move = round?.lastAnswerMove;
	if (!round || !move || !canUndoLastMove(state)) return;

	const playerIdx = state.players.findIndex((p) => p.id === move.playerId);
	if (playerIdx === -1) return;

	round.answeredBlobs.pop();
	delete round.blobResults[move.blobIndex];
	round.lastPlayerId = move.previousLastPlayerId;
	round.lastAnswerMove = null;

	state.players[playerIdx].roundScore = move.previousRoundScore;
	state.players[playerIdx].status = move.previousStatus;
	state.currentPlayerId = move.previousCurrentPlayerId;
}

/**
 * @param {GameState} state
 * @param {{ name: string, icon: string, color: string, seatPosition: number }} params
 * @returns {string|false}
 */
export function addPlayer(state, { name, icon, color, seatPosition }) {
	const activeCount = state.players.filter((p) => p.status !== 'removed').length;
	if (activeCount >= 8) return false;

	const maxIdNum = state.players.reduce((max, p) => {
		const num = parseInt(p.id.replace('player-', ''), 10);
		return num > max ? num : max;
	}, -1);
	const newId = `player-${maxIdNum + 1}`;

	const maxTurnOrder = state.players.reduce((max, p) => (p.turnOrder > max ? p.turnOrder : max), -1);

	/** @type {GamePlayer} */
	const newPlayer = {
		id: newId,
		dbId: null,
		name,
		icon,
		color,
		seatPosition,
		turnOrder: maxTurnOrder + 1,
		totalScore: 0,
		roundScore: 0,
		status: /** @type {PlayerStatus} */ ('active'),
	};

	state.players.push(newPlayer);
	return newId;
}

/**
 * @param {GameState} state
 * @param {string} playerId
 * @returns {boolean}
 */
export function removePlayer(state, playerId) {
	const playerIdx = state.players.findIndex((p) => p.id === playerId);
	if (playerIdx === -1) return false;

	const player = state.players[playerIdx];
	if (player.status === 'removed') return false;

	const activeCount = state.players.filter((p) => p.status !== 'removed').length;
	if (activeCount <= 2) return false;

	let nextId = null;
	if (state.currentPlayerId === playerId) {
		nextId = getNextActivePlayerId(state, playerId);
	}

	state.players[playerIdx].status = 'removed';
	state.players[playerIdx].seatPosition = -1;
	state.players[playerIdx].roundScore = 0;

	if (nextId) state.currentPlayerId = nextId;
	return true;
}

/**
 * @param {GameState} state
 * @param {string} playerId
 * @param {{ name: string, icon: string, color: string }} replacement
 * @returns {boolean}
 */
export function replacePlayer(state, playerId, { name, icon, color }) {
	const player = state.players.find((p) => p.id === playerId);
	if (!player || player.status === 'removed') return false;

	player.name = name;
	player.icon = icon;
	player.color = color;
	return true;
}
