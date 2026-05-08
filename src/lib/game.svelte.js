/**
 * @typedef {import('./gameEngine.js').PlayerStatus} PlayerStatus
 * @typedef {import('./gameEngine.js').GamePlayer} GamePlayer
 * @typedef {import('./gameEngine.js').GameQuestion} GameQuestion
 * @typedef {import('./gameEngine.js').LastAnswerMove} LastAnswerMove
 * @typedef {import('./gameEngine.js').Round} Round
 *
 * @typedef {{
 *   playerId: string,
 *   previousRoundScore: number,
 *   newRoundScore: number,
 *   isCorrect: boolean,
 *   nextPlayerId: string|null,
 *   roundIsOver: boolean,
 * }} RevealBlobResult
 */

import { getForcedFirstQuestionId } from './testingOptions.js';
import * as engine from './gameEngine.js';
import * as gamePersist from './gamePersist.js';

/** @type {GameQuestion[]} */
let questionPool = gamePersist.MOCK_QUESTIONS;

export const game = $state({
	/** @type {'idle'|'playing'|'round_review'|'finished'} */
	status: 'idle',
	/** @type {string|null} */
	code: null,
	/** @type {string|null} */
	dbGameId: null,
	winScore: 50,
	/** @type {GamePlayer[]} */
	players: [],
	/** @type {string|null} */
	currentPlayerId: null,
	startingTurnOrderIndex: 0,
	/** @type {string[]} */
	selectedDeckIds: [],
	/** @type {string[]} */
	usedQuestionIds: [],
	/** @type {Round|null} */
	currentRound: null,
});

// --- Pure helpers ---

function generateCode() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** @returns {GameQuestion} */
function pickNextQuestion() {
	const available = questionPool.filter((q) => !game.usedQuestionIds.includes(q.id));
	const pool = available.length > 0 ? available : questionPool;
	if (available.length === 0) game.usedQuestionIds = [];
	const q = pool[Math.floor(Math.random() * pool.length)];
	game.usedQuestionIds.push(q.id);
	return q;
}

// --- Exported queries ---

class GameQueries {
	currentPlayer = $derived(
		game.players.find((p) => p.id === game.currentPlayerId) ?? null,
	);

	blobStates = $derived(
		game.currentRound?.question
			? game.currentRound.question.options.map((_, i) => {
					const results = game.currentRound?.blobResults ?? {};
					return i in results ? results[i] : null;
				})
			: [],
	);

	roundIsOver = $derived(engine.checkRoundOver(game));
	undoIsAvailable = $derived(engine.canUndoLastMove(game));
	undoableBlobIndex = $derived(
		this.undoIsAvailable ? (game.currentRound?.lastAnswerMove?.blobIndex ?? null) : null,
	);
}

export const gameQueries = new GameQueries();

// --- Exported mutations ---

/**
 * @typedef {{
 *   status: 'playing'|'round_review'|'finished',
 *   code?: string|null,
 *   winScore?: number,
 *   players: GamePlayer[],
 *   currentPlayerId: string|null,
 *   startingTurnOrderIndex?: number,
 *   selectedDeckIds?: string[],
 *   usedQuestionIds?: string[],
 *   currentRound: Round|null,
 * }} DemoGameSnapshot
 */

/** @template T @param {T} value @returns {T} */
function cloneJson(value) {
	return JSON.parse(JSON.stringify(value));
}

/** @param {DemoGameSnapshot} snapshot */
export function loadDemoGame(snapshot) {
	const demoGame = cloneJson(snapshot);
	const demoQuestion = demoGame.currentRound?.question ?? null;

	game.status = demoGame.status;
	game.code = demoGame.code ?? 'DEMO';
	game.dbGameId = null;
	game.winScore = demoGame.winScore ?? 50;
	game.players = demoGame.players.map((player) => ({
		...player,
		dbId: null,
	}));
	game.currentPlayerId = demoGame.currentPlayerId;
	game.startingTurnOrderIndex = demoGame.startingTurnOrderIndex ?? 0;
	game.selectedDeckIds = demoGame.selectedDeckIds ?? [];
	game.usedQuestionIds =
		demoGame.usedQuestionIds ?? (demoQuestion ? [demoQuestion.id] : []);
	game.currentRound = demoGame.currentRound
		? {
				...demoGame.currentRound,
				answeredBlobs: [...demoGame.currentRound.answeredBlobs],
				blobResults: { ...demoGame.currentRound.blobResults },
				dbId: null,
				lastAnswerMove: demoGame.currentRound.lastAnswerMove
					? { ...demoGame.currentRound.lastAnswerMove, answerId: null }
					: null,
			}
		: null;

	questionPool = demoQuestion
		? [
				demoQuestion,
				...gamePersist.MOCK_QUESTIONS.filter((question) => question.id !== demoQuestion.id),
			]
		: gamePersist.MOCK_QUESTIONS;

	lockPortraitOnPhone();
}

/**
 * @param {{ players: import('../views/SetupView.svelte').SetupPlayer[], selectedDeckIds: string[], startingPlayerIndex: number }} setup
 */
export async function initGame(setup) {
	questionPool = await gamePersist.fetchQuestionsForDecks(setup.selectedDeckIds);

	const gamePlayers = setup.players.map((p, i) => ({
		id: `player-${i}`,
		dbId: /** @type {string|null} */ (null),
		name: p.name,
		icon: p.icon,
		color: p.color,
		seatPosition: p.seatPosition ?? 0,
		turnOrder: p.turnOrder ?? i,
		totalScore: 0,
		roundScore: 0,
		status: /** @type {PlayerStatus} */ ('active'),
	}));

	const startingPlayer = gamePlayers[setup.startingPlayerIndex] ?? gamePlayers[0];
	const code = generateCode();
	const firstQuestion =
		(await gamePersist.fetchForcedQuestion(getForcedFirstQuestionId())) ??
		pickNextQuestion();

	game.status = 'playing';
	game.code = code;
	game.dbGameId = null;
	game.winScore = 50;
	game.players = gamePlayers;
	game.currentPlayerId = startingPlayer.id;
	game.startingTurnOrderIndex = startingPlayer.turnOrder;
	game.selectedDeckIds = setup.selectedDeckIds;
	game.usedQuestionIds = [firstQuestion.id];
	game.currentRound = {
		roundNumber: 1,
		question: firstQuestion,
		answeredBlobs: [],
		blobResults: {},
		lastPlayerId: null,
		dbId: null,
		lastAnswerMove: null,
	};

	lockPortraitOnPhone();

	await gamePersist.persistNewGame(game);
}

/**
 * @param {number} blobIndex
 * @param {boolean} isCorrect
 * @param {{ deferAdvance?: boolean }} [options]
 * @returns {RevealBlobResult|null}
 */
export function revealBlob(blobIndex, isCorrect, options = {}) {
	if (!game.currentRound) return null;

	const playerIdx = game.players.findIndex((p) => p.id === game.currentPlayerId);
	if (playerIdx === -1) return null;

	const actingPlayerDbId = game.players[playerIdx].dbId;
	const previousRoundScore = game.players[playerIdx].roundScore;

	const result = engine.revealBlob(game, blobIndex, isCorrect);
	if (!result) return null;

	const round = game.currentRound;
	const lastAnswerMove = round.lastAnswerMove;
	lastAnswerMove.answerId = /** @type {string|null} */ (null);
	lastAnswerMove.deleteWhenPersisted = false;

	if (result.nextPlayerId && !options.deferAdvance) {
		engine.advanceToPlayer(game, result.nextPlayerId);
	}

	gamePersist.persistBlobReveal(game, round, blobIndex, isCorrect, actingPlayerDbId, lastAnswerMove).catch(console.error);

	return {
		playerId: result.playerId,
		previousRoundScore,
		newRoundScore: result.roundScore,
		isCorrect,
		nextPlayerId: result.nextPlayerId,
		roundIsOver: result.roundIsOver,
	};
}

/**
 * @param {string|null} expectedCurrentPlayerId
 * @returns {boolean}
 */
export function advanceCurrentPlayer(expectedCurrentPlayerId = game.currentPlayerId) {
	if (game.status !== 'playing' || engine.checkRoundOver(game)) return false;
	if (game.currentPlayerId !== expectedCurrentPlayerId) return false;

	const nextId = engine.getNextActivePlayerId(game, expectedCurrentPlayerId);
	if (!nextId) return false;

	engine.advanceToPlayer(game, nextId);
	gamePersist.syncGameState(game).catch(console.error);
	return true;
}

export function undoLastMove() {
	const move = game.currentRound?.lastAnswerMove;
	if (!move) return;

	const answerId = move.answerId;
	const deleteWhenPersisted = move.deleteWhenPersisted;

	engine.undoLastMove(game);

	if (answerId) {
		gamePersist.deletePersistedAnswer({ answerId }).catch(console.error);
	} else if (!deleteWhenPersisted) {
		move.deleteWhenPersisted = true;
	}
	gamePersist.syncGameState(game).catch(console.error);
}

export function passCurrentPlayer() {
	engine.passCurrentPlayer(game);
	gamePersist.syncGameState(game).catch(console.error);
}

export function endRound() {
	engine.endRound(game);
	gamePersist.syncGameState(game).catch(console.error);
}

/**
 * @param {{ name: string, icon: string, color: string, seatPosition: number }} params
 * @returns {string|false}
 */
export function addPlayer(params) {
	const newId = engine.addPlayer(game, params);
	if (newId === false) return false;

	const newPlayer = game.players.find((p) => p.id === newId);
	gamePersist.persistNewPlayer(game, newPlayer).catch(console.error);

	return newId;
}

/**
 * @param {string} playerId
 * @returns {boolean}
 */
export function removePlayer(playerId) {
	const result = engine.removePlayer(game, playerId);
	if (result) gamePersist.syncGameState(game).catch(console.error);
	return result;
}

/**
 * @param {string} playerId
 * @param {{ name: string, icon: string, color: string }} replacement
 * @returns {boolean}
 */
export function replacePlayer(playerId, replacement) {
	const result = engine.replacePlayer(game, playerId, replacement);
	if (result) gamePersist.syncGameState(game).catch(console.error);
	return result;
}

export function startNextRound() {
	const question = pickNextQuestion();
	engine.startNextRound(game, question);

	gamePersist.dbCreateNewRound(game).catch(console.error);
}

/**
 * @param {string} code
 */
export async function loadGame(code) {
	const state = await gamePersist.loadGame(code);

	game.status = /** @type {any} */ (state.status);
	game.code = state.code;
	game.dbGameId = state.dbGameId;
	game.winScore = state.winScore;
	game.players = state.players;
	game.currentPlayerId = state.currentPlayerId;
	game.startingTurnOrderIndex = state.startingTurnOrderIndex;
	game.selectedDeckIds = state.selectedDeckIds;
	game.usedQuestionIds = state.usedQuestionIds;
	game.currentRound = state.currentRound;

	questionPool = state.questionPool;

	lockPortraitOnPhone();
}

function lockPortraitOnPhone() {
	if (typeof screen === 'undefined' || !('orientation' in screen)) return;
	const isPhone = window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches;
	if (isPhone) {
		screen.orientation.lock('portrait').catch(() => {});
	}
}
