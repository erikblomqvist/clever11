import { describe, it, expect } from 'vitest';
import {
	SOFT_HYPHEN,
	textNeedsBreakHints,
	findLongTokens,
	findTokensNeedingBreakHints,
	questionMatchesBreakHintsFilter,
	SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
	SOFT_HYPHEN_THRESHOLD_OPTION,
} from './softHyphens.js';

describe('textNeedsBreakHints', () => {
	it('ignores short tokens', () => {
		expect(
			textNeedsBreakHints(
				'short words only',
				SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
			),
		).toBe(false);
	});

	it('flags a long unbroken token', () => {
		expect(
			textNeedsBreakHints(
				'ambassadörsdottern',
				SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
			),
		).toBe(true);
	});

	it('does not flag hyphenated compounds when each segment is short', () => {
		expect(
			textNeedsBreakHints(
				'Thailand-korv',
				SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
			),
		).toBe(false);
	});

	it('flags when a hyphen segment is still too long', () => {
		expect(
			textNeedsBreakHints(
				'Thailand-ambassadörsdottern',
				SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
			),
		).toBe(true);
	});

	it('treats a segment with any soft hyphen as done', () => {
		const word = `ambassad${SOFT_HYPHEN}örsdottern`;
		expect(
			textNeedsBreakHints(word, SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT),
		).toBe(false);
	});

	it('uses a higher threshold for options', () => {
		const twelve = 'abcdefghijkl';
		expect(
			textNeedsBreakHints(twelve, SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT),
		).toBe(true);
		expect(textNeedsBreakHints(twelve, SOFT_HYPHEN_THRESHOLD_OPTION)).toBe(
			false,
		);
		const thirteen = 'abcdefghijklm';
		expect(
			textNeedsBreakHints(thirteen, SOFT_HYPHEN_THRESHOLD_OPTION),
		).toBe(true);
	});
});

describe('findLongTokens', () => {
	it('returns offset for the full whitespace token', () => {
		const text = 'See Thailand-ambassadörsdottern here';
		const hits = findLongTokens(text, SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT);
		expect(hits).toHaveLength(1);
		expect(hits[0].text).toBe('Thailand-ambassadörsdottern');
		expect(hits[0].offset).toBe(4);
	});

	it('keeps a long token visible after a soft hyphen is inserted', () => {
		const word = `ambassad${SOFT_HYPHEN}örsdottern`;
		expect(
			findLongTokens(word, SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT),
		).toHaveLength(1);
		expect(
			findTokensNeedingBreakHints(
				word,
				SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
			),
		).toHaveLength(0);
	});
});

describe('questionMatchesBreakHintsFilter', () => {
	it('scopes to question text only', () => {
		expect(
			questionMatchesBreakHintsFilter(
				'ambassadörsdottern',
				['short'],
				'question',
			),
		).toBe(true);
		expect(
			questionMatchesBreakHintsFilter(
				'short',
				['abcdefghijklm'],
				'question',
			),
		).toBe(false);
	});

	it('scopes to options only', () => {
		expect(
			questionMatchesBreakHintsFilter(
				'short',
				['abcdefghijklm'],
				'options',
			),
		).toBe(true);
	});

	it('either matches question or options', () => {
		expect(
			questionMatchesBreakHintsFilter(
				'short',
				['abcdefghijklm'],
				'either',
			),
		).toBe(true);
		expect(
			questionMatchesBreakHintsFilter('short', ['short'], 'either'),
		).toBe(false);
	});
});
