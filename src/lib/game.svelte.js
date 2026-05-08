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

import { supabase } from './supabase.js';
import { getForcedFirstQuestionId } from './testingOptions.js';
import { questionsByType } from '../data/game.js';
import * as engine from './gameEngine.js';

// Used when Supabase is not configured or decks have no questions yet
const MOCK_QUESTIONS = /** @type {GameQuestion[]} */ (
	Object.values(questionsByType).map((q, i) => ({
		id: `mock-${i}`,
		type: q.type,
		text: q.text,
		deck: q.deck,
		deckIcon: null,
		options: q.answers,
		correctAnswers: q.correctAnswers,
		answerMedia: q.answers.map(() => ({})),
	}))
);

/** @type {GameQuestion[]} */
let questionPool = MOCK_QUESTIONS;

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

// --- DB helpers ---

/** @param {object} row */
function dbRowToQuestion(row) {
	return /** @type {GameQuestion} */ ({
		id: row.id,
		type: row.type,
		text: row.question_text,
		deck: row.decks?.name ?? '',
		deckIcon: row.decks?.icon ?? null,
		options: row.options_json ?? [],
		correctAnswers: row.correct_answers_json ?? [],
		answerMedia: row.answer_media_json ?? [],
	});
}

/** @param {string[]} deckIds */
async function fetchQuestionsForDecks(deckIds) {
	if (!supabase || !deckIds.length) return MOCK_QUESTIONS;
	const { data } = await supabase
		.from('questions')
		.select('*, decks(name, icon)')
		.in('deck_id', deckIds);
	const questions = (data ?? []).map(dbRowToQuestion);
	return questions.length > 0 ? questions : MOCK_QUESTIONS;
}

/** @param {string|null} questionId */
async function fetchForcedQuestion(questionId) {
	if (!supabase || !questionId) return null;
	const { data, error } = await supabase
		.from('questions')
		.select('*, decks(name, icon)')
		.eq('id', questionId)
		.maybeSingle();
	if (error) {
		console.warn('Failed to load forced first question:', error.message);
		return null;
	}
	return data ? dbRowToQuestion(data) : null;
}

async function syncGameState() {
	if (!supabase || !game.dbGameId) return;

	const currentPlayerDbId =
		game.players.find((p) => p.id === game.currentPlayerId)?.dbId ?? null;
	const roundDbId = game.currentRound?.dbId ?? null;
	const lastPlayerDbId =
		game.players.find((p) => p.id === game.currentRound?.lastPlayerId)?.dbId ?? null;
	const isRoundEnded =
		game.status === 'round_review' || game.status === 'finished';

	await Promise.all([
		supabase
			.from('games')
			.update({
				status: game.status,
				current_round: game.currentRound?.roundNumber ?? 0,
				used_question_ids: game.usedQuestionIds,
				current_player_id: currentPlayerDbId,
				current_round_id: roundDbId,
			})
			.eq('id', game.dbGameId),

		...game.players
			.filter((p) => p.dbId)
			.map((p) =>
				supabase
					.from('game_players')
					.update({
						name: p.name,
						icon: p.icon,
						color: p.color,
						seat_position: p.seatPosition,
						total_score: p.totalScore,
						round_score: p.roundScore,
						status: p.status,
					})
					.eq('id', p.dbId),
			),

		roundDbId
			? supabase
					.from('game_rounds')
					.update({
						answered_blobs: game.currentRound?.answeredBlobs ?? [],
						last_player_id: lastPlayerDbId,
						...(isRoundEnded ? { ended_at: new Date().toISOString() } : {}),
					})
					.eq('id', roundDbId)
			: Promise.resolve(),
	]);
}

// --- Exported queries ---

export function checkRoundOver() {
	return engine.checkRoundOver(game);
}

export function canUndoLastMove() {
	return engine.canUndoLastMove(game);
}

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
				...MOCK_QUESTIONS.filter((question) => question.id !== demoQuestion.id),
			]
		: MOCK_QUESTIONS;

	lockPortraitOnPhone();
}

/**
 * @param {{ players: import('../views/SetupView.svelte').SetupPlayer[], selectedDeckIds: string[], startingPlayerIndex: number }} setup
 */
export async function initGame(setup) {
	questionPool = await fetchQuestionsForDecks(setup.selectedDeckIds);

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
		(await fetchForcedQuestion(getForcedFirstQuestionId())) ??
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

	if (!supabase) return;

	try {
		// 1. Insert game row
		const { data: gameRow } = await supabase
			.from('games')
			.insert({
				code,
				status: 'playing',
				selected_decks: setup.selectedDeckIds,
				used_question_ids: [firstQuestion.id],
				current_round: 1,
				win_score: 50,
			})
			.select('id')
			.single();

		if (!gameRow) return;
		game.dbGameId = gameRow.id;

		// 2. Insert players (sorted by turn_order so we can match by it)
		const sortedPlayers = [...gamePlayers].sort((a, b) => a.turnOrder - b.turnOrder);
		const { data: playerRows } = await supabase
			.from('game_players')
			.insert(
				sortedPlayers.map((p) => ({
					game_id: gameRow.id,
					name: p.name,
					icon: p.icon,
					color: p.color,
					seat_position: p.seatPosition,
					turn_order: p.turnOrder,
					total_score: 0,
					round_score: 0,
					status: 'active',
				})),
			)
			.select('id, turn_order');

		if (playerRows) {
			for (const row of playerRows) {
				const idx = game.players.findIndex((p) => p.turnOrder === row.turn_order);
				if (idx !== -1) game.players[idx].dbId = row.id;
			}
		}

		const startingDbId =
			game.players.find((p) => p.id === startingPlayer.id)?.dbId ?? null;
		const questionId = firstQuestion.id.startsWith('mock-') ? null : firstQuestion.id;

		// 3. Insert first round
		const { data: roundRow } = await supabase
			.from('game_rounds')
			.insert({
				game_id: gameRow.id,
				question_id: questionId,
				round_number: 1,
				starting_player_id: startingDbId,
				answered_blobs: [],
			})
			.select('id')
			.single();

		if (roundRow && game.currentRound) {
			game.currentRound.dbId = roundRow.id;
		}

		// 4. Update game with player + round FKs
		await supabase
			.from('games')
			.update({
				current_player_id: startingDbId,
				current_round_id: roundRow?.id ?? null,
			})
			.eq('id', gameRow.id);
	} catch (e) {
		console.error('Failed to persist new game:', e);
	}
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

	if (supabase && round.dbId && actingPlayerDbId) {
		supabase
			.from('player_answers')
			.insert({
				round_id: round.dbId,
				player_id: actingPlayerDbId,
				blob_index: blobIndex,
				is_correct: isCorrect,
			})
			.select('id')
			.single()
			.then(async ({ data }) => {
				lastAnswerMove.answerId = data?.id ?? null;
				if (lastAnswerMove.deleteWhenPersisted && lastAnswerMove.answerId) {
					await deletePersistedAnswer(lastAnswerMove);
				}
				await syncGameState();
			})
			.catch(console.error);
	}

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
	if (game.status !== 'playing' || checkRoundOver()) return false;
	if (game.currentPlayerId !== expectedCurrentPlayerId) return false;

	const nextId = engine.getNextActivePlayerId(game, expectedCurrentPlayerId);
	if (!nextId) return false;

	engine.advanceToPlayer(game, nextId);
	syncGameState().catch(console.error);
	return true;
}

export function undoLastMove() {
	const move = game.currentRound?.lastAnswerMove;
	if (!move) return;

	const answerId = move.answerId;
	const deleteWhenPersisted = move.deleteWhenPersisted;

	engine.undoLastMove(game);

	if (answerId) {
		deletePersistedAnswer({ answerId }).catch(console.error);
	} else if (!deleteWhenPersisted) {
		move.deleteWhenPersisted = true;
	}
	syncGameState().catch(console.error);
}

export function passCurrentPlayer() {
	engine.passCurrentPlayer(game);
	syncGameState().catch(console.error);
}

export function endRound() {
	engine.endRound(game);
	syncGameState().catch(console.error);
}

/**
 * @param {{ name: string, icon: string, color: string, seatPosition: number }} params
 * @returns {string|false}
 */
export function addPlayer(params) {
	const newId = engine.addPlayer(game, params);
	if (newId === false) return false;

	if (supabase && game.dbGameId) {
		const newPlayer = game.players.find((p) => p.id === newId);
		supabase
			.from('game_players')
			.insert({
				game_id: game.dbGameId,
				name: params.name,
				icon: params.icon,
				color: params.color,
				seat_position: params.seatPosition,
				turn_order: newPlayer.turnOrder,
				total_score: 0,
				round_score: 0,
				status: 'active',
			})
			.select('id')
			.single()
			.then(({ data }) => {
				if (data) newPlayer.dbId = data.id;
			})
			.catch(console.error);
	}

	return newId;
}

/**
 * @param {string} playerId
 * @returns {boolean}
 */
export function removePlayer(playerId) {
	const result = engine.removePlayer(game, playerId);
	if (result) syncGameState().catch(console.error);
	return result;
}

/**
 * @param {string} playerId
 * @param {{ name: string, icon: string, color: string }} replacement
 * @returns {boolean}
 */
export function replacePlayer(playerId, replacement) {
	const result = engine.replacePlayer(game, playerId, replacement);
	if (result) syncGameState().catch(console.error);
	return result;
}

export function startNextRound() {
	const question = pickNextQuestion();
	engine.startNextRound(game, question);

	if (supabase && game.dbGameId) {
		dbCreateNewRound().catch(console.error);
	}
}

async function dbCreateNewRound() {
	if (!game.currentRound || !game.dbGameId) return;

	const questionId = game.currentRound.question.id.startsWith('mock-')
		? null
		: game.currentRound.question.id;
	const startingPlayerDbId =
		game.players.find((p) => p.id === game.currentPlayerId)?.dbId ?? null;

	const { data: roundRow } = await supabase
		.from('game_rounds')
		.insert({
			game_id: game.dbGameId,
			question_id: questionId,
			round_number: game.currentRound.roundNumber,
			starting_player_id: startingPlayerDbId,
			answered_blobs: [],
		})
		.select('id')
		.single();

	if (roundRow) {
		game.currentRound.dbId = roundRow.id;
	}

	await syncGameState();
}

/** @param {{ answerId: string|null }} move */
async function deletePersistedAnswer(move) {
	if (!supabase || !move.answerId) return;
	await supabase.from('player_answers').delete().eq('id', move.answerId);
}

/**
 * @param {string} code
 */
export async function loadGame(code) {
	if (!supabase) {
		throw new Error('Supabase is not configured. Check your .env file.');
	}

	const { data: gameRow, error: gameError } = await supabase
		.from('games')
		.select('*')
		.eq('code', code.toUpperCase().trim())
		.single();

	if (gameError || !gameRow) throw new Error('Game not found. Check the code and try again.');
	if (gameRow.status === 'finished') throw new Error('That game has already ended.');

	const [
		{ data: playerRows },
		{ data: roundRow },
		{ data: answerRows },
	] = await Promise.all([
		supabase
			.from('game_players')
			.select('*')
			.eq('game_id', gameRow.id)
			.order('turn_order'),
		supabase
			.from('game_rounds')
			.select('*, questions(*, decks(name, icon))')
			.eq('id', gameRow.current_round_id)
			.single(),
		supabase
			.from('player_answers')
			.select('*')
			.eq('round_id', gameRow.current_round_id),
	]);

	if (!playerRows?.length) throw new Error('No players found for that game.');

	const gamePlayers = (playerRows ?? []).map((row) => ({
		id: /** @type {string} */ (row.id),
		dbId: /** @type {string} */ (row.id),
		name: /** @type {string} */ (row.name),
		icon: /** @type {string} */ (row.icon),
		color: /** @type {string} */ (row.color ?? 'player-color-1'),
		seatPosition: /** @type {number} */ (row.seat_position),
		turnOrder: /** @type {number} */ (row.turn_order),
		totalScore: /** @type {number} */ (row.total_score),
		roundScore: /** @type {number} */ (row.round_score),
		status: /** @type {PlayerStatus} */ (row.status),
	}));

	/** @type {Record<number, boolean>} */
	const blobResults = {};
	const answeredBlobs = /** @type {number[]} */ ([]);
	for (const a of answerRows ?? []) {
		blobResults[a.blob_index] = a.is_correct;
		if (!answeredBlobs.includes(a.blob_index)) answeredBlobs.push(a.blob_index);
	}

	const questionRow = /** @type {any} */ (roundRow)?.questions;
	const question = questionRow ? dbRowToQuestion(questionRow) : null;

	questionPool = await fetchQuestionsForDecks(gameRow.selected_decks ?? []);

	const sortedByTurnOrder = [...gamePlayers].sort((a, b) => a.turnOrder - b.turnOrder);
	const startingIdx = roundRow?.starting_player_id
		? sortedByTurnOrder.findIndex((p) => p.id === roundRow.starting_player_id)
		: 0;

	game.status = /** @type {any} */ (gameRow.status);
	game.code = gameRow.code;
	game.dbGameId = gameRow.id;
	game.winScore = gameRow.win_score;
	game.players = gamePlayers;
	game.currentPlayerId = gameRow.current_player_id;
	game.startingTurnOrderIndex = Math.max(0, startingIdx);
	game.selectedDeckIds = gameRow.selected_decks ?? [];
	game.usedQuestionIds = gameRow.used_question_ids ?? [];
	game.currentRound = question
		? {
				roundNumber: roundRow.round_number,
				question,
				answeredBlobs,
				blobResults,
				lastPlayerId: roundRow.last_player_id,
				dbId: roundRow.id,
				lastAnswerMove: null,
			}
		: null;

	lockPortraitOnPhone();
}

function lockPortraitOnPhone() {
	if (typeof screen === 'undefined' || !('orientation' in screen)) return;
	const isPhone = window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches;
	if (isPhone) {
		screen.orientation.lock('portrait').catch(() => {});
	}
}
