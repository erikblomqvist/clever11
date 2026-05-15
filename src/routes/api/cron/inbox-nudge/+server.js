import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import webpush from 'web-push';
import { getOpenIssues, getRecentCommits } from '$lib/server/inbox/github.js';
import { embed } from '$lib/server/inbox/embed.js';
import { generateDigestLine } from '$lib/server/inbox/gemini.js';
import { getSupabaseAdmin } from '$lib/server/adminSupabase.js';

const STALE_AFTER_HOURS = 12;
const COMMIT_LOOKBACK_DAYS = 7;
const SIMILARITY_THRESHOLD = 0.8;

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
	return handle(request);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	return handle(request);
}

/** @param {Request} request */
async function handle(request) {
	const secret = env.CRON_SECRET;
	if (!secret) throw error(500, 'CRON_SECRET not configured');
	if (request.headers.get('authorization') !== `Bearer ${secret}`) {
		throw error(401, 'unauthorized');
	}

	const supabase = getSupabaseAdmin();
	if (!supabase) throw error(500, 'Supabase admin client not configured.');

	const today = new Date().toISOString().slice(0, 10);
	const staleCutoff = Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000;

	const issues = await getOpenIssues({ label: 'needs-triage' });
	const staleIssues = issues.filter(
		(/** @type {{ created_at: string }} */ i) =>
			new Date(i.created_at).getTime() < staleCutoff,
	);
	if (staleIssues.length === 0) return json({ sent: false });

	/** @type {number[]} */
	const issueNumbers = staleIssues.map(
		(/** @type {{ number: number }} */ i) => i.number,
	);

	const { data: itemRows, error: itemsError } = await supabase
		.from('inbox_items')
		.select('issue_number, area, snooze_until')
		.in('issue_number', issueNumbers);
	if (itemsError) throw error(500, itemsError.message);

	/** @type {Map<number, { area: string[] | null, snooze_until: string | null }>} */
	const itemsByNumber = new Map();
	for (const row of itemRows ?? []) itemsByNumber.set(row.issue_number, row);

	const candidates = staleIssues.filter(
		(/** @type {{ number: number }} */ i) => {
			const meta = itemsByNumber.get(i.number);
			if (!meta) return true;
			return !meta.snooze_until || meta.snooze_until <= today;
		},
	);
	if (candidates.length === 0) return json({ sent: false });

	// Embed any new commits from the last week, reusing cached rows by SHA.
	const since = new Date(
		Date.now() - COMMIT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	const commits = await getRecentCommits({ since });
	if (commits.length > 0) {
		const { data: cached, error: cacheError } = await supabase
			.from('inbox_commit_embeddings')
			.select('sha')
			.in(
				'sha',
				commits.map((c) => c.sha),
			);
		if (cacheError) throw error(500, cacheError.message);
		const cachedShas = new Set((cached ?? []).map((r) => r.sha));
		for (const commit of commits) {
			if (cachedShas.has(commit.sha)) continue;
			try {
				const embedding = await embed(commit.message);
				const { error: insertError } = await supabase
					.from('inbox_commit_embeddings')
					.insert({
						sha: commit.sha,
						message: commit.message,
						embedding,
					});
				if (insertError) {
					console.warn(
						JSON.stringify({
							event: 'cron_commit_embedding_insert_failed',
							sha: commit.sha,
							error: insertError.message,
						}),
					);
				}
			} catch (err) {
				console.warn(
					JSON.stringify({
						event: 'cron_commit_embedding_failed',
						sha: commit.sha,
						error: err instanceof Error ? err.message : String(err),
					}),
				);
			}
		}
	}

	// Flag inbox items whose embedding closely matches a recent commit.
	const { data: matches, error: matchError } = await supabase.rpc(
		'match_inbox_to_commits',
		{
			issue_numbers: candidates.map(
				(/** @type {{ number: number }} */ c) => c.number,
			),
			match_threshold: SIMILARITY_THRESHOLD,
		},
	);
	if (matchError) throw error(500, matchError.message);

	let possiblyShippedCount = 0;
	for (const match of matches ?? []) {
		const { error: updateError } = await supabase
			.from('inbox_items')
			.update({ possibly_shipped_sha: match.sha })
			.eq('issue_number', match.issue_number);
		if (updateError) {
			console.warn(
				JSON.stringify({
					event: 'cron_possibly_shipped_update_failed',
					issue_number: match.issue_number,
					error: updateError.message,
				}),
			);
			continue;
		}
		possiblyShippedCount += 1;
	}

	// Tally area-tag distribution across the candidate set for the digest prompt.
	/** @type {Record<string, number>} */
	const areaCounts = {};
	for (const issue of candidates) {
		const meta = itemsByNumber.get(issue.number);
		const tags = meta?.area && meta.area.length ? meta.area : ['untagged'];
		for (const tag of tags) {
			areaCounts[tag] = (areaCounts[tag] ?? 0) + 1;
		}
	}

	const digest = await generateDigestLine({
		count: candidates.length,
		areaCounts,
	});

	const subject = env.VAPID_SUBJECT;
	const publicKey = env.VAPID_PUBLIC_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;
	if (!subject || !publicKey || !privateKey) {
		throw error(500, 'VAPID keys not configured');
	}
	webpush.setVapidDetails(
		subject.startsWith('mailto:') || subject.startsWith('https:')
			? subject
			: `mailto:${subject}`,
		publicKey,
		privateKey,
	);

	const { data: subs, error: subsError } = await supabase
		.from('inbox_push_subscriptions')
		.select('id, endpoint, p256dh, auth');
	if (subsError) throw error(500, subsError.message);

	const payload = JSON.stringify({ title: 'clever11 inbox', body: digest });
	let sentCount = 0;
	for (const sub of subs ?? []) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.p256dh, auth: sub.auth },
				},
				payload,
			);
			sentCount += 1;
		} catch (err) {
			const statusCode =
				err && typeof err === 'object' && 'statusCode' in err
					? /** @type {{ statusCode: number }} */ (err).statusCode
					: 0;
			if (statusCode === 410 || statusCode === 404) {
				await supabase
					.from('inbox_push_subscriptions')
					.delete()
					.eq('id', sub.id);
			} else {
				console.warn(
					JSON.stringify({
						event: 'cron_push_failed',
						subscription_id: sub.id,
						status: statusCode,
						error: err instanceof Error ? err.message : String(err),
					}),
				);
			}
		}
	}

	return json({
		sent: true,
		items: candidates.length,
		digest,
		subscriptions_notified: sentCount,
		possibly_shipped_count: possiblyShippedCount,
	});
}
