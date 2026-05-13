import { createBrowserClient, isBrowser } from '@supabase/ssr';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

/**
 * Provides a unified Supabase client instance.
 *
 * In SvelteKit routes (+page.svelte, +layout.svelte), you should
 * prefer using the supabase client provided in the 'data' prop.
 *
 * This singleton ensures that background logic (like the game engine)
 * shares the same instance as the UI.
 */
export const getSupabaseClient = () => {
	if (client) return client;

	if (!url || !key) return null;

	client = createBrowserClient(url, key, {
		cookies: {
			getAll() {
				if (!isBrowser()) return [];

				return document.cookie.split(';').reduce((acc, cookie) => {
					const [name, ...value] = cookie.split('=');
					if (name) {
						acc.push({
							name: name.trim(),
							value:
								value.length > 0
									? decodeURIComponent(value.join('='))
									: '',
						});
					}
					return acc;
				}, []);
			},
			setAll(cookiesToSet) {
				if (!isBrowser()) return;
				cookiesToSet.forEach(({ name, value, options }) => {
					let cookieString = `${name}=${encodeURIComponent(value)}`;
					if (options.maxAge)
						cookieString += `; max-age=${options.maxAge}`;
					if (options.domain)
						cookieString += `; domain=${options.domain}`;
					const path = options.path || '/';
					cookieString += `; path=${path}`;
					if (options.expires)
						cookieString += `; expires=${options.expires.toUTCString()}`;
					if (options.secure) cookieString += '; secure';
					if (options.sameSite)
						cookieString += `; samesite=${options.sameSite}`;
					document.cookie = cookieString;
				});
			},
		},
	});

	return client;
};

export const supabase = getSupabaseClient();
