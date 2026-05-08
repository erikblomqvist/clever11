import { describe, it, expect, beforeEach } from 'vitest';
import { game, removePlayer, replacePlayer, addPlayer, loadDemoGame } from './game.svelte.js';

/** @returns {import('./game.svelte.js').GamePlayer} */
function makePlayer(overrides = {}) {
	return {
		id: 'player-0',
		dbId: null,
		name: 'Alice',
		icon: 'Crown',
		color: 'player-color-1',
		seatPosition: 0,
		turnOrder: 0,
		totalScore: 10,
		roundScore: 3,
		status: 'active',
		...overrides,
	};
}

/**
 * @param {number} count
 * @param {Partial<import('./game.svelte.js').GamePlayer>[]} [overrides]
 */
function setupGame(count, overrides = []) {
	/** @type {import('./game.svelte.js').DemoGameSnapshot} */
	const snapshot = {
		status: 'round_review',
		players: Array.from({ length: count }, (_, i) => ({
			id: `player-${i}`,
			dbId: null,
			name: `Player ${i}`,
			icon: 'Crown',
			color: `player-color-${i + 1}`,
			seatPosition: i,
			turnOrder: i,
			totalScore: 0,
			roundScore: 0,
			status: /** @type {'active'|'passed'|'out'|'removed'} */ ('active'),
			...(overrides[i] ?? {}),
		})),
		currentPlayerId: 'player-0',
		currentRound: {
			roundNumber: 1,
			question: {
				id: 'test-q',
				type: 'standard',
				text: 'Test question?',
				deck: 'Test',
				deckIcon: null,
				options: ['A', 'B', 'C'],
				correctAnswers: [true, false, true],
				answerMedia: [{}, {}, {}],
			},
			answeredBlobs: [],
			blobResults: {},
			lastPlayerId: null,
			dbId: null,
			lastAnswerMove: null,
		},
	};
	loadDemoGame(snapshot);
}

describe('removePlayer', () => {
	it('sets the player status to removed', () => {
		setupGame(4);
		removePlayer('player-1');
		expect(game.players.find((p) => p.id === 'player-1').status).toBe('removed');
	});

	it('returns true on successful removal', () => {
		setupGame(4);
		expect(removePlayer('player-1')).toBe(true);
	});

	it('frees the seat position', () => {
		setupGame(4);
		removePlayer('player-1');
		expect(game.players.find((p) => p.id === 'player-1').seatPosition).toBe(-1);
	});

	it('returns false when removing would leave fewer than 2 active players', () => {
		setupGame(2);
		expect(removePlayer('player-0')).toBe(false);
		expect(game.players.find((p) => p.id === 'player-0').status).toBe('active');
	});

	it('works when some players are already removed', () => {
		setupGame(4, [{}, { status: 'removed', seatPosition: -1 }, {}, {}]);
		expect(removePlayer('player-2')).toBe(true);
	});

	it('blocks removal when already-removed players make count drop below 2', () => {
		setupGame(3, [{}, { status: 'removed', seatPosition: -1 }, {}]);
		expect(removePlayer('player-2')).toBe(false);
	});

	it('advances current player if the removed player is current', () => {
		setupGame(4);
		game.currentPlayerId = 'player-1';
		removePlayer('player-1');
		expect(game.currentPlayerId).toBe('player-2');
	});

	it('returns false for a non-existent player id', () => {
		setupGame(3);
		expect(removePlayer('player-99')).toBe(false);
	});
});

describe('replacePlayer', () => {
	beforeEach(() => {
		game.players = [];
		game.dbGameId = null;
	});

	it('replaces name, icon, and color', () => {
		game.players = [makePlayer()];
		replacePlayer('player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(game.players[0].name).toBe('Bob');
		expect(game.players[0].icon).toBe('Dog');
		expect(game.players[0].color).toBe('player-color-5');
	});

	it('preserves seatPosition, turnOrder, totalScore, roundScore', () => {
		game.players = [makePlayer({ seatPosition: 3, turnOrder: 2, totalScore: 15, roundScore: 4 })];
		replacePlayer('player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(game.players[0].seatPosition).toBe(3);
		expect(game.players[0].turnOrder).toBe(2);
		expect(game.players[0].totalScore).toBe(15);
		expect(game.players[0].roundScore).toBe(4);
	});

	it('preserves player status', () => {
		game.players = [makePlayer({ status: 'passed' })];
		replacePlayer('player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(game.players[0].status).toBe('passed');
	});

	it('returns false for a non-existent player ID', () => {
		game.players = [makePlayer()];
		expect(replacePlayer('player-999', { name: 'Bob', icon: 'Dog', color: 'player-color-5' })).toBe(false);
	});

	it('returns false for a removed player', () => {
		game.players = [makePlayer({ status: 'removed' })];
		expect(replacePlayer('player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' })).toBe(false);
	});

	it('does not modify a removed player', () => {
		game.players = [makePlayer({ status: 'removed', name: 'Alice' })];
		replacePlayer('player-0', { name: 'Bob', icon: 'Dog', color: 'player-color-5' });
		expect(game.players[0].name).toBe('Alice');
	});

	it('returns true on success', () => {
		game.players = [makePlayer()];
		expect(replacePlayer('player-0', { name: 'Charlie', icon: 'Rocket', color: 'player-color-3' })).toBe(true);
	});
});

describe('addPlayer', () => {
	beforeEach(() => {
		game.players = [];
		game.dbGameId = null;
	});

	it('adds a player with correct defaults', () => {
		const result = addPlayer({ name: 'Alice', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		expect(result).toBe('player-0');
		expect(game.players).toHaveLength(1);
		const player = game.players[0];
		expect(player.totalScore).toBe(0);
		expect(player.roundScore).toBe(0);
		expect(player.status).toBe('active');
		expect(player.dbId).toBeNull();
	});

	it('generates unique player IDs', () => {
		const id1 = addPlayer({ name: 'Alice', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		const id2 = addPlayer({ name: 'Bob', icon: 'Dog', color: 'player-color-2', seatPosition: 1 });
		expect(id1).toBe('player-0');
		expect(id2).toBe('player-1');
	});

	it('assigns turn order as max existing + 1', () => {
		addPlayer({ name: 'Alice', icon: 'Crown', color: 'player-color-1', seatPosition: 0 });
		addPlayer({ name: 'Bob', icon: 'Dog', color: 'player-color-2', seatPosition: 1 });
		expect(game.players[0].turnOrder).toBe(0);
		expect(game.players[1].turnOrder).toBe(1);
	});

	it('handles non-sequential existing turn orders', () => {
		game.players = [makePlayer({ turnOrder: 5 })];
		addPlayer({ name: 'Bob', icon: 'Dog', color: 'player-color-2', seatPosition: 1 });
		expect(game.players[1].turnOrder).toBe(6);
	});

	it('returns false when 8 active players already exist', () => {
		for (let i = 0; i < 8; i++) {
			addPlayer({ name: `Player ${i}`, icon: 'Crown', color: `player-color-${i + 1}`, seatPosition: i });
		}
		expect(addPlayer({ name: 'Player 9', icon: 'Crown', color: 'player-color-1', seatPosition: 0 })).toBe(false);
		expect(game.players).toHaveLength(8);
	});

	it('allows adding when some players are removed', () => {
		for (let i = 0; i < 8; i++) {
			addPlayer({ name: `Player ${i}`, icon: 'Crown', color: `player-color-${i + 1}`, seatPosition: i });
		}
		game.players[0].status = 'removed';
		const result = addPlayer({ name: 'Replacement', icon: 'Dog', color: 'player-color-1', seatPosition: 0 });
		expect(result).not.toBe(false);
		expect(game.players).toHaveLength(9);
	});

	it('generates IDs using max+1 not gap-filling', () => {
		game.players = [
			makePlayer({ id: 'player-0', turnOrder: 0 }),
			makePlayer({ id: 'player-2', turnOrder: 1 }),
		];
		const id = addPlayer({ name: 'Charlie', icon: 'Rocket', color: 'player-color-3', seatPosition: 2 });
		expect(id).toBe('player-3');
	});
});
