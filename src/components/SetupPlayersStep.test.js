import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

import SetupPlayersStep from './SetupPlayersStep.svelte';

/** @returns {import('../views/SetupView.svelte').SetupPlayer} */
function makePlayer(name, icon, color) {
	return { name, icon, color, seatPosition: null, turnOrder: null };
}

describe('SetupPlayersStep', () => {
	const defaults = {
		newName: '',
		newIcon: 'Crown',
		newColor: 'player-color-1',
		usedIcons: ['Crown', 'Car', 'Dog'],
		usedColors: ['player-color-1', 'player-color-2', 'player-color-3'],
		canAddPlayer: false,
		onaddplayer: () => {},
		onremoveplayer: () => {},
	};

	it('renders all players in the list', () => {
		const players = [
			makePlayer('Alice', 'Crown', 'player-color-1'),
			makePlayer('Bob', 'Car', 'player-color-2'),
			makePlayer('Charlie', 'Dog', 'player-color-3'),
		];

		render(SetupPlayersStep, { props: { ...defaults, players } });

		expect(screen.getByText('Alice')).toBeTruthy();
		expect(screen.getByText('Bob')).toBeTruthy();
		expect(screen.getByText('Charlie')).toBeTruthy();
	});
});
