import { describe, it, expect, vi } from 'vitest';
import { Game } from './game.svelte.js';

describe('Game Class - Question Selection', () => {
	it('prioritizes questions with lower mileage', async () => {
		const adapter = {
			fetchQuestionsForDecks: vi.fn(),
			persistNewGame: vi.fn(),
			syncGameState: vi.fn(),
			dbCreateNewRound: vi.fn(),
			fetchForcedQuestion: vi.fn().mockResolvedValue(null),
		};
		const game = new Game(adapter);

		// Define a pool where q1 has high mileage and q2 has zero mileage
		const pool = [
			{
				id: 'q1',
				mileage: 100,
				text: 'High mileage',
				options: [],
				correctAnswers: [],
				answerMedia: [],
			},
			{
				id: 'q2',
				mileage: 0,
				text: 'Low mileage',
				options: [],
				correctAnswers: [],
				answerMedia: [],
			},
		];

		// Access private-ish questionPool via any cast or by setting it through a mock
		// Since questionPool is a module-level variable in game.svelte.js,
		// we might need to mock the adapter to return this pool.
		adapter.fetchQuestionsForDecks.mockResolvedValue(pool);

		// Weighted random selection simulation
		// We need to bypass the fact that pickNextQuestion pushes to usedQuestionIds
		// and that it resets it when empty.
		// We'll just test the logic by calling it repeatedly.

		await game.initGame({
			players: [{ name: 'P1', icon: 'I1', color: 'C1' }],
			selectedDeckIds: ['d1'],
		});

		const counts = { q1: 0, q2: 0 };
		const iterations = 1000;

		for (let i = 0; i < iterations; i++) {
			game.usedQuestionIds = [];
			const q = game.pickNextQuestion();
			counts[q.id]++;
		}

		// Weight for q1 = 1 / 101 approx 0.01
		// Weight for q2 = 1 / 1 approx 1
		// Total weight approx 1.01
		// q2 should be picked ~99% of the time
		expect(counts.q2).toBeGreaterThan(counts.q1 * 10);
		expect(counts.q2).toBeGreaterThan(900);
	});
});
