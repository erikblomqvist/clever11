import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

	// Auth guard for /admin
	if (
		event.url.pathname.startsWith('/admin') &&
		event.url.pathname !== '/admin/login'
	) {
		// Use getUser() for security as it validates the session with the Supabase API
		const {
			data: { user },
		} = await event.locals.supabase.auth.getUser();
		if (!user) {
			throw redirect(303, '/admin/login');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		},
	});
};
