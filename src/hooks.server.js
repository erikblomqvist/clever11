import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} from '$env/static/public';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return event.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) =>
						event.cookies.set(name, value, {
							...options,
							path: '/',
						}),
					);
				},
			},
		},
	);

	/**
	 * A convenience helper so we can just call await getSession() instead of
	 * the more verbose await event.locals.supabase.auth.getSession()
	 */
	event.locals.getSession = async () => {
		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	// Auth guard for /admin and /inbox (incl. /api/inbox)
	const path = event.url.pathname;
	const needsAuth =
		(path.startsWith('/admin') && path !== '/admin/login') ||
		path.startsWith('/inbox') ||
		path.startsWith('/api/inbox');
	if (needsAuth) {
		// Use getUser() for security as it validates the session with the Supabase API
		const { data, error: authError } =
			await event.locals.supabase.auth.getUser();
		const user = data?.user ?? null;

		// If the refresh token is missing or invalid, sign out so the stale
		// session cookies are cleared. Otherwise the bad cookies linger and
		// every subsequent request re-throws the same auth error.
		if (!user && authError?.code === 'refresh_token_not_found') {
			await event.locals.supabase.auth.signOut();
		}

		if (!user) {
			if (path.startsWith('/api/')) {
				return new Response('unauthenticated', { status: 401 });
			}
			throw redirect(303, '/admin/login');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		},
	});
};
