import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { setupI18n } from '$lib/i18n';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	// Initialize i18n before rendering
	setupI18n();

	const supabase = createBrowserClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
		{
			global: {
				fetch
			},
			cookies: {
				getAll() {
					if (!isBrowser()) {
						// On server, we return the session from layout.server.js if it exists
						return data.session ? [{ name: 'sb-auth-token', value: JSON.stringify(data.session) }] : [];
					}

					const cookies = document.cookie.split(';').reduce((acc, cookie) => {
						const [name, ...value] = cookie.split('=');
						if (name) {
							const trimmedName = name.trim();
							// Only decode if there is a value
							const val = value.length > 0 ? decodeURIComponent(value.join('=')) : '';
							acc.push({ name: trimmedName, value: val });
						}
						return acc;
					}, []);

					return cookies;
				},
				setAll(cookiesToSet) {
					if (!isBrowser()) return;
					cookiesToSet.forEach(({ name, value, options }) => {
						// IMPORTANT: Values must be encoded for document.cookie
						let cookieString = `${name}=${encodeURIComponent(value)}`;

						if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
						if (options.domain) cookieString += `; domain=${options.domain}`;

						const path = options.path || '/';
						cookieString += `; path=${path}`;

						if (options.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
						if (options.secure) cookieString += '; secure';
						if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;

						document.cookie = cookieString;
					});
				}
			}
		}
	);

	/**
	 * It's important to use getSession() here to initialize the client state.
	 * getUser() can be called later or in specific guards for extra security.
	 */
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return { supabase, session };
};
