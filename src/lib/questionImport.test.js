import { describe, it, expect } from 'vitest';
import { normalizeAnswers } from './questionImport.js';

function normColor(backgroundColor) {
	return normalizeAnswers('colors', [{ text: 'test', backgroundColor }])[0]
		.backgroundColor;
}

describe('normalizeBackgroundColor', () => {
	it('passes through valid space-separated HSL', () => {
		expect(normColor('hsl(120 80% 50%)')).toBe('hsl(120 80% 50%)');
	});

	it('converts comma-separated HSL', () => {
		expect(normColor('hsl(120, 80%, 50%)')).toBe('hsl(120 80% 50%)');
	});

	it('converts comma-separated HSL without spaces', () => {
		expect(normColor('hsl(120,80%,50%)')).toBe('hsl(120 80% 50%)');
	});

	it('strips alpha from hsla()', () => {
		expect(normColor('hsla(120, 80%, 50%, 0.5)')).toBe('hsl(120 80% 50%)');
	});

	it('strips alpha from modern hsl() with slash', () => {
		expect(normColor('hsl(120 80% 50% / 0.8)')).toBe('hsl(120 80% 50%)');
	});

	it('rounds fractional values', () => {
		expect(normColor('hsl(120.7, 80.3%, 50.9%)')).toBe('hsl(121 80% 51%)');
	});

	it('wraps hue via modulo', () => {
		expect(normColor('hsl(400, 80%, 50%)')).toBe('hsl(40 80% 50%)');
	});

	it('clamps saturation and lightness', () => {
		expect(normColor('hsl(120, 120%, 150%)')).toBe('hsl(120 100% 100%)');
	});

	it('converts hex #RRGGBB', () => {
		expect(normColor('#ff0000')).toBe('hsl(0 100% 50%)');
	});

	it('converts hex #RGB shorthand', () => {
		expect(normColor('#f00')).toBe('hsl(0 100% 50%)');
	});

	it('converts hex #RRGGBBAA (discards alpha)', () => {
		expect(normColor('#ff000080')).toBe('hsl(0 100% 50%)');
	});

	it('converts rgb()', () => {
		expect(normColor('rgb(255, 0, 0)')).toBe('hsl(0 100% 50%)');
	});

	it('converts rgba() and discards alpha', () => {
		expect(normColor('rgba(255, 0, 0, 0.5)')).toBe('hsl(0 100% 50%)');
	});

	it('falls back to red default for garbage input', () => {
		expect(normColor('banana')).toBe('hsl(0 80% 50%)');
	});

	it('falls back to red default for empty string', () => {
		expect(normColor('')).toBe('hsl(0 80% 50%)');
	});

	it('converts green hex correctly', () => {
		expect(normColor('#00ff00')).toBe('hsl(120 100% 50%)');
	});

	it('converts blue hex correctly', () => {
		expect(normColor('#0000ff')).toBe('hsl(240 100% 50%)');
	});
});
