/** U+00AD — invisible until the browser wraps at that point. */
export const SOFT_HYPHEN = '\u00ad';

/**
 * Min letter count (after stripping soft hyphens) before a segment may need
 * break hints in question text (more horizontal room than wheel options).
 */
export const SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT = 11;

/**
 * Min letter count for option labels on the 10-option wheel (.answer-text).
 * Keep in sync with `scripts/hyphenation/` discovery queries.
 */
export const SOFT_HYPHEN_THRESHOLD_OPTION = 13;

/** @typedef {'question' | 'options' | 'either'} BreakHintsFilterScope */

/**
 * @param {string} segment
 * @param {number} threshold
 */
function segmentIsLong(segment, threshold) {
	return segment.replaceAll(SOFT_HYPHEN, '').length >= threshold;
}

/**
 * @param {string} segment
 * @param {number} threshold
 */
function segmentNeedsBreakHints(segment, threshold) {
	return segmentIsLong(segment, threshold) && !segment.includes(SOFT_HYPHEN);
}

/**
 * @param {string} token Whitespace-delimited token (may contain `-`).
 * @param {number} threshold
 */
function tokenHasLongSegment(token, threshold) {
	return token.split('-').some((part) => segmentIsLong(part, threshold));
}

/**
 * @param {string} token Whitespace-delimited token (may contain `-`).
 * @param {number} threshold
 */
function tokenNeedsBreakHints(token, threshold) {
	return token
		.split('-')
		.some((part) => segmentNeedsBreakHints(part, threshold));
}

/**
 * True when any whitespace token has a hyphen-separated segment at or above
 * `threshold` with no soft hyphen yet.
 *
 * @param {string} text
 * @param {number} threshold
 */
export function textNeedsBreakHints(text, threshold) {
	if (!text) return false;
	const regex = /\S+/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		if (tokenNeedsBreakHints(match[0], threshold)) return true;
	}
	return false;
}

/**
 * Long tokens for the break-hints editor — stays visible after the first
 * soft hyphen so more breakpoints can be added (see `textNeedsBreakHints`
 * for triage filters).
 *
 * @param {string} text
 * @param {number} threshold
 * @returns {{ text: string, offset: number }[]}
 */
export function findLongTokens(text, threshold) {
	if (!text) return [];
	/** @type {{ text: string, offset: number }[]} */
	const result = [];
	const regex = /\S+/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		if (tokenHasLongSegment(match[0], threshold)) {
			result.push({ text: match[0], offset: match.index });
		}
	}
	return result;
}

/**
 * @param {string} text
 * @param {number} threshold
 * @returns {{ text: string, offset: number }[]}
 */
export function findTokensNeedingBreakHints(text, threshold) {
	if (!text) return [];
	/** @type {{ text: string, offset: number }[]} */
	const result = [];
	const regex = /\S+/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		if (tokenNeedsBreakHints(match[0], threshold)) {
			result.push({ text: match[0], offset: match.index });
		}
	}
	return result;
}

/**
 * @param {string} questionText
 * @param {unknown} optionsJson
 * @param {BreakHintsFilterScope} scope
 */
export function questionMatchesBreakHintsFilter(
	questionText,
	optionsJson,
	scope,
) {
	const questionHit = textNeedsBreakHints(
		questionText,
		SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT,
	);
	if (scope === 'question') return questionHit;

	const options = Array.isArray(optionsJson) ? optionsJson : [];
	const optionHit = options.some(
		(o) =>
			typeof o === 'string' &&
			textNeedsBreakHints(o, SOFT_HYPHEN_THRESHOLD_OPTION),
	);
	if (scope === 'options') return optionHit;
	return questionHit || optionHit;
}
