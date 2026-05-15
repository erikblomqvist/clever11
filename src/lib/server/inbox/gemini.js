import { env } from '$env/dynamic/private';
import contextMd from '../../../../CONTEXT.md?raw';

const adrModules = /** @type {Record<string, string>} */ (
	import.meta.glob('../../../../docs/adr/*.md', {
		eager: true,
		query: '?raw',
		import: 'default',
	})
);

const MODEL = env.GEMINI_INBOX_MODEL || 'gemini-2.5-flash';

const schema = {
	type: 'object',
	additionalProperties: false,
	required: ['title', 'area', 'follow_up_question'],
	properties: {
		title: {
			type: 'string',
			description:
				'Concise GitHub issue title, 6 to 10 words, no leading prefix, no trailing punctuation.',
		},
		area: {
			type: 'array',
			items: { type: 'string' },
			description:
				'Zero or more area tags taken verbatim from the AREA MENU. Pick the most specific matches.',
		},
		follow_up_question: {
			type: 'string',
			description:
				'A single short question most likely to preserve context that would otherwise be lost in 12 hours.',
		},
	},
};

/**
 * Generate enrichment metadata for an inbox note.
 * @param {string} noteBody
 * @returns {Promise<{ title: string, area: string[], follow_up_question: string }>}
 */
export async function generateMetadata(noteBody) {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

	const menu = buildAreaMenu();
	const prompt = buildPrompt(noteBody, menu);

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
		{
			method: 'POST',
			headers: {
				'x-goog-api-key': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.2,
					responseMimeType: 'application/json',
					responseJsonSchema: schema,
				},
			}),
		},
	);
	const json = await res.json();
	if (!res.ok) {
		throw new Error(json?.error?.message || 'Gemini request failed.');
	}
	const text = findOutputText(json);
	if (!text) throw new Error('Gemini did not return JSON.');

	const parsed = JSON.parse(text);
	const menuSet = new Set(menu.map((m) => m.toLowerCase()));
	const area = Array.isArray(parsed.area)
		? parsed.area
				.filter((a) => typeof a === 'string' && a.trim())
				.map((a) => a.trim())
				.filter((a) => menuSet.has(a.toLowerCase()))
		: [];

	return {
		title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
		area,
		follow_up_question:
			typeof parsed.follow_up_question === 'string'
				? parsed.follow_up_question.trim()
				: '',
	};
}

function buildAreaMenu() {
	const headings = [];
	for (const line of contextMd.split('\n')) {
		const match = line.match(/^#{2,3}\s+(.+)$/);
		if (match) headings.push(match[1].trim());
	}
	const adrTitles = [];
	for (const content of Object.values(adrModules)) {
		const firstHeading = content
			.split('\n')
			.find((line) => line.startsWith('# '));
		if (firstHeading) {
			adrTitles.push(firstHeading.replace(/^#\s+/, '').trim());
		}
	}
	return Array.from(new Set([...headings, ...adrTitles]));
}

/**
 * @param {string} noteBody
 * @param {string[]} menu
 */
function buildPrompt(noteBody, menu) {
	return [
		'You are triaging a short ad-hoc capture from the developer of clever11, a Svelte-based digital adaptation of a trivia board game.',
		'Return JSON with three fields:',
		'- title: a 6–10 word GitHub issue title that names the idea or problem. No leading "Untriaged:" prefix, no trailing punctuation.',
		'- area: 0–3 tags drawn verbatim from the AREA MENU below. Pick the most specific matches; return an empty array if nothing in the menu fits.',
		'- follow_up_question: the one short question most likely to preserve context that would otherwise be lost in 12 hours. One sentence. Personal and specific to the note, not a generic prompt.',
		'',
		'AREA MENU (use these exact strings in `area`):',
		...menu.map((m) => `- ${m}`),
		'',
		'NOTE:',
		noteBody,
	].join('\n');
}

/**
 * Generate a short digest line (≤60 chars) describing the stale inbox queue
 * for a push notification body.
 *
 * @param {{ count: number, areaCounts: Record<string, number> }} input
 * @returns {Promise<string>}
 */
export async function generateDigestLine({ count, areaCounts }) {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

	const distribution =
		Object.entries(areaCounts)
			.sort((a, b) => b[1] - a[1])
			.map(([area, n]) => `${area}: ${n}`)
			.join(', ') || 'no tags';

	const prompt = [
		`You are writing a single push-notification phrase for ${count} stale inbox items waiting for triage.`,
		'Return ONE phrase, at most 60 characters, no quotes, no trailing punctuation.',
		'Group by area tag where it tightens the phrase; otherwise just give the count.',
		'',
		`Distribution: ${distribution}`,
		'',
		'Example: "3 wheel ideas + 1 podium tweak waiting"',
	].join('\n');

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
		{
			method: 'POST',
			headers: {
				'x-goog-api-key': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: { temperature: 0.4 },
			}),
		},
	);
	const json = await res.json();
	if (!res.ok) {
		throw new Error(
			json?.error?.message || 'Gemini digest request failed.',
		);
	}
	const text = findOutputText(json)
		.trim()
		.replace(/^["']|["']$/g, '');
	if (!text) {
		return `${count} inbox ${count === 1 ? 'item' : 'items'} waiting`;
	}
	return text.length > 60 ? text.slice(0, 60).trimEnd() : text;
}

/** @param {any} json */
function findOutputText(json) {
	for (const candidate of json.candidates ?? []) {
		for (const part of candidate.content?.parts ?? []) {
			if (typeof part.text === 'string') return part.text;
		}
	}
	return '';
}
