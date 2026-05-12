import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	getUserIdFromAuthorization,
	recordAiImportEvent,
} from '$lib/server/adminSupabase';

const QUESTION_TYPES = [
	'standard',
	'boolean',
	'rank',
	'chooseBetween',
	'colors',
	'numbers',
	'centuryDecade',
];

const OPTION_IMAGE_LAYOUT = [
	[0.472, 0.265],
	[0.607, 0.329],
	[0.691, 0.415],
	[0.69, 0.555],
	[0.606, 0.635],
	[0.474, 0.694],
	[0.332, 0.663],
	[0.272, 0.551],
	[0.262, 0.433],
	[0.341, 0.312],
];

const schema = {
	type: 'object',
	additionalProperties: false,
	propertyOrdering: [
		'type',
		'question_text',
		'question_number',
		'options_json',
		'correct_answers_json',
		'confidence',
		'warnings',
	],
	required: [
		'type',
		'question_text',
		'question_number',
		'options_json',
		'correct_answers_json',
		'confidence',
		'warnings',
	],
	properties: {
		type: {
			type: 'string',
			enum: QUESTION_TYPES,
			description: 'Detected Clever 11 question type.',
		},
		question_text: {
			type: 'string',
			description: 'The main question text printed on the card.',
		},
		question_number: {
			type: ['integer', 'null'],
			description:
				'The small printed card number, usually in the bottom-right corner.',
		},
		options_json: {
			type: 'array',
			description:
				'The 10 visible answer prompts/options in printed order.',
			minItems: 10,
			maxItems: 10,
			items: { type: 'string' },
		},
		correct_answers_json: {
			type: 'array',
			description:
				'The 10 correct answers, one for each option in options_json.',
			minItems: 10,
			maxItems: 10,
			items: {
				anyOf: [
					{ type: 'string' },
					{ type: 'number' },
					{ type: 'boolean' },
					{
						type: 'object',
						additionalProperties: false,
						required: ['text', 'backgroundColor'],
						properties: {
							text: { type: 'string' },
							backgroundColor: { type: 'string' },
						},
					},
				],
			},
		},
		confidence: {
			type: 'object',
			additionalProperties: false,
			propertyOrdering: [
				'type',
				'question_text',
				'question_number',
				'options',
				'correct_answers',
			],
			required: [
				'type',
				'question_text',
				'question_number',
				'options',
				'correct_answers',
			],
			properties: {
				type: { type: 'number', minimum: 0, maximum: 1 },
				question_text: { type: 'number', minimum: 0, maximum: 1 },
				question_number: { type: 'number', minimum: 0, maximum: 1 },
				options: { type: 'number', minimum: 0, maximum: 1 },
				correct_answers: { type: 'number', minimum: 0, maximum: 1 },
			},
		},
		warnings: {
			type: 'array',
			items: { type: 'string' },
		},
	},
};

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const requestId = randomUUID();
	const startedAt = Date.now();
	const model = env.GEMINI_CARD_IMPORT_MODEL || 'gemini-3-flash-preview';
	const baseEvent = {
		request_id: requestId,
		model,
		status: 'error',
	};

	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		const errorMessage = 'GEMINI_API_KEY is not configured.';
		await logAndRecord({
			...baseEvent,
			duration_ms: elapsedSince(startedAt),
			error_message: errorMessage,
		});
		return json(
			{ error: errorMessage, request_id: requestId },
			{ status: 500 },
		);
	}

	try {
		const body = await request.json();
		const image = body?.image;
		const monitoringContext = {
			deck_id: toUuid(body?.deckId),
			file_name: toOptionalString(body?.fileName, 255),
			user_id: await getUserIdFromAuthorization(
				request.headers.get('authorization'),
			),
		};
		if (!isDataUrl(image)) {
			const errorMessage = 'Expected a JSON body with an image data URL.';
			await logAndRecord({
				...baseEvent,
				...monitoringContext,
				duration_ms: elapsedSince(startedAt),
				error_message: errorMessage,
			});
			return json(
				{ error: errorMessage, request_id: requestId },
				{ status: 400 },
			);
		}

		const imageInfo = getImageInfo(image);
		const [draftResult, optionImagesResult] = await Promise.all([
			measureAsync(() => extractCard(apiKey, image, model)),
			measureAsync(() =>
				extractOptionImages(image).catch((error) =>
					createFailedOptionImages(
						error instanceof Error
							? error.message
							: 'Could not extract option images.',
					),
				),
			),
		]);

		const optionImages =
			optionImagesResult.status === 'fulfilled'
				? optionImagesResult.value
				: createFailedOptionImages(
						optionImagesResult.reason instanceof Error
							? optionImagesResult.reason.message
							: 'Could not extract option images.',
					);
		if (draftResult.status === 'rejected') {
			const errorMessage =
				draftResult.reason instanceof Error
					? draftResult.reason.message
					: 'Failed to extract card.';
			await logAndRecord({
				...baseEvent,
				...monitoringContext,
				...imageInfo,
				duration_ms: elapsedSince(startedAt),
				gemini_duration_ms: draftResult.durationMs,
				crop_duration_ms: optionImagesResult.durationMs,
				option_image_warnings: collectOptionImageWarnings(optionImages),
				error_message: errorMessage,
			});
			return json(
				{ error: errorMessage, request_id: requestId },
				{ status: 500 },
			);
		}

		const draft = draftResult.value;
		const event = {
			...baseEvent,
			...monitoringContext,
			...imageInfo,
			status: 'success',
			duration_ms: elapsedSince(startedAt),
			gemini_duration_ms: draftResult.durationMs,
			crop_duration_ms: optionImagesResult.durationMs,
			question_type: toOptionalString(draft.type, 64),
			question_number: Number.isInteger(draft.question_number)
				? draft.question_number
				: null,
			confidence: draft.confidence ?? null,
			warnings: toStringArray(draft.warnings),
			option_image_warnings: collectOptionImageWarnings(optionImages),
		};
		await logAndRecord(event);
		return json({
			...draft,
			option_images: optionImages,
			request_id: requestId,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to extract card.';
		await logAndRecord({
			...baseEvent,
			duration_ms: elapsedSince(startedAt),
			error_message: errorMessage,
		});
		return json(
			{ error: errorMessage, request_id: requestId },
			{ status: 500 },
		);
	}
}

/**
 * @param {string} image
 */
async function extractOptionImages(image) {
	const { data } = parseDataUrl(image);
	const source = Buffer.from(data, 'base64');
	const rotated = await sharp(source).rotate().toBuffer();
	const metadata = await sharp(rotated).metadata();
	const width = metadata.width ?? 0;
	const height = metadata.height ?? 0;
	if (!width || !height) {
		return createFailedOptionImages('Could not read image dimensions.');
	}

	const size = Math.min(width, height);
	const cropWidth = Math.round(size * 0.15);
	const cropHeight = Math.round(size * 0.11);

	return Promise.all(
		Array.from({ length: 10 }, async (_, index) => {
			const [xRatio, yRatio] = OPTION_IMAGE_LAYOUT[index];
			const left = clamp(
				Math.round(width * xRatio - cropWidth / 2),
				0,
				Math.max(0, width - cropWidth),
			);
			const top = clamp(
				Math.round(height * yRatio - cropHeight / 2),
				0,
				Math.max(0, height - cropHeight),
			);

			try {
				const buffer = await sharp(rotated)
					.extract({
						left,
						top,
						width: cropWidth,
						height: cropHeight,
					})
					.resize({
						width: 384,
						height: 256,
						fit: 'inside',
						withoutEnlargement: true,
					})
					.normalize()
					.flatten({ background: '#ffffff' })
					.webp({ quality: 78, effort: 4 })
					.toBuffer();
				const out = await sharp(buffer).metadata();
				return {
					dataUrl: `data:image/webp;base64,${buffer.toString('base64')}`,
					width: out.width ?? 0,
					height: out.height ?? 0,
					warnings: [],
				};
			} catch (error) {
				return {
					dataUrl: '',
					width: 0,
					height: 0,
					warnings: [
						error instanceof Error
							? error.message
							: `Could not crop option ${index + 1}.`,
					],
				};
			}
		}),
	);
}

/** @param {string} message */
function createFailedOptionImages(message) {
	return Array.from({ length: 10 }, () => ({
		dataUrl: '',
		width: 0,
		height: 0,
		warnings: [message],
	}));
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/**
 * @param {string} apiKey
 * @param {string} image
 * @param {string} model
 */
async function extractCard(apiKey, image, model) {
	const { mimeType, data } = parseDataUrl(image);
	const geminiResponse = await fetch(
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
						parts: [
							{
								text: buildPrompt(),
							},
							{
								inlineData: {
									mimeType,
									data,
								},
							},
						],
					},
				],
				generationConfig: {
					temperature: 0.1,
					responseMimeType: 'application/json',
					responseJsonSchema: schema,
				},
			}),
		},
	);

	const json = await geminiResponse.json();
	if (!geminiResponse.ok) {
		throw new Error(
			json?.error?.message || 'The extraction model request failed.',
		);
	}

	const text = findOutputText(json);
	if (!text) throw new Error('Gemini did not return JSON.');
	return JSON.parse(text);
}

function buildPrompt() {
	return [
		'Extract one Clever 11-style physical card into the exact JSON schema.',
		'The app stores every card as one question with exactly 10 option labels and exactly 10 corresponding correct answers.',
		'Many cards use a radial "hub" layout: a central bubble with question_text; around it two rings of labels joined by radial lines (spokes) from center outward.',
		'Spatial rule for that layout: labels on the INNER band (closer to the center question) are options_json. Labels on the OUTER band (toward the card edge) are correct_answers_json. Each spoke pairs one inner label with one outer label—never swap an inner and outer label between the two arrays.',
		"Order: read both rings clockwise starting at top center (12 o'clock). options_json[i] must be the inner label at spoke i; correct_answers_json[i] must be the outer label on the SAME spoke as that inner label.",
		'If the card is not radial, infer options as the 10 items the player chooses among (themes, prompts, entities); correct_answers_json are what satisfies question_text for each option—not the reverse.',
		'Detect the question type from the card layout and wording. Use only these type values: standard, boolean, rank, chooseBetween, colors, numbers, centuryDecade.',
		'Put the visible prompt in question_text. Put the small bottom-right card number in question_number, or null if unreadable.',
		'For options_json, return the 10 inner/choice labels in printed order (clockwise from top center). If both rings carry similar noun phrases (e.g. places vs events), rely on proximity to hub vs edge, not on topic semantics.',
		'For correct_answers_json, return one answer per option in the same order as options_json. Use booleans for boolean cards, numbers for rank and numbers cards, strings for standard, chooseBetween, and centuryDecade cards.',
		'For colors, return objects like {"text":"red","backgroundColor":"hsl(0 80% 50%)"}. Estimate HSL from the visible color if needed.',
		'If text is uncertain, make the best attempt and add a concise warning. Never invent extra options.',
	].join('\n');
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 */
async function measureAsync(operation) {
	const startedAt = Date.now();
	try {
		return {
			status: /** @type {'fulfilled'} */ ('fulfilled'),
			value: await operation(),
			durationMs: elapsedSince(startedAt),
		};
	} catch (error) {
		return {
			status: /** @type {'rejected'} */ ('rejected'),
			reason: error,
			durationMs: elapsedSince(startedAt),
		};
	}
}

/** @param {number} startedAt */
function elapsedSince(startedAt) {
	return Date.now() - startedAt;
}

/** @param {string} image */
function getImageInfo(image) {
	const { mimeType, data } = parseDataUrl(image);
	return {
		image_mime: mimeType,
		image_bytes: Buffer.byteLength(data, 'base64'),
	};
}

/** @param {unknown} value */
function toUuid(value) {
	return typeof value === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value,
		)
		? value
		: null;
}

/**
 * @param {unknown} value
 * @param {number} maxLength
 */
function toOptionalString(value, maxLength) {
	return typeof value === 'string' && value.trim()
		? value.trim().slice(0, maxLength)
		: null;
}

/** @param {unknown} value */
function toStringArray(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === 'string' && item.trim())
				.map((item) => item.trim())
		: [];
}

/** @param {{ warnings: string[] }[]} optionImages */
function collectOptionImageWarnings(optionImages) {
	return optionImages
		.map((image, index) => ({
			index,
			warnings: toStringArray(image.warnings),
		}))
		.filter((item) => item.warnings.length > 0);
}

/** @param {Record<string, unknown>} event */
async function logAndRecord(event) {
	const log = {
		event: 'ai_import_extraction',
		...event,
	};
	const message = JSON.stringify(log);
	if (event.status === 'success') {
		console.info(message);
	} else {
		console.error(message);
	}
	await recordAiImportEvent(event);
}

/**
 * @param {unknown} value
 */
function isDataUrl(value) {
	return (
		typeof value === 'string' &&
		/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i.test(value)
	);
}

/**
 * @param {string} dataUrl
 */
function parseDataUrl(dataUrl) {
	const match = dataUrl.match(
		/^data:(image\/(?:png|jpe?g|webp|heic|heif));base64,(.+)$/i,
	);
	if (!match) throw new Error('Invalid image data URL.');
	return {
		mimeType: match[1].toLowerCase(),
		data: match[2],
	};
}

/**
 * @param {any} json
 */
function findOutputText(json) {
	for (const candidate of json.candidates ?? []) {
		for (const part of candidate.content?.parts ?? []) {
			if (typeof part.text === 'string') return part.text;
		}
	}
	return '';
}
