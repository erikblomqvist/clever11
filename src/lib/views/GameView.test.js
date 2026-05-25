import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

// Mock svelte-i18n
vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

// Mock $lib/game
vi.mock('$lib/game', () => {
	const mockGame = {
		status: 'playing',
		players: [],
		currentPlayer: null,
		currentRound: {
			question: {
				options: [],
			},
		},
		blobStates: [],
		roundIsOver: false,
		undoIsAvailable: false,
		undoableBlobIndex: null,
		canSkipRound: false,
		turnTimerSeconds: null,
		loadGame: vi.fn(),
		passCurrentPlayer: vi.fn(),
		endRound: vi.fn(),
	};
	return {
		game: mockGame,
	};
});

import GameView from './GameView.svelte';
import { game } from '$lib/game';
import { fireEvent } from '@testing-library/dom';

describe('GameView', () => {
	it('renders playing surface when status is playing', () => {
		game.status = 'playing';
		game.currentRound = {
			question: {
				id: 'q1',
				type: 'standard',
				text: 'Question Text',
				options: ['A', 'B'],
				correctAnswers: [true, false],
				answerMedia: [{}, {}],
			},
			answeredBlobs: [],
			lastPlayerId: null,
		};
		game.blobStates = [null, null];

		render(GameView);

		// Check if question text is rendered (part of QuestionWheel inside GamePlayingSurface)
		expect(screen.getByText('Question Text')).toBeTruthy();
	});

	it('calls passCurrentPlayer when pass button is clicked', async () => {
		game.status = 'playing';
		game.roundIsOver = false;
		game.currentRound = {
			question: {
				id: 'q1',
				type: 'standard',
				text: 'Question Text',
				options: ['A', 'B'],
				correctAnswers: [true, false],
				answerMedia: [{}, {}],
			},
			answeredBlobs: [],
			lastPlayerId: null,
		};
		game.blobStates = [null, null];

		render(GameView);

		const passButton = screen.getAllByText('game.pass')[0];

		await fireEvent.click(passButton);

		expect(game.passCurrentPlayer).toHaveBeenCalled();
	});

	it('renders review surface when status is round_review', () => {
		game.status = 'round_review';
		game.players = [
			{
				id: 'p1',
				name: 'Alice',
				roundScore: 5,
				totalScore: 10,
				color: 'player-color-1',
				status: 'active',
			},
		];
		game.currentRound = {
			roundNumber: 1,
			question: { options: [] },
			answeredBlobs: [],
			lastPlayerId: null,
		};

		render(GameView);

		// Check if "standings" is rendered (part of RoundReviewPanel)
		expect(screen.getByText('game.standings')).toBeTruthy();
	});
});
