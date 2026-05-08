import { describe, it, expect } from 'vitest';
import {
	createGameState,
	revealBlob,
	endRound,
	startNextRound,
	passCurrentPlayer,
	undoLastMove,
	getNextActivePlayerId,
	checkRoundOver,
	canUndoLastMove,
	canSkipRound,
	skipRound,
	addPlayer,
	removePlayer,
	replacePlayer,
} from './gameEngine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestion(overrides = {}) {
	return {
		id: 'q1',
		type: 'standard',
		text: 'Q?',
		deck: 'Test',
		deckIcon: null,
		options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
		correctAnswers: Array(10).fill(true),
		answerMedia: Array(10).fill({}),
		...overrides,
	};
}

function makePlayer(id, turnOrder, overrides = {}) {
	return {
		id,
		dbId: null,
		name: `Player ${id}`,
		icon: 'Crown',
		color: 'player-color-1',
		seatPosition: turnOrder,
		turnOrder,
		totalScore: 0,
		roundScore: 0,
		status: 'active',
		...overrides,
	};
}

/**
 * Build a ready-to-play state with N active players and one round started.
 * currentPlayerId defaults to the first player (turnOrder 0).
 */
function makePlayingState({ playerCount = 2, winScore = 50, playerOverrides = [], questionOverrides = {} } = {}) {
	const players = Array.from({ length: playerCount }, (_, i) =>
		makePlayer(`player-${i}`, i, playerOverrides[i] ?? {}),
	);
	const state = createGameState({
		status: 'playing',
		winScore,
		players,
		currentPlayerId: players[0].id,
		startingTurnOrderIndex: 0,
		currentRound: {
			roundNumber: 1,
			question: makeQuestion(questionOverrides),
			answeredBlobs: [],
			blobResults: {},
			lastPlayerId: null,
			dbId: null,
			lastAnswerMove: null,
		},
	});
	return state;
}

// ---------------------------------------------------------------------------
// createGameState
// ---------------------------------------------------------------------------

describe('createGameState', () => {
	it('returns defaults when called with no arguments', () => {
		const state = createGameState();
		expect(state.status).toBe('idle');
		expect(state.code).toBeNull();
		expect(state.winScore).toBe(50);
		expect(state.players).toEqual([]);
		expect(state.currentPlayerId).toBeNull();
		expect(state.startingTurnOrderIndex).toBe(0);
		expect(state.selectedDeckIds).toEqual([]);
		expect(state.usedQuestionIds).toEqual([]);
		expect(state.currentRound).toBeNull();
	});

	it('merges provided config over defaults', () => {
		const state = createGameState({ winScore: 30, code: 'ABC123' });
		expect(state.winScore).toBe(30);
		expect(state.code).toBe('ABC123');
		// Non-overridden defaults remain
		expect(state.status).toBe('idle');
	});

	it('allows full override of every field', () => {
		const players = [makePlayer('player-0', 0)];
		const state = createGameState({
			status: 'playing',
			players,
			currentPlayerId: 'player-0',
			startingTurnOrderIndex: 1,
		});
		expect(state.status).toBe('playing');
		expect(state.players).toBe(players);
		expect(state.currentPlayerId).toBe('player-0');
		expect(state.startingTurnOrderIndex).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// revealBlob
// ---------------------------------------------------------------------------

describe('revealBlob', () => {
	it('returns null when there is no current round', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)], currentPlayerId: 'player-0' });
		expect(revealBlob(state, 0, true)).toBeNull();
	});

	it('returns null when currentPlayerId does not match any player', () => {
		const state = makePlayingState();
		state.currentPlayerId = 'nonexistent';
		expect(revealBlob(state, 0, true)).toBeNull();
	});

	describe('correct answer', () => {
		it('increments the acting player roundScore by 1', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 2;
			revealBlob(state, 0, true);
			expect(state.players[0].roundScore).toBe(3);
		});

		it('player status remains active after a correct answer', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, true);
			expect(state.players[0].status).toBe('active');
		});

		it('returns the correct roundScore in the result', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 4;
			const result = revealBlob(state, 0, true);
			expect(result.roundScore).toBe(5);
			expect(result.isCorrect).toBe(true);
		});

		it('returns a non-null nextPlayerId when round is not over', () => {
			const state = makePlayingState({ playerCount: 2 });
			const result = revealBlob(state, 0, true);
			expect(result.nextPlayerId).toBe('player-1');
			expect(result.roundIsOver).toBe(false);
		});

		it('adds blobIndex to answeredBlobs', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 3, true);
			expect(state.currentRound.answeredBlobs).toContain(3);
		});

		it('records blobResult as true', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 3, true);
			expect(state.currentRound.blobResults[3]).toBe(true);
		});
	});

	describe('incorrect answer (bust)', () => {
		it('resets the acting player roundScore to 0', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 5;
			revealBlob(state, 0, false);
			expect(state.players[0].roundScore).toBe(0);
		});

		it('sets the acting player status to "out"', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, false);
			expect(state.players[0].status).toBe('out');
		});

		it('returns isCorrect = false', () => {
			const state = makePlayingState({ playerCount: 2 });
			const result = revealBlob(state, 0, false);
			expect(result.isCorrect).toBe(false);
		});

		it('returns a nextPlayerId when another player is still active', () => {
			const state = makePlayingState({ playerCount: 2 });
			const result = revealBlob(state, 0, false);
			expect(result.nextPlayerId).toBe('player-1');
			expect(result.roundIsOver).toBe(false);
		});

		it('records blobResult as false', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, false);
			expect(state.currentRound.blobResults[0]).toBe(false);
		});
	});

	describe('lastAnswerMove snapshot', () => {
		it('populates lastAnswerMove with correct snapshot fields', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 3;
			state.currentRound.lastPlayerId = 'player-1';
			revealBlob(state, 5, true);
			const move = state.currentRound.lastAnswerMove;
			expect(move.blobIndex).toBe(5);
			expect(move.playerId).toBe('player-0');
			expect(move.previousRoundScore).toBe(3);
			expect(move.previousStatus).toBe('active');
			expect(move.previousCurrentPlayerId).toBe('player-0');
			expect(move.previousLastPlayerId).toBe('player-1');
		});

		it('captures previousStatus before mutation (bust case)', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, false);
			expect(state.currentRound.lastAnswerMove.previousStatus).toBe('active');
		});
	});

	describe('round-over detection', () => {
		it('roundIsOver = true and nextPlayerId = null when last blob is answered', () => {
			const question = makeQuestion({ options: ['A', 'B'] });
			const state = makePlayingState({ playerCount: 2, questionOverrides: { options: ['A', 'B'] } });
			state.currentRound.question = question;
			// Answer first blob
			revealBlob(state, 0, true);
			state.currentPlayerId = 'player-1';
			// Answer last blob
			const result = revealBlob(state, 1, true);
			expect(result.roundIsOver).toBe(true);
			expect(result.nextPlayerId).toBeNull();
		});

		it('roundIsOver = true when last active player busts', () => {
			// Only one active player — if they bust they become 'out' and round is over
			const state = makePlayingState({
				playerCount: 2,
				playerOverrides: [{}, { status: 'out' }],
			});
			const result = revealBlob(state, 0, false);
			expect(result.roundIsOver).toBe(true);
			expect(result.nextPlayerId).toBeNull();
		});

		it('roundIsOver = true and nextPlayerId = null when single active player answers correctly and all blobs done', () => {
			const question = makeQuestion({ options: ['A'] });
			const state = makePlayingState({
				playerCount: 2,
				playerOverrides: [{}, { status: 'out' }],
			});
			state.currentRound.question = question;
			const result = revealBlob(state, 0, true);
			expect(result.roundIsOver).toBe(true);
			expect(result.nextPlayerId).toBeNull();
		});
	});

	describe('lastPlayerId updated', () => {
		it('updates round.lastPlayerId to the acting player', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, true);
			expect(state.currentRound.lastPlayerId).toBe('player-0');
		});
	});
});

// ---------------------------------------------------------------------------
// endRound
// ---------------------------------------------------------------------------

describe('endRound', () => {
	it('accumulates roundScores into totalScores', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.players[0].roundScore = 5;
		state.players[0].totalScore = 10;
		state.players[1].roundScore = 3;
		state.players[1].totalScore = 7;
		endRound(state);
		expect(state.players[0].totalScore).toBe(15);
		expect(state.players[1].totalScore).toBe(10);
	});

	it('sets status to "round_review" when no winner', () => {
		const state = makePlayingState({ playerCount: 2, winScore: 50 });
		state.players[0].roundScore = 5;
		state.players[1].roundScore = 3;
		endRound(state);
		expect(state.status).toBe('round_review');
	});

	it('sets status to "finished" when a player reaches winScore', () => {
		const state = makePlayingState({ playerCount: 2, winScore: 10 });
		state.players[0].roundScore = 10;
		endRound(state);
		expect(state.status).toBe('finished');
	});

	it('sets status to "finished" when a player exceeds winScore', () => {
		const state = makePlayingState({ playerCount: 2, winScore: 10 });
		state.players[0].totalScore = 8;
		state.players[0].roundScore = 5;
		endRound(state);
		expect(state.status).toBe('finished');
	});

	it('does not score removed players', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, {}, { status: 'removed' }],
		});
		state.players[0].roundScore = 3;
		state.players[1].roundScore = 2;
		state.players[2].roundScore = 10; // removed — should not count
		endRound(state);
		expect(state.players[2].totalScore).toBe(0);
	});

	it('removed players do not trigger a win even if their roundScore would exceed winScore', () => {
		const state = makePlayingState({
			playerCount: 2,
			winScore: 5,
			playerOverrides: [{ roundScore: 1 }, { status: 'removed', roundScore: 100 }],
		});
		endRound(state);
		expect(state.status).toBe('round_review');
	});

	it('clears lastAnswerMove', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.lastAnswerMove = {
			blobIndex: 0,
			playerId: 'player-0',
			previousRoundScore: 0,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		endRound(state);
		expect(state.currentRound.lastAnswerMove).toBeNull();
	});

	it('first-player totalScore exactly at winScore → finished', () => {
		const state = makePlayingState({ playerCount: 2, winScore: 10 });
		state.players[0].totalScore = 7;
		state.players[0].roundScore = 3;
		endRound(state);
		expect(state.status).toBe('finished');
		expect(state.players[0].totalScore).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// startNextRound
// ---------------------------------------------------------------------------

describe('startNextRound', () => {
	it('increments the roundNumber', () => {
		const state = makePlayingState({ playerCount: 2 });
		const q2 = makeQuestion({ id: 'q2' });
		startNextRound(state, q2);
		expect(state.currentRound.roundNumber).toBe(2);
	});

	it('sets the new question on the round', () => {
		const state = makePlayingState({ playerCount: 2 });
		const q2 = makeQuestion({ id: 'q2', text: 'Round 2?' });
		startNextRound(state, q2);
		expect(state.currentRound.question).toBe(q2);
	});

	it('resets answeredBlobs and blobResults', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.answeredBlobs = [0, 1, 2];
		state.currentRound.blobResults = { 0: true, 1: false, 2: true };
		startNextRound(state, makeQuestion());
		expect(state.currentRound.answeredBlobs).toEqual([]);
		expect(state.currentRound.blobResults).toEqual({});
	});

	it('sets status to "playing"', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.status = 'round_review';
		startNextRound(state, makeQuestion());
		expect(state.status).toBe('playing');
	});

	it('resets all non-removed players to active with roundScore 0', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [
				{ status: 'out', roundScore: 0 },
				{ status: 'passed', roundScore: 0 },
				{ status: 'removed', roundScore: 5 },
			],
		});
		startNextRound(state, makeQuestion());
		expect(state.players[0].status).toBe('active');
		expect(state.players[0].roundScore).toBe(0);
		expect(state.players[1].status).toBe('active');
		expect(state.players[1].roundScore).toBe(0);
		// Removed player untouched
		expect(state.players[2].status).toBe('removed');
		expect(state.players[2].roundScore).toBe(5);
	});

	it('advances startingTurnOrderIndex by 1 each round (normal case)', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(state.startingTurnOrderIndex).toBe(0);
		startNextRound(state, makeQuestion());
		expect(state.startingTurnOrderIndex).toBe(1);
		startNextRound(state, makeQuestion());
		expect(state.startingTurnOrderIndex).toBe(2);
	});

	it('wraps startingTurnOrderIndex back to 0 after last player', () => {
		const state = makePlayingState({ playerCount: 2 });
		startNextRound(state, makeQuestion()); // → index 1
		startNextRound(state, makeQuestion()); // → index 0 (wrap)
		expect(state.startingTurnOrderIndex).toBe(0);
	});

	it('does NOT advance startingTurnOrderIndex when all players passed', () => {
		const state = makePlayingState({
			playerCount: 2,
			playerOverrides: [{ status: 'passed' }, { status: 'passed' }],
		});
		state.startingTurnOrderIndex = 1;
		startNextRound(state, makeQuestion());
		expect(state.startingTurnOrderIndex).toBe(1);
	});

	it('sets currentPlayerId to the new starting player', () => {
		const state = makePlayingState({ playerCount: 3 });
		// Round 1 starts at index 0 → player-0; after startNextRound → index 1 → player-1
		startNextRound(state, makeQuestion());
		expect(state.currentPlayerId).toBe('player-1');
	});

	it('correctly selects starter when startingTurnOrderIndex wraps', () => {
		const state = makePlayingState({ playerCount: 2 });
		startNextRound(state, makeQuestion()); // index → 1 → player-1 starts
		expect(state.currentPlayerId).toBe('player-1');
		startNextRound(state, makeQuestion()); // index → 0 → player-0 starts
		expect(state.currentPlayerId).toBe('player-0');
	});

	it('clears lastPlayerId on new round', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.lastPlayerId = 'player-0';
		startNextRound(state, makeQuestion());
		expect(state.currentRound.lastPlayerId).toBeNull();
	});

	it('clears lastAnswerMove on new round', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.lastAnswerMove = {
			blobIndex: 0,
			playerId: 'player-0',
			previousRoundScore: 0,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		startNextRound(state, makeQuestion());
		expect(state.currentRound.lastAnswerMove).toBeNull();
	});

	it('roundNumber increments from whatever the previous roundNumber was', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.roundNumber = 5;
		startNextRound(state, makeQuestion());
		expect(state.currentRound.roundNumber).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// passCurrentPlayer
// ---------------------------------------------------------------------------

describe('passCurrentPlayer', () => {
	it('sets the current player status to "passed"', () => {
		const state = makePlayingState({ playerCount: 2 });
		passCurrentPlayer(state);
		expect(state.players[0].status).toBe('passed');
	});

	it('advances currentPlayerId to the next active player', () => {
		const state = makePlayingState({ playerCount: 3 });
		passCurrentPlayer(state);
		expect(state.currentPlayerId).toBe('player-1');
	});

	it('does not end the round itself (round status unchanged)', () => {
		const state = makePlayingState({ playerCount: 2 });
		passCurrentPlayer(state);
		expect(state.status).toBe('playing');
	});

	it('clears lastAnswerMove to null', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.lastAnswerMove = {
			blobIndex: 0,
			playerId: 'player-0',
			previousRoundScore: 0,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		passCurrentPlayer(state);
		expect(state.currentRound.lastAnswerMove).toBeNull();
	});

	it('updates round.lastPlayerId to the passing player', () => {
		const state = makePlayingState({ playerCount: 2 });
		passCurrentPlayer(state);
		expect(state.currentRound.lastPlayerId).toBe('player-0');
	});

	it('does not advance currentPlayerId when all other players are already passed/out', () => {
		const state = makePlayingState({
			playerCount: 2,
			playerOverrides: [{}, { status: 'out' }],
		});
		// player-0 is active, player-1 is out — after passing player-0 nobody is active
		passCurrentPlayer(state);
		// currentPlayerId should not change to a non-active player (stays same or same)
		expect(state.players[0].status).toBe('passed');
	});

	it('does nothing when currentPlayerId is not found', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentPlayerId = 'nonexistent';
		passCurrentPlayer(state); // should not throw
		expect(state.players.every((p) => p.status === 'active')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// undoLastMove
// ---------------------------------------------------------------------------

describe('undoLastMove', () => {
	it('does nothing when there is no lastAnswerMove', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.players[0].roundScore = 3;
		undoLastMove(state);
		expect(state.players[0].roundScore).toBe(3); // unchanged
	});

	it('does nothing when canUndoLastMove is false (blobIndex mismatch)', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.answeredBlobs = [0, 1];
		state.currentRound.lastAnswerMove = {
			blobIndex: 0, // not the last answered
			playerId: 'player-0',
			previousRoundScore: 2,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		state.players[0].roundScore = 5;
		undoLastMove(state);
		expect(state.players[0].roundScore).toBe(5); // unchanged
	});

	describe('after a correct answer', () => {
		it('restores previousRoundScore', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 4;
			revealBlob(state, 0, true); // roundScore → 5
			undoLastMove(state);
			expect(state.players[0].roundScore).toBe(4);
		});

		it('removes the blob from answeredBlobs', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 2, true);
			undoLastMove(state);
			expect(state.currentRound.answeredBlobs).not.toContain(2);
		});

		it('removes the blob from blobResults', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 2, true);
			undoLastMove(state);
			expect(state.currentRound.blobResults[2]).toBeUndefined();
		});

		it('restores previousCurrentPlayerId', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, true);
			// After reveal, currentPlayerId may have advanced; undo should restore it
			undoLastMove(state);
			expect(state.currentPlayerId).toBe('player-0');
		});

		it('restores previousLastPlayerId', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.currentRound.lastPlayerId = 'player-1';
			revealBlob(state, 0, true);
			undoLastMove(state);
			expect(state.currentRound.lastPlayerId).toBe('player-1');
		});

		it('clears lastAnswerMove after undo', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, true);
			undoLastMove(state);
			expect(state.currentRound.lastAnswerMove).toBeNull();
		});

		it('player status stays active after undoing a correct answer', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, true);
			undoLastMove(state);
			expect(state.players[0].status).toBe('active');
		});
	});

	describe('after an incorrect answer (bust)', () => {
		it('restores player status to "active"', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 0, false); // player-0 → out
			undoLastMove(state);
			expect(state.players[0].status).toBe('active');
		});

		it('restores previousRoundScore (was 0 after bust, should restore pre-bust value)', () => {
			const state = makePlayingState({ playerCount: 2 });
			state.players[0].roundScore = 5;
			revealBlob(state, 0, false); // roundScore → 0
			undoLastMove(state);
			expect(state.players[0].roundScore).toBe(5);
		});

		it('removes blob from answeredBlobs after bust undo', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 3, false);
			undoLastMove(state);
			expect(state.currentRound.answeredBlobs).not.toContain(3);
		});

		it('removes blob from blobResults after bust undo', () => {
			const state = makePlayingState({ playerCount: 2 });
			revealBlob(state, 3, false);
			undoLastMove(state);
			expect(state.currentRound.blobResults[3]).toBeUndefined();
		});
	});

	it('does nothing when currentRound is null', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)], currentPlayerId: 'player-0' });
		undoLastMove(state); // should not throw
	});
});

// ---------------------------------------------------------------------------
// canUndoLastMove
// ---------------------------------------------------------------------------

describe('canUndoLastMove', () => {
	it('returns false when lastAnswerMove is null', () => {
		const state = makePlayingState({ playerCount: 2 });
		expect(canUndoLastMove(state)).toBe(false);
	});

	it('returns false when currentRound is null', () => {
		const state = createGameState();
		expect(canUndoLastMove(state)).toBe(false);
	});

	it('returns true when lastAnswerMove.blobIndex equals last answeredBlob', () => {
		const state = makePlayingState({ playerCount: 2 });
		revealBlob(state, 5, true);
		expect(canUndoLastMove(state)).toBe(true);
	});

	it('returns false when lastAnswerMove.blobIndex does not equal last answeredBlob', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.answeredBlobs = [0, 1, 2];
		state.currentRound.lastAnswerMove = {
			blobIndex: 0,
			playerId: 'player-0',
			previousRoundScore: 0,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		expect(canUndoLastMove(state)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// checkRoundOver
// ---------------------------------------------------------------------------

describe('checkRoundOver', () => {
	it('returns false when currentRound is null', () => {
		const state = createGameState();
		expect(checkRoundOver(state)).toBe(false);
	});

	it('returns false when blobs remain and active players exist', () => {
		const state = makePlayingState({ playerCount: 2 });
		expect(checkRoundOver(state)).toBe(false);
	});

	it('returns true when all blobs are answered', () => {
		const question = makeQuestion({ options: ['A', 'B'] });
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.question = question;
		state.currentRound.answeredBlobs = [0, 1];
		expect(checkRoundOver(state)).toBe(true);
	});

	it('returns true when all players are out/passed/removed', () => {
		const state = makePlayingState({
			playerCount: 2,
			playerOverrides: [{ status: 'out' }, { status: 'passed' }],
		});
		expect(checkRoundOver(state)).toBe(true);
	});

	it('returns false when at least one player is still active', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{ status: 'active' }, { status: 'out' }, { status: 'passed' }],
		});
		expect(checkRoundOver(state)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getNextActivePlayerId
// ---------------------------------------------------------------------------

describe('getNextActivePlayerId', () => {
	it('returns the next active player in turn order', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-1');
	});

	it('wraps around to player with turnOrder 0 after the last', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(getNextActivePlayerId(state, 'player-2')).toBe('player-0');
	});

	it('skips "passed" players', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'passed' }, {}],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-2');
	});

	it('skips "out" players', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'out' }, {}],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-2');
	});

	it('skips "removed" players entirely', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'removed' }, {}],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-2');
	});

	it('returns null when no active players remain', () => {
		const state = makePlayingState({
			playerCount: 2,
			playerOverrides: [{ status: 'passed' }, { status: 'out' }],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBeNull();
	});

	it('returns null when all non-removed players are passed', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [
				{ status: 'passed' },
				{ status: 'passed' },
				{ status: 'passed' },
			],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBeNull();
	});

	it('single active player: returns that player when queried from a different id', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{ status: 'out' }, { status: 'active' }, { status: 'passed' }],
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-1');
	});

	it('handles non-sequential turn orders', () => {
		const state = createGameState({
			players: [
				makePlayer('player-0', 0),
				makePlayer('player-1', 5),
				makePlayer('player-2', 10),
			],
			currentPlayerId: 'player-0',
		});
		// Sorted by turnOrder: player-0(0), player-1(5), player-2(10)
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-1');
		expect(getNextActivePlayerId(state, 'player-2')).toBe('player-0'); // wrap
	});

	it('removed players are excluded from rotation entirely', () => {
		// player-1 removed; turn order: player-0, player-2 (removed player not in sorted list)
		const state = createGameState({
			players: [
				makePlayer('player-0', 0),
				makePlayer('player-1', 1, { status: 'removed' }),
				makePlayer('player-2', 2),
			],
			currentPlayerId: 'player-0',
		});
		expect(getNextActivePlayerId(state, 'player-0')).toBe('player-2');
		// wrap: after player-2, next is player-0
		expect(getNextActivePlayerId(state, 'player-2')).toBe('player-0');
	});
});

// ---------------------------------------------------------------------------
// addPlayer
// ---------------------------------------------------------------------------

describe('addPlayer', () => {
	it('adds a player and returns a new id', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)] });
		const result = addPlayer(state, { name: 'Bob', icon: 'Dog', color: 'player-color-2', seatPosition: 1 });
		expect(result).toBe('player-1');
		expect(state.players).toHaveLength(2);
	});

	it('assigns turnOrder as max existing + 1', () => {
		const state = createGameState({ players: [makePlayer('player-0', 5)] });
		addPlayer(state, { name: 'Bob', icon: 'Dog', color: 'player-color-2', seatPosition: 1 });
		expect(state.players[1].turnOrder).toBe(6);
	});

	it('new player has totalScore 0, roundScore 0, status active', () => {
		const state = createGameState({ players: [] });
		addPlayer(state, { name: 'Alice', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		const p = state.players[0];
		expect(p.totalScore).toBe(0);
		expect(p.roundScore).toBe(0);
		expect(p.status).toBe('active');
		expect(p.dbId).toBeNull();
	});

	it('returns false when 8 active players already exist', () => {
		const players = Array.from({ length: 8 }, (_, i) => makePlayer(`player-${i}`, i));
		const state = createGameState({ players });
		expect(addPlayer(state, { name: 'P9', icon: 'Crown', color: 'player-color-1', seatPosition: 8 })).toBe(false);
		expect(state.players).toHaveLength(8);
	});

	it('allows adding when one player is removed (active count < 8)', () => {
		const players = Array.from({ length: 8 }, (_, i) =>
			makePlayer(`player-${i}`, i, i === 0 ? { status: 'removed' } : {}),
		);
		const state = createGameState({ players });
		const result = addPlayer(state, { name: 'New', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		expect(result).not.toBe(false);
		expect(state.players).toHaveLength(9);
	});

	it('generates IDs using max id number + 1, not gap-filling', () => {
		const state = createGameState({
			players: [makePlayer('player-0', 0), makePlayer('player-5', 1)],
		});
		const id = addPlayer(state, { name: 'Charlie', icon: 'Rocket', color: 'player-color-3', seatPosition: 2 });
		expect(id).toBe('player-6');
	});

	it('first player id is player-0 when list is empty', () => {
		const state = createGameState({ players: [] });
		const id = addPlayer(state, { name: 'Alice', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		expect(id).toBe('player-0');
	});
});

// ---------------------------------------------------------------------------
// removePlayer
// ---------------------------------------------------------------------------

describe('removePlayer', () => {
	it('sets the player status to "removed"', () => {
		const state = makePlayingState({ playerCount: 3 });
		removePlayer(state, 'player-1');
		expect(state.players.find((p) => p.id === 'player-1').status).toBe('removed');
	});

	it('returns true on successful removal', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(removePlayer(state, 'player-1')).toBe(true);
	});

	it('sets seatPosition to -1 on removal', () => {
		const state = makePlayingState({ playerCount: 3 });
		removePlayer(state, 'player-1');
		expect(state.players.find((p) => p.id === 'player-1').seatPosition).toBe(-1);
	});

	it('zeroes roundScore on removal', () => {
		const state = makePlayingState({ playerCount: 3 });
		state.players[1].roundScore = 7;
		removePlayer(state, 'player-1');
		expect(state.players.find((p) => p.id === 'player-1').roundScore).toBe(0);
	});

	it('returns false when fewer than 3 active players (would leave < 2)', () => {
		const state = makePlayingState({ playerCount: 2 });
		expect(removePlayer(state, 'player-0')).toBe(false);
		expect(state.players[0].status).toBe('active');
	});

	it('returns false for nonexistent player id', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(removePlayer(state, 'player-99')).toBe(false);
	});

	it('returns false when player is already removed', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'removed' }, {}],
		});
		expect(removePlayer(state, 'player-1')).toBe(false);
	});

	it('advances currentPlayerId when the removed player is current', () => {
		const state = makePlayingState({ playerCount: 3 });
		state.currentPlayerId = 'player-1';
		removePlayer(state, 'player-1');
		expect(state.currentPlayerId).toBe('player-2');
	});

	it('does not change currentPlayerId when removed player is not current', () => {
		const state = makePlayingState({ playerCount: 3 });
		state.currentPlayerId = 'player-0';
		removePlayer(state, 'player-2');
		expect(state.currentPlayerId).toBe('player-0');
	});

	it('works when some players are already removed', () => {
		const state = makePlayingState({
			playerCount: 4,
			playerOverrides: [{}, { status: 'removed', seatPosition: -1 }, {}, {}],
		});
		expect(removePlayer(state, 'player-2')).toBe(true);
	});

	it('blocks removal when already-removed players make remaining count drop below 2', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'removed', seatPosition: -1 }, {}],
		});
		expect(removePlayer(state, 'player-2')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canSkipRound
// ---------------------------------------------------------------------------

describe('canSkipRound', () => {
	it('returns true when no blobs answered and all active players are active', () => {
		const state = makePlayingState({ playerCount: 3 });
		expect(canSkipRound(state)).toBe(true);
	});

	it('returns false when currentRound is null', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)] });
		expect(canSkipRound(state)).toBe(false);
	});

	it('returns false when answeredBlobs is non-empty', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.answeredBlobs = [0];
		expect(canSkipRound(state)).toBe(false);
	});

	it('returns false when any active player has status "passed"', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'passed' }, {}],
		});
		expect(canSkipRound(state)).toBe(false);
	});

	it('returns false when any active player has status "out"', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, { status: 'out' }, {}],
		});
		expect(canSkipRound(state)).toBe(false);
	});

	it('ignores removed players', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, {}, { status: 'removed' }],
		});
		expect(canSkipRound(state)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// skipRound
// ---------------------------------------------------------------------------

describe('skipRound', () => {
	it('sets all active players to passed', () => {
		const state = makePlayingState({ playerCount: 3 });
		skipRound(state);
		state.players.forEach((p) => {
			expect(p.status).toBe('passed');
		});
	});

	it('does not modify removed players', () => {
		const state = makePlayingState({
			playerCount: 3,
			playerOverrides: [{}, {}, { status: 'removed' }],
		});
		skipRound(state);
		expect(state.players[0].status).toBe('passed');
		expect(state.players[1].status).toBe('passed');
		expect(state.players[2].status).toBe('removed');
	});

	it('does not modify any scores', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.players[0].roundScore = 0;
		state.players[0].totalScore = 10;
		state.players[1].roundScore = 0;
		state.players[1].totalScore = 5;
		skipRound(state);
		expect(state.players[0].roundScore).toBe(0);
		expect(state.players[0].totalScore).toBe(10);
		expect(state.players[1].roundScore).toBe(0);
		expect(state.players[1].totalScore).toBe(5);
	});

	it('clears lastAnswerMove', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.currentRound.lastAnswerMove = {
			blobIndex: 0,
			playerId: 'player-0',
			previousRoundScore: 0,
			previousStatus: 'active',
			previousCurrentPlayerId: 'player-0',
			previousLastPlayerId: null,
		};
		skipRound(state);
		expect(state.currentRound.lastAnswerMove).toBeNull();
	});

	it('makes checkRoundOver return true', () => {
		const state = makePlayingState({ playerCount: 3 });
		skipRound(state);
		expect(checkRoundOver(state)).toBe(true);
	});

	it('triggers all-pass path in startNextRound (startingTurnOrderIndex unchanged)', () => {
		const state = makePlayingState({ playerCount: 2 });
		state.startingTurnOrderIndex = 1;
		skipRound(state);
		endRound(state);
		startNextRound(state, makeQuestion());
		// All-pass means startingTurnOrderIndex does NOT advance
		expect(state.startingTurnOrderIndex).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// replacePlayer
// ---------------------------------------------------------------------------

describe('replacePlayer', () => {
	it('updates name, icon, and color', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)] });
		replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		const p = state.players[0];
		expect(p.name).toBe('Bob');
		expect(p.icon).toBe('Dog');
		expect(p.color).toBe('player-color-5');
	});

	it('preserves seatPosition, turnOrder, totalScore, roundScore', () => {
		const state = createGameState({
			players: [makePlayer('player-0', 0, { seatPosition: 3, turnOrder: 2, totalScore: 15, roundScore: 4 })],
		});
		replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		const p = state.players[0];
		expect(p.seatPosition).toBe(3);
		expect(p.turnOrder).toBe(2);
		expect(p.totalScore).toBe(15);
		expect(p.roundScore).toBe(4);
	});

	it('preserves player status', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0, { status: 'passed' })] });
		replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(state.players[0].status).toBe('passed');
	});

	it('returns true on success', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)] });
		expect(replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' })).toBe(true);
	});

	it('returns false for a nonexistent player id', () => {
		const state = createGameState({ players: [makePlayer('player-0', 0)] });
		expect(replacePlayer(state, 'player-99', { name: 'Bob', icon: 'Dog', color: 'player-color-5' })).toBe(false);
	});

	it('returns false for a removed player', () => {
		const state = createGameState({
			players: [makePlayer('player-0', 0, { status: 'removed' })],
		});
		expect(replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' })).toBe(false);
	});

	it('does not modify a removed player', () => {
		const state = createGameState({
			players: [makePlayer('player-0', 0, { status: 'removed', name: 'Alice' })],
		});
		replacePlayer(state, 'player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(state.players[0].name).toBe('Alice');
	});
});
