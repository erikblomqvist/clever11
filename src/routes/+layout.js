import { getSupabaseClient } from '$lib/supabase';
import { setupI18n } from '$lib/i18n';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ depends }) => {
	depends('supabase:auth');

	// Initialize i18n before rendering
	setupI18n();

	const supabase = getSupabaseClient();

	if (supabase) {
		// Update fetch for the singleton instance to use the SvelteKit-provided fetch
		// This ensures requests are correctly proxied and handled by SvelteKit
		supabase.auth.onAuthStateChange(async () => {
			// This is just to ensure the client is initialized
		});
	}

	/**
	 * It's important to use getSession() here to initialize the client state.
	 * getUser() can be called later or in specific guards for extra security.
	 */
	const {
		data: { session },
	} = supabase
		? await supabase.auth.getSession()
		: { data: { session: null } };

	return { supabase, session };
};
