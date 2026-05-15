import { env } from '$env/dynamic/private';

const MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONS = 768;

/** @param {number[]} values */
function normalize(values) {
	let sumSquares = 0;
	for (const v of values) sumSquares += v * v;
	const norm = Math.sqrt(sumSquares);
	if (norm === 0) return values;
	return values.map((v) => v / norm);
}

/**
 * Generate a 768-dimension embedding for an inbox note.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embed(text) {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
		{
			method: 'POST',
			headers: {
				'x-goog-api-key': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: `models/${MODEL}`,
				content: { parts: [{ text }] },
				outputDimensionality: OUTPUT_DIMENSIONS,
			}),
		},
	);
	const json = await res.json();
	if (!res.ok) {
		throw new Error(json?.error?.message || 'Gemini embed request failed.');
	}
	const values = json?.embedding?.values;
	if (!Array.isArray(values) || values.length !== OUTPUT_DIMENSIONS) {
		throw new Error(
			`Gemini did not return a ${OUTPUT_DIMENSIONS}-dimension embedding.`,
		);
	}
	// Google recommends re-normalizing MRL-truncated embeddings (any output dim < 3072).
	return normalize(values);
}
