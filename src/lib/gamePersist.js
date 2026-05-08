/**
 * @typedef {import('./gameEngine.js').GamePlayer} GamePlayer
 * @typedef {import('./gameEngine.js').GameQuestion} GameQuestion
 * @typedef {import('./gameEngine.js').PlayerStatus} PlayerStatus
 * @typedef {import('./gameEngine.js').Round} Round
 */

import { supabase } from './supabase.js';
import { questionsByType } from '../data/game.js';

// Used when Supabase is not configured or decks have no questions yet
export const MOCK_QUESTIONS = /** @type {GameQuestion[]} */ (
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

/** @param {object} row */
export function dbRowToQuestion(row) {
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
export async function fetchQuestionsForDecks(deckIds) {
	if (!supabase || !deckIds.length) return MOCK_QUESTIONS;
	const { data } = await supabase
		.from('questions')
		.select('*, decks(name, icon)')
		.in('deck_id', deckIds);
	const questions = (data ?? []).map(dbRowToQuestion);
	return questions.length > 0 ? questions : MOCK_QUESTIONS;
}

/** @param {string|null} questionId */
export async function fetchForcedQuestion(questionId) {
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

/**
 * @param {object} game
 * @param {string|null} game.dbGameId
 * @param {string} game.status
 * @param {{ roundNumber: number, dbId: string|null, lastPlayerId: string|null, answeredBlobs: number[] }|null} game.currentRound
 * @param {string|null} game.currentPlayerId
 * @param {string[]} game.usedQuestionIds
 * @param {GamePlayer[]} game.players
 */
export async function syncGameState(game) {
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

/**
 * @param {object} game
 * @param {string|null} game.dbGameId
 * @param {{ roundNumber: number, question: GameQuestion, dbId: string|null }|null} game.currentRound
 * @param {string|null} game.currentPlayerId
 * @param {GamePlayer[]} game.players
 */
export async function dbCreateNewRound(game) {
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

	await syncGameState(game);
}

/** @param {{ answerId: string|null }} answerId */
export async function deletePersistedAnswer(answerId) {
	if (!supabase || !answerId.answerId) return;
	await supabase.from('player_answers').delete().eq('id', answerId.answerId);
}

/**
 * Inserts a player_answers row, sets lastAnswerMove.answerId, and syncs game state.
 * Fire-and-forget — call with .catch(console.error).
 *
 * @param {object} game
 * @param {{ dbId: string|null }} round
 * @param {number} blobIndex
 * @param {boolean} isCorrect
 * @param {string|null} actingPlayerDbId
 * @param {{ answerId: string|null, deleteWhenPersisted: boolean }} lastAnswerMove
 */
export async function persistBlobReveal(game, round, blobIndex, isCorrect, actingPlayerDbId, lastAnswerMove) {
	if (!supabase || !round.dbId || !actingPlayerDbId) return;

	const { data } = await supabase
		.from('player_answers')
		.insert({
			round_id: round.dbId,
			player_id: actingPlayerDbId,
			blob_index: blobIndex,
			is_correct: isCorrect,
		})
		.select('id')
		.single();

	lastAnswerMove.answerId = data?.id ?? null;
	if (lastAnswerMove.deleteWhenPersisted && lastAnswerMove.answerId) {
		await deletePersistedAnswer(lastAnswerMove);
	}
	await syncGameState(game);
}

/**
 * Takes a fully-initialized game state object and persists it to Supabase.
 * Mutates game.dbGameId, game.players[i].dbId, and game.currentRound.dbId in place.
 *
 * @param {object} game
 * @param {string} game.code
 * @param {string[]} game.selectedDeckIds
 * @param {string[]} game.usedQuestionIds
 * @param {string|null} game.dbGameId
 * @param {{ roundNumber: number, question: GameQuestion, dbId: string|null }|null} game.currentRound
 * @param {string|null} game.currentPlayerId
 * @param {GamePlayer[]} game.players
 */
export async function persistNewGame(game) {
	if (!supabase) return;

	const firstQuestion = game.currentRound?.question ?? null;
	const code = game.code;

	try {
		// 1. Insert game row
		const { data: gameRow } = await supabase
			.from('games')
			.insert({
				code,
				status: 'playing',
				selected_decks: game.selectedDeckIds,
				used_question_ids: game.usedQuestionIds,
				current_round: 1,
				win_score: 50,
			})
			.select('id')
			.single();

		if (!gameRow) return;
		game.dbGameId = gameRow.id;

		// 2. Insert players (sorted by turn_order so we can match by it)
		const sortedPlayers = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder);
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
			game.players.find((p) => p.id === game.currentPlayerId)?.dbId ?? null;
		const questionId =
			firstQuestion && !firstQuestion.id.startsWith('mock-') ? firstQuestion.id : null;

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
 * Inserts a new game_player row for an in-progress game.
 * Sets player.dbId on success.
 *
 * @param {object} game
 * @param {string|null} game.dbGameId
 * @param {GamePlayer} player
 */
export async function persistNewPlayer(game, player) {
	if (!supabase || !game.dbGameId) return;

	supabase
		.from('game_players')
		.insert({
			game_id: game.dbGameId,
			name: player.name,
			icon: player.icon,
			color: player.color,
			seat_position: player.seatPosition,
			turn_order: player.turnOrder,
			total_score: 0,
			round_score: 0,
			status: 'active',
		})
		.select('id')
		.single()
		.then(({ data }) => {
			if (data) player.dbId = data.id;
		})
		.catch(console.error);
}

/**
 * Loads game state from Supabase by code.
 * Returns a plain state object (not a Svelte proxy).
 *
 * @param {string} code
 * @returns {Promise<{
 *   status: string,
 *   code: string,
 *   dbGameId: string,
 *   winScore: number,
 *   players: GamePlayer[],
 *   currentPlayerId: string|null,
 *   startingTurnOrderIndex: number,
 *   selectedDeckIds: string[],
 *   usedQuestionIds: string[],
 *   currentRound: Round|null,
 *   questionPool: GameQuestion[],
 * }>}
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

	const questionPool = await fetchQuestionsForDecks(gameRow.selected_decks ?? []);

	const sortedByTurnOrder = [...gamePlayers].sort((a, b) => a.turnOrder - b.turnOrder);
	const startingIdx = roundRow?.starting_player_id
		? sortedByTurnOrder.findIndex((p) => p.id === roundRow.starting_player_id)
		: 0;

	/** @type {Round|null} */
	const currentRound = question
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

	return {
		status: /** @type {string} */ (gameRow.status),
		code: /** @type {string} */ (gameRow.code),
		dbGameId: /** @type {string} */ (gameRow.id),
		winScore: /** @type {number} */ (gameRow.win_score),
		players: gamePlayers,
		currentPlayerId: /** @type {string|null} */ (gameRow.current_player_id),
		startingTurnOrderIndex: Math.max(0, startingIdx),
		selectedDeckIds: /** @type {string[]} */ (gameRow.selected_decks ?? []),
		usedQuestionIds: /** @type {string[]} */ (gameRow.used_question_ids ?? []),
		currentRound,
		questionPool,
	};
}
