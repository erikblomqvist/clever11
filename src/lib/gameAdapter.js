/**
 * @typedef {import('./game.svelte.js').GameState} GameState
 * @typedef {import('./game.svelte.js').GamePlayer} GamePlayer
 * @typedef {import('./game.svelte.js').GameQuestion} GameQuestion
 * @typedef {import('./game.svelte.js').Round} Round
 */

/**
 * @interface GamePersistenceAdapter
 */
export class GamePersistenceAdapter {
	/** @param {GameState} _state */
	async persistNewGame(_state) {
		throw new Error('Not implemented');
	}
	/**
	 * @param {GameState} _state
	 * @param {Round} _round
	 * @param {number} _blobIndex
	 * @param {boolean} _isCorrect
	 * @param {string|null} _actingPlayerDbId
	 * @param {import('./game.svelte.js').LastAnswerMove} _lastAnswerMove
	 */

	async persistBlobReveal(
		_state,
		_round,
		_blobIndex,
		_isCorrect,
		_actingPlayerDbId,
		_lastAnswerMove,
	) {
		throw new Error('Not implemented');
	}
	/** @param {GameState} _state */
	async syncGameState(_state) {
		throw new Error('Not implemented');
	}
	/** @param {GameState} _state */
	async dbCreateNewRound(_state) {
		throw new Error('Not implemented');
	}
	/** @param {{ answerId: string|null }} _lastAnswerMove */
	async deletePersistedAnswer(_lastAnswerMove) {
		throw new Error('Not implemented');
	}
	/** @param {GameState} _state @param {GamePlayer} _player */
	async persistNewPlayer(_state, _player) {
		throw new Error('Not implemented');
	}
	/** @param {GameState} _state */
	async persistQuestionVote(_state) {
		throw new Error('Not implemented');
	}
	/** @param {string} _code */
	async loadGame(_code) {
		throw new Error('Not implemented');
	}
	/** @param {string[]} _deckIds */
	async fetchQuestionsForDecks(_deckIds) {
		throw new Error('Not implemented');
	}
	/** @param {string|null} _questionId */
	async fetchForcedQuestion(_questionId) {
		throw new Error('Not implemented');
	}
}

import * as gamePersist from './gamePersist.js';

/**
 * @implements {GamePersistenceAdapter}
 */
export class SupabaseGameAdapter {
	async persistNewGame(state) {
		return gamePersist.persistNewGame(state);
	}
	async persistBlobReveal(
		state,
		round,
		blobIndex,
		isCorrect,
		actingPlayerDbId,
		lastAnswerMove,
	) {
		return gamePersist.persistBlobReveal(
			state,
			round,
			blobIndex,
			isCorrect,
			actingPlayerDbId,
			lastAnswerMove,
		);
	}
	async syncGameState(state) {
		return gamePersist.syncGameState(state);
	}
	async dbCreateNewRound(state) {
		return gamePersist.dbCreateNewRound(state);
	}
	async deletePersistedAnswer(lastAnswerMove) {
		return gamePersist.deletePersistedAnswer(lastAnswerMove);
	}
	async persistNewPlayer(state, player) {
		return gamePersist.persistNewPlayer(state, player);
	}
	async persistQuestionVote(state) {
		return gamePersist.persistQuestionVote(state);
	}
	async loadGame(code) {
		return gamePersist.loadGame(code);
	}
	async fetchQuestionsForDecks(deckIds) {
		return gamePersist.fetchQuestionsForDecks(deckIds);
	}
	async fetchForcedQuestion(questionId) {
		return gamePersist.fetchForcedQuestion(questionId);
	}
}
