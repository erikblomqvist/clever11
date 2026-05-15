import { getSupabaseAdmin } from '../adminSupabase.js';
import { getOpenIssues } from './github.js';

export const SIMILARITY_THRESHOLD = 0.75;
export const MAX_MATCHES = 2;

/**
 * Find up to {@link MAX_MATCHES} previously-captured inbox items whose embedding
 * is more similar than {@link SIMILARITY_THRESHOLD} to `embedding`. Scoped to
 * GitHub issues that are currently open and labeled `needs-triage`.
 *
 * @param {number[]} embedding
 * @returns {Promise<Array<{ issue_number: number, similarity: number }>>}
 */
export async function findDuplicates(embedding) {
	const openIssues = await getOpenIssues({ label: 'needs-triage' });
	const issueNumbers = openIssues
		.map((/** @type {{ number: number }} */ i) => i.number)
		.filter((n) => Number.isInteger(n));
	if (issueNumbers.length === 0) return [];

	const supabase = getSupabaseAdmin();
	if (!supabase) throw new Error('Supabase admin client not configured.');

	const { data, error } = await supabase.rpc('match_inbox_items', {
		query_embedding: embedding,
		issue_numbers: issueNumbers,
		match_threshold: SIMILARITY_THRESHOLD,
		match_count: MAX_MATCHES,
	});
	if (error) throw new Error(`match_inbox_items failed: ${error.message}`);

	return (data ?? []).map(
		(/** @type {{ issue_number: number, similarity: number }} */ row) => ({
			issue_number: row.issue_number,
			similarity: row.similarity,
		}),
	);
}
