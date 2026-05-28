/* global Buffer */
import { json, error } from '@sveltejs/kit';
import { transcribeAudio } from '$lib/server/inbox/gemini.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	const {
		data: { user },
	} = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'unauthenticated');

	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('multipart/form-data')) {
		throw error(400, 'expected multipart/form-data');
	}

	const formData = await request.formData();
	const audio = formData.get('audio');
	if (!(audio instanceof File) || audio.size === 0) {
		throw error(400, 'audio file required');
	}

	const buffer = Buffer.from(await audio.arrayBuffer());
	const mimeType = audio.type || 'audio/webm;codecs=opus';

	try {
		const text = await transcribeAudio(buffer, mimeType);
		return json({ text });
	} catch (err) {
		console.error(
			JSON.stringify({
				event: 'transcription_failed',
				error: err instanceof Error ? err.message : String(err),
			}),
		);
		throw error(502, 'transcription failed');
	}
}
