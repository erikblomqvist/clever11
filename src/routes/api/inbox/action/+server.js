import { json, error } from '@sveltejs/kit';
import {
	addLabel,
	removeLabel,
	closeIssue,
	commentIssue,
} from '$lib/server/inbox/github.js';
import { getSupabaseAdmin } from '$lib/server/adminSupabase.js';

const ALLOWED_ACTIONS = new Set([
	'ready',
	'snooze3',
	'snooze7',
	'done',
	'wontfix',
	'answer_followup',
]);

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	let payload;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'invalid json');
	}

	const issueNumber =
		typeof payload?.issue_number === 'number' &&
		Number.isInteger(payload.issue_number)
			? payload.issue_number
			: null;
	if (!issueNumber || issueNumber < 1)
		throw error(400, 'issue_number required');

	const action = typeof payload?.action === 'string' ? payload.action : '';
	if (!ALLOWED_ACTIONS.has(action)) throw error(400, 'invalid action');

	switch (action) {
		case 'ready': {
			await removeLabel(issueNumber, 'needs-triage').catch(swallow404);
			await addLabel(issueNumber, 'ready-for-agent');
			return json({ ok: true });
		}
		case 'snooze3':
			await snoozeIssue(issueNumber, 3);
			return json({ ok: true });
		case 'snooze7':
			await snoozeIssue(issueNumber, 7);
			return json({ ok: true });
		case 'done':
			await closeIssue(issueNumber, 'Already shipped.');
			return json({ ok: true });
		case 'wontfix':
			await addLabel(issueNumber, 'wontfix');
			await closeIssue(issueNumber);
			return json({ ok: true });
		case 'answer_followup': {
			const answer =
				typeof payload?.payload?.answer === 'string'
					? payload.payload.answer.trim()
					: '';
			if (answer) await commentIssue(issueNumber, answer);
			await markFollowUpAnswered(issueNumber);
			return json({ ok: true });
		}
	}

	throw error(400, 'invalid action');
}

/**
 * @param {number} issueNumber
 * @param {number} days
 */
async function snoozeIssue(issueNumber, days) {
	const supabase = getSupabaseAdmin();
	if (!supabase) throw error(500, 'Supabase admin client not configured.');
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() + days);
	const iso = date.toISOString().slice(0, 10);
	const { error: updateError } = await supabase
		.from('inbox_items')
		.update({ snooze_until: iso })
		.eq('issue_number', issueNumber);
	if (updateError) throw error(500, updateError.message);
}

/** @param {number} issueNumber */
async function markFollowUpAnswered(issueNumber) {
	const supabase = getSupabaseAdmin();
	if (!supabase) throw error(500, 'Supabase admin client not configured.');
	const { error: updateError } = await supabase
		.from('inbox_items')
		.update({ follow_up_answered: true })
		.eq('issue_number', issueNumber);
	if (updateError) throw error(500, updateError.message);
}

/** @param {unknown} err */
function swallow404(err) {
	const message = err instanceof Error ? err.message : String(err);
	if (message.includes('404')) return;
	throw err;
}
