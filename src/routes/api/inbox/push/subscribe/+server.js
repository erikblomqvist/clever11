import { json, error } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/adminSupabase.js';

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

	const endpoint =
		typeof payload?.endpoint === 'string' ? payload.endpoint.trim() : '';
	const p256dh =
		typeof payload?.p256dh === 'string' ? payload.p256dh.trim() : '';
	const auth = typeof payload?.auth === 'string' ? payload.auth.trim() : '';
	const userAgent =
		typeof payload?.user_agent === 'string'
			? payload.user_agent.slice(0, 500)
			: null;

	if (!endpoint || !p256dh || !auth) {
		throw error(400, 'endpoint, p256dh, and auth are required');
	}

	const supabase = getSupabaseAdmin();
	if (!supabase) throw error(500, 'Supabase admin client not configured.');

	const { error: upsertError } = await supabase
		.from('inbox_push_subscriptions')
		.upsert(
			{
				user_id: user.id,
				endpoint,
				p256dh,
				auth,
				user_agent: userAgent,
			},
			{ onConflict: 'endpoint' },
		);
	if (upsertError) throw error(500, upsertError.message);

	return json({ ok: true });
}
