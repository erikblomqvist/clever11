export const NUM_IMPORT_BLOBS = 10;

export const IMPORT_QUESTION_TYPES = [
	'standard',
	'boolean',
	'rank',
	'chooseBetween',
	'colors',
	'numbers',
	'centuryDecade',
];

/** @type {import('$lib/data/questionTypes.js').QuestionType} */
export const DEFAULT_IMPORT_TYPE = 'standard';

export function createEmptyImportDraft() {
	return normalizeImportDraft({});
}

/**
 * @param {unknown} raw
 * @returns {{
 *   type: import('$lib/data/questionTypes.js').QuestionType,
 *   question_text: string,
 *   question_number: number|null,
 *   options_json: string[],
 *   correct_answers_json: any[],
 *   confidence: Record<string, number>,
 *   warnings: string[]
 * }}
 */
export function normalizeImportDraft(raw) {
	const source = raw && typeof raw === 'object' ? /** @type {Record<string, any>} */ (raw) : {};
	const type = IMPORT_QUESTION_TYPES.includes(source.type) ? source.type : DEFAULT_IMPORT_TYPE;
	const options = normalizeStringArray(source.options_json);
	const answers = normalizeAnswers(type, source.correct_answers_json);

	return {
		type,
		question_text: typeof source.question_text === 'string' ? source.question_text.trim() : '',
		question_number: normalizeQuestionNumber(source.question_number),
		options_json: options,
		correct_answers_json: answers,
		confidence: normalizeConfidence(source.confidence),
		warnings: Array.isArray(source.warnings) ? source.warnings.map(String).filter(Boolean) : [],
	};
}

/**
 * @param {ReturnType<typeof normalizeImportDraft>} draft
 */
export function validateImportDraft(draft) {
	const errors = [];
	if (!IMPORT_QUESTION_TYPES.includes(draft.type)) errors.push('Choose a valid question type.');
	if (!draft.question_text.trim()) errors.push('Question text is required.');
	if (draft.options_json.length !== NUM_IMPORT_BLOBS) errors.push('Exactly 10 options are required.');
	if (draft.options_json.some((option) => !String(option).trim())) {
		errors.push('All 10 options must be filled in.');
	}
	if (draft.correct_answers_json.length !== NUM_IMPORT_BLOBS) {
		errors.push('Exactly 10 correct answers are required.');
	}

	draft.correct_answers_json.forEach((answer, index) => {
		const label = `Answer ${index + 1}`;
		if (draft.type === 'boolean' && typeof answer !== 'boolean') {
			errors.push(`${label} must be yes or no.`);
		}
		if (draft.type === 'rank' && (!Number.isInteger(Number(answer)) || Number(answer) < 1 || Number(answer) > 10)) {
			errors.push(`${label} must be a rank from 1 to 10.`);
		}
		if (draft.type === 'numbers' && (answer === '' || Number.isNaN(Number(answer)))) {
			errors.push(`${label} must be a number.`);
		}
		if (draft.type === 'colors') {
			if (!answer || typeof answer !== 'object') {
				errors.push(`${label} must include a color label and background.`);
			} else if (!String(answer.text ?? '').trim()) {
				errors.push(`${label} color label is required.`);
			} else if (!String(answer.backgroundColor ?? '').trim()) {
				errors.push(`${label} background color is required.`);
			}
		}
		if (['standard', 'chooseBetween', 'centuryDecade'].includes(draft.type) && !String(answer ?? '').trim()) {
			errors.push(`${label} is required.`);
		}
	});

	return [...new Set(errors)];
}

/**
 * @param {ReturnType<typeof normalizeImportDraft>} draft
 * @param {string} deckId
 */
export function toQuestionInsertPayload(draft, deckId) {
	return {
		deck_id: deckId,
		type: draft.type,
		question_text: draft.question_text.trim(),
		question_number: draft.question_number,
		options_json: draft.options_json.map((option) => option.trim()),
		correct_answers_json: normalizeAnswers(draft.type, draft.correct_answers_json),
		answer_media_json: Array(NUM_IMPORT_BLOBS).fill(null).map(() => ({})),
	};
}

/**
 * @param {import('$lib/data/questionTypes.js').QuestionType} type
 */
export function defaultAnswerForType(type) {
	if (type === 'boolean') return false;
	if (type === 'rank' || type === 'numbers') return 0;
	if (type === 'colors') return { text: '', backgroundColor: 'hsl(0 80% 50%)' };
	return '';
}

/**
 * @param {unknown} value
 */
function normalizeStringArray(value) {
	const array = Array.isArray(value) ? value : [];
	return Array.from({ length: NUM_IMPORT_BLOBS }, (_, index) => String(array[index] ?? '').trim());
}

/**
 * @param {import('$lib/data/questionTypes.js').QuestionType} type
 * @param {unknown} value
 */
export function normalizeAnswers(type, value) {
	const array = Array.isArray(value) ? value : [];
	return Array.from({ length: NUM_IMPORT_BLOBS }, (_, index) => normalizeAnswer(type, array[index]));
}

/**
 * @param {import('$lib/data/questionTypes.js').QuestionType} type
 * @param {unknown} value
 */
function normalizeAnswer(type, value) {
	if (type === 'boolean') {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'string') return ['true', 'yes', 'ja', 'riktig', 'correct'].includes(value.trim().toLowerCase());
		return Boolean(value);
	}
	if (type === 'rank') {
		const number = Number(value);
		return Number.isFinite(number) ? number : 0;
	}
	if (type === 'numbers') {
		const number = Number(value);
		return Number.isFinite(number) ? number : 0;
	}
	if (type === 'colors') {
		if (value && typeof value === 'object') {
			const answer = /** @type {Record<string, any>} */ (value);
			return {
				text: String(answer.text ?? answer.label ?? '').trim(),
				backgroundColor: normalizeBackgroundColor(answer.backgroundColor ?? answer.color),
			};
		}
		return { text: String(value ?? '').trim(), backgroundColor: 'hsl(0 80% 50%)' };
	}
	return String(value ?? '').trim();
}

/**
 * @param {unknown} value
 */
function normalizeBackgroundColor(value) {
	const DEFAULT = 'hsl(0 80% 50%)';
	const color = String(value ?? '').trim();
	if (!color) return DEFAULT;
	const parsed = parseHsl(color) ?? parseHex(color) ?? parseRgb(color);
	if (!parsed) return DEFAULT;
	const h = Math.round(((parsed.h % 360) + 360) % 360);
	const s = Math.round(Math.max(0, Math.min(100, parsed.s)));
	const l = Math.round(Math.max(0, Math.min(100, parsed.l)));
	return `hsl(${h} ${s}% ${l}%)`;
}

/** @param {string} color */
function parseHsl(color) {
	const match = color.match(/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i);
	if (!match) return null;
	return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

/** @param {string} color */
function parseHex(color) {
	const match = color.match(/^#([0-9a-f]{3,8})$/i);
	if (!match) return null;
	let hex = match[1];
	if (hex.length === 3 || hex.length === 4) {
		hex = hex
			.slice(0, 3)
			.split('')
			.map((c) => c + c)
			.join('');
	} else if (hex.length === 6 || hex.length === 8) {
		hex = hex.slice(0, 6);
	} else {
		return null;
	}
	return rgbToHsl(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
}

/** @param {string} color */
function parseRgb(color) {
	const match = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i);
	if (!match) return null;
	return rgbToHsl(Number(match[1]), Number(match[2]), Number(match[3]));
}

function rgbToHsl(r, g, b) {
	r = Math.max(0, Math.min(255, r)) / 255;
	g = Math.max(0, Math.min(255, g)) / 255;
	b = Math.max(0, Math.min(255, b)) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * @param {unknown} value
 */
function normalizeQuestionNumber(value) {
	if (value === null || value === undefined || value === '') return null;
	const number = Number(value);
	return Number.isInteger(number) ? number : null;
}

/**
 * @param {unknown} value
 */
function normalizeConfidence(value) {
	const source = value && typeof value === 'object' ? /** @type {Record<string, any>} */ (value) : {};
	return {
		type: clampConfidence(source.type),
		question_text: clampConfidence(source.question_text),
		question_number: clampConfidence(source.question_number),
		options: clampConfidence(source.options),
		correct_answers: clampConfidence(source.correct_answers),
	};
}

/**
 * @param {unknown} value
 */
function clampConfidence(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.max(0, Math.min(1, number));
}
