import { json, error } from '@sveltejs/kit';
import { createIssue } from '$lib/server/inbox/github.js';

const MAX_BODY = 8000;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	const {
		data: { user },
	} = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'unauthenticated');

	let payload;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'invalid json');
	}

	const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
	if (!body) throw error(400, 'body required');
	if (body.length > MAX_BODY) throw error(400, 'body too long');

	const title = 'Untriaged: ' + body.slice(0, 60).replace(/\s+/g, ' ').trim();

	const issue = await createIssue({
		title,
		body,
		labels: ['needs-triage'],
	});

	return json({ number: issue.number });
}
