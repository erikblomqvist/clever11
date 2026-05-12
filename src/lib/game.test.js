import { describe, it, expect, vi } from 'vitest';
import { Game } from './game.svelte.js';
import { GamePersistenceAdapter } from './gameAdapter.js';

/**
 * @implements {GamePersistenceAdapter}
 */
class MockGameAdapter extends GamePersistenceAdapter {
	persistNewGame = vi.fn().mockResolvedValue(undefined);
	persistBlobReveal = vi.fn().mockResolvedValue(undefined);
	syncGameState = vi.fn().mockResolvedValue(undefined);
	dbCreateNewRound = vi.fn().mockResolvedValue(undefined);
	deletePersistedAnswer = vi.fn().mockResolvedValue(undefined);
	persistNewPlayer = vi.fn().mockResolvedValue(undefined);
	persistQuestionVote = vi.fn().mockResolvedValue(undefined);
	loadGame = vi.fn().mockResolvedValue({});
	fetchQuestionsForDecks = vi.fn().mockResolvedValue([]);
	fetchForcedQuestion = vi.fn().mockResolvedValue(null);
}

/**
 * Build a ready-to-play game instance with N active players and one round started.
 */
function createTestGame({
	playerCount = 2,
	winScore = 50,
	playerOverrides = [],
	questionOverrides = {},
} = {}) {
	const adapter = new MockGameAdapter();
	const game = new Game(adapter);

	const players = Array.from({ length: playerCount }, (_, i) => ({
		id: `player-${i}`,
		dbId: `db-player-${i}`,
		name: `Player ${i}`,
		icon: 'Crown',
		color: `player-color-${i + 1}`,
		seatPosition: i,
		turnOrder: i,
		totalScore: 0,
		roundScore: 0,
		status: 'active',
		...(playerOverrides[i] ?? {}),
	}));

	const question = {
		id: 'q1',
		type: 'standard',
		text: 'Q?',
		deck: 'Test',
		deckIcon: null,
		options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
		correctAnswers: Array(10).fill(true),
		answerMedia: Array(10).fill({}),
		...questionOverrides,
	};

	game.status = 'playing';
	game.winScore = winScore;
	game.players = players;
	game.currentPlayerId = players[0].id;
	game.currentRound = {
		roundNumber: 1,
		question,
		answeredBlobs: [],
		blobResults: {},
		lastPlayerId: null,
		dbId: 'db-round-1',
		lastAnswerMove: null,
	};

	return game;
}

describe('Game Class - State and Queries', () => {
	it('initializes with default values', () => {
		const game = new Game(new MockGameAdapter());
		expect(game.status).toBe('idle');
		expect(game.players).toEqual([]);
		expect(game.roundIsOver).toBe(false);
	});

	it('identifies the current player correctly', () => {
		const game = createTestGame({ playerCount: 2 });
		expect(game.currentPlayer.id).toBe('player-0');
	});

	it('identifies round is over when all blobs are answered', () => {
		const game = createTestGame({
			playerCount: 2,
			questionOverrides: { options: ['A', 'B'] },
		});
		game.currentRound.answeredBlobs = [0, 1];
		expect(game.roundIsOver).toBe(true);
	});

	it('identifies round is over when all players are inactive', () => {
		const game = createTestGame({
			playerCount: 2,
			playerOverrides: [{ status: 'passed' }, { status: 'out' }],
		});
		expect(game.roundIsOver).toBe(true);
	});
});

describe('Game Class - Actions', () => {
	describe('revealBlob', () => {
		it('updates state and calls persistence on correct answer', () => {
			const game = createTestGame();
			const result = game.revealBlob(0, true);

			expect(game.players[0].roundScore).toBe(1);
			expect(game.currentRound.answeredBlobs).toContain(0);
			expect(game.currentRound.blobResults[0]).toBe(true);
			expect(game.adapter.persistBlobReveal).toHaveBeenCalled();
			expect(result.isCorrect).toBe(true);
		});

		it('busts the player on incorrect answer', () => {
			const game = createTestGame();
			game.players[0].roundScore = 5;
			game.revealBlob(0, false);

			expect(game.players[0].roundScore).toBe(0);
			expect(game.players[0].status).toBe('out');
			expect(game.adapter.persistBlobReveal).toHaveBeenCalled();
		});

		it('advances current player by default', () => {
			const game = createTestGame();
			game.revealBlob(0, true);
			expect(game.currentPlayerId).toBe('player-1');
		});

		it('defers advancement when requested', () => {
			const game = createTestGame();
			game.revealBlob(0, true, { deferAdvance: true });
			expect(game.currentPlayerId).toBe('player-0');
		});
	});

	describe('undoLastMove', () => {
		it('reverses the last reveal', () => {
			const game = createTestGame();
			game.players[0].roundScore = 2;
			game.revealBlob(0, true); // score 3
			game.undoLastMove();

			expect(game.players[0].roundScore).toBe(2);
			expect(game.currentRound.answeredBlobs).not.toContain(0);
			expect(game.currentPlayerId).toBe('player-0');
			expect(game.adapter.syncGameState).toHaveBeenCalled();
		});
	});

	describe('passCurrentPlayer', () => {
		it('sets status to passed and advances player', () => {
			const game = createTestGame();
			game.passCurrentPlayer();
			expect(game.players[0].status).toBe('passed');
			expect(game.currentPlayerId).toBe('player-1');
			expect(game.adapter.syncGameState).toHaveBeenCalled();
		});
	});

	describe('endRound', () => {
		it('accumulates scores and transitions to review', () => {
			const game = createTestGame();
			game.players[0].roundScore = 5;
			game.endRound();
			expect(game.players[0].totalScore).toBe(5);
			expect(game.status).toBe('round_review');
			expect(game.adapter.syncGameState).toHaveBeenCalled();
		});

		it('transitions to finished if a player wins', () => {
			const game = createTestGame({ winScore: 10 });
			game.players[0].roundScore = 15;
			game.endRound();
			expect(game.status).toBe('finished');
		});
	});

	describe('Player Management', () => {
		it('adds a player correctly', () => {
			const game = createTestGame({ playerCount: 2 });
			const id = game.addPlayer({
				name: 'Bob',
				icon: 'Dog',
				color: 'red',
				seatPosition: 3,
			});
			expect(id).toBe('player-2');
			expect(game.players).toHaveLength(3);
			expect(game.adapter.persistNewPlayer).toHaveBeenCalled();
		});

		it('removes a player correctly', () => {
			const game = createTestGame({ playerCount: 3 });
			game.removePlayer('player-1');
			expect(game.players.find((p) => p.id === 'player-1').status).toBe(
				'removed',
			);
			expect(game.adapter.syncGameState).toHaveBeenCalled();
		});

		it('replaces a player correctly', () => {
			const game = createTestGame();
			game.replacePlayer('player-0', {
				name: 'NewName',
				icon: 'NewIcon',
				color: 'NewColor',
			});
			expect(game.players[0].name).toBe('NewName');
			expect(game.adapter.syncGameState).toHaveBeenCalled();
		});
	});
});
