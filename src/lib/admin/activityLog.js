import { supabase } from '$lib/supabase.js';

/**
 * Fire-and-forget insert into admin_activity.
 * @param {{
 *   verb: string,
 *   entity_type: string,
 *   entity_id?: string|null,
 *   summary: string,
 *   deck_name?: string|null,
 * }} entry
 */
export function logActivity(entry) {
	if (!supabase) return;
	supabase.auth.getUser().then(({ data }) => {
		supabase
			.from('admin_activity')
			.insert({
				actor_id: data?.user?.id ?? null,
				verb: entry.verb,
				entity_type: entry.entity_type,
				entity_id: entry.entity_id ?? null,
				summary: entry.summary,
				deck_name: entry.deck_name ?? null,
			})
			.then(() => {});
	});
}
