import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

// Auto-cleanup isn't registering in this setup, so unmount between tests to
// stop rendered components from accumulating in the shared document.
afterEach(cleanup);

// The unlock celebration plays a Web Audio chime; jsdom/happy-dom has no
// AudioContext, so stub the audio module to keep the egg logic testable.
vi.mock('./celebrationAudio.js', () => ({
	playSparkleChime: () => {},
	playWhooshDing: () => {},
	playRainbowGlissando: () => {},
}));

vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

import SetupPlayersStep from './SetupPlayersStep.svelte';

/** @returns {import('$lib/views/SetupView.svelte').SetupPlayer} */
function makePlayer(name, icon, color) {
	return {
		id: crypto.randomUUID(),
		name,
		icon,
		color,
		seatPosition: null,
		turnOrder: null,
	};
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

		expect(screen.getByDisplayValue('Alice')).toBeTruthy();
		expect(screen.getByDisplayValue('Bob')).toBeTruthy();
		expect(screen.getByDisplayValue('Charlie')).toBeTruthy();
	});

	// "Red and yellow and pink and green, purple..." — the colour-song egg.
	const RAINBOW_SEQUENCE = [
		'player-color-1', // red
		'player-color-4', // yellow
		'player-color-7', // pink
		'player-color-3', // green
		'player-color-5', // purple
	];

	async function tapColors(sequence) {
		for (const id of sequence) {
			await fireEvent.click(screen.getByLabelText(id));
		}
	}

	it('unlocks the Pride Parade icons when colours are tapped in song order', async () => {
		render(SetupPlayersStep, {
			props: { ...defaults, players: [], prideUnlocked: false },
		});

		expect(screen.queryByLabelText('Rainbow')).toBeNull();

		await tapColors(RAINBOW_SEQUENCE);

		expect(screen.getByLabelText('Rainbow')).toBeTruthy();
		expect(screen.getByLabelText('HandFist')).toBeTruthy();

		// Each unlocked icon carries a rainbow tint that steps from red on the
		// first icon (Rainbow, hue 0) to violet on the last (Palette, hue 280).
		expect(
			screen
				.getByLabelText('Rainbow')
				.style.getPropertyValue('--unlock-tint'),
		).toBe('hsl(0 80% 52%)');
		expect(
			screen
				.getByLabelText('Palette')
				.style.getPropertyValue('--unlock-tint'),
		).toBe('hsl(280 80% 52%)');
	});

	it('does not unlock when the colour order is wrong', async () => {
		render(SetupPlayersStep, {
			props: { ...defaults, players: [], prideUnlocked: false },
		});

		// Swap the final purple for blue — breaks the sequence.
		await tapColors([...RAINBOW_SEQUENCE.slice(0, 4), 'player-color-2']);

		expect(screen.queryByLabelText('Rainbow')).toBeNull();
	});
});
