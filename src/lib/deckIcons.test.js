import { describe, it, expect } from 'vitest';
import { resolveSuggestedIcons } from './deckIcons.js';

describe('resolveSuggestedIcons', () => {
	it('accepts names in kebab, Pascal, and spaced forms', () => {
		expect(resolveSuggestedIcons(['alarm-clock'])).toEqual([
			{ id: 'AlarmClock', label: 'Alarm Clock' },
		]);
		expect(resolveSuggestedIcons(['AlarmClock'])).toEqual([
			{ id: 'AlarmClock', label: 'Alarm Clock' },
		]);
		expect(resolveSuggestedIcons(['alarm clock'])).toEqual([
			{ id: 'AlarmClock', label: 'Alarm Clock' },
		]);
	});

	it('drops hallucinated names that are not real Lucide icons', () => {
		const result = resolveSuggestedIcons([
			'clock',
			'definitely-not-an-icon',
		]);
		expect(result.map((i) => i.id)).toEqual(['Clock']);
	});

	it('dedupes names that normalize to the same icon', () => {
		const result = resolveSuggestedIcons(['clock', 'Clock', 'clock']);
		expect(result.map((i) => i.id)).toEqual(['Clock']);
	});

	it('trims to the requested limit', () => {
		const names = ['clock', 'heart', 'star', 'circle', 'square'];
		expect(resolveSuggestedIcons(names, 3)).toHaveLength(3);
	});

	it('ignores non-array and non-string input', () => {
		expect(resolveSuggestedIcons(null)).toEqual([]);
		expect(resolveSuggestedIcons('clock')).toEqual([]);
		expect(resolveSuggestedIcons([42, '', '  ', 'clock'])).toEqual([
			{ id: 'Clock', label: 'Clock' },
		]);
	});
});
