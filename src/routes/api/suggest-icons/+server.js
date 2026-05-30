import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { resolveSuggestedIcons } from '$lib/deckIcons.js';

// We over-request candidates so hallucinated/unknown names dropped by
// resolveSuggestedIcons don't starve the final 6-icon result.
const CANDIDATE_COUNT = 10;
const RESULT_LIMIT = 6;
const MAX_QUERY_LENGTH = 80;

const schema = {
	type: 'object',
	additionalProperties: false,
	required: ['icons'],
	properties: {
		icons: {
			type: 'array',
			description:
				'Lucide icon names most related to the query, ranked best-first.',
			minItems: 0,
			maxItems: CANDIDATE_COUNT,
			items: { type: 'string' },
		},
	},
};

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		return json(
			{ error: 'GEMINI_API_KEY is not configured.' },
			{ status: 500 },
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Expected a JSON body.' }, { status: 400 });
	}
	let query = typeof body?.query === 'string' ? body.query.trim() : '';
	if (query.length < 2) {
		return json({ error: 'Query is too short.' }, { status: 400 });
	}
	query = query.slice(0, MAX_QUERY_LENGTH);

	const model = env.GEMINI_ICON_SUGGEST_MODEL || 'gemini-flash-lite-latest';

	try {
		const names = await suggestIconNames(apiKey, model, query);
		const icons = resolveSuggestedIcons(names, RESULT_LIMIT);
		return json({ icons });
	} catch (/** @type {any} */ err) {
		console.error('[suggest-icons] failed', {
			query,
			model,
			error: err?.message,
		});
		return json(
			{ error: err?.message || 'Failed to suggest icons.' },
			{ status: 502 },
		);
	}
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {string} query
 * @returns {Promise<string[]>}
 */
async function suggestIconNames(apiKey, model, query) {
	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
		{
			method: 'POST',
			headers: {
				'x-goog-api-key': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [
					{
						role: 'user',
						parts: [{ text: buildPrompt(query) }],
					},
				],
				generationConfig: {
					temperature: 0.2,
					responseMimeType: 'application/json',
					responseJsonSchema: schema,
				},
			}),
		},
	);

	const data = await response.json();
	if (!response.ok) {
		throw new Error(
			data?.error?.message || 'The icon suggestion model request failed.',
		);
	}

	const text = findOutputText(data);
	if (!text) throw new Error('Gemini did not return JSON.');
	const parsed = JSON.parse(text);
	return Array.isArray(parsed?.icons) ? parsed.icons : [];
}

/** @param {string} query */
function buildPrompt(query) {
	return [
		'You map a search phrase to icons in the Lucide icon library (lucide.dev).',
		`Return the ${CANDIDATE_COUNT} Lucide icon names most semantically related to this search: "${query}".`,
		'Rank them best match first. Consider synonyms, related concepts, and metaphors a designer would reach for.',
		'Use exact Lucide icon names in kebab-case (e.g. "alarm-clock", "rotate-cw", "party-popper"). Do not invent names that are not real Lucide icons.',
		'Return only the JSON object with the "icons" array — no commentary.',
	].join('\n');
}

/** @param {any} data */
function findOutputText(data) {
	for (const candidate of data.candidates ?? []) {
		for (const part of candidate.content?.parts ?? []) {
			if (typeof part.text === 'string') return part.text;
		}
	}
	return '';
}
