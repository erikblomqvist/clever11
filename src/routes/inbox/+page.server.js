import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getOpenIssues } from '$lib/server/inbox/github.js';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin.js';

const UNKNOWN_AREA = 'Untagged';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const supabase = getSupabaseAdmin();
	if (!supabase) throw error(500, 'Supabase admin client not configured.');

	const issues = await getOpenIssues({ label: 'needs-triage' });

	const issueNumbers = issues
		.map((/** @type {{ number: number }} */ i) => i.number)
		.filter((n) => Number.isInteger(n));

	/** @type {Map<number, { area: string[] | null, snooze_until: string | null, follow_up_question: string | null, follow_up_answered: boolean, possibly_shipped_sha: string | null }>} */
	const itemsByNumber = new Map();

	if (issueNumbers.length > 0) {
		const { data, error: selectError } = await supabase
			.from('inbox_items')
			.select(
				'issue_number, area, snooze_until, follow_up_question, follow_up_answered, possibly_shipped_sha',
			)
			.in('issue_number', issueNumbers);
		if (selectError) throw error(500, selectError.message);
		for (const row of data ?? []) {
			itemsByNumber.set(row.issue_number, row);
		}
	}

	const today = todayIso();
	const now = Date.now();

	const items = [];
	for (const issue of issues) {
		const meta = itemsByNumber.get(issue.number);
		if (meta?.snooze_until && meta.snooze_until > today) continue;

		const body = typeof issue.body === 'string' ? issue.body : '';
		const noteText = extractOriginalNote(body) || body;
		const ageMs = Math.max(0, now - new Date(issue.created_at).getTime());

		items.push({
			issue_number: issue.number,
			title: stripUntriagedPrefix(issue.title || ''),
			body,
			note_excerpt: truncate(noteText, 240),
			note_for_clipboard: noteText,
			area: meta?.area && meta.area.length ? meta.area : [],
			follow_up_question: meta?.follow_up_question || '',
			follow_up_answered: meta?.follow_up_answered ?? true,
			possibly_shipped_sha: meta?.possibly_shipped_sha || '',
			created_at: issue.created_at,
			age_label: formatAge(ageMs),
			body_length: body.length,
		});
	}

	const clusters = clusterByArea(items);

	const flat = [...items].sort((a, b) => {
		const ageDiff =
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
		if (ageDiff !== 0) return ageDiff; // oldest first = age desc
		return a.body_length - b.body_length;
	});

	return {
		items,
		clusters,
		flat,
		vapidPublicKey: env.VAPID_PUBLIC_KEY ?? '',
	};
}

function todayIso() {
	return new Date().toISOString().slice(0, 10);
}

/** @param {string} title */
function stripUntriagedPrefix(title) {
	return title.replace(/^Untriaged:\s*/i, '').trim();
}

/** @param {number} ms */
function formatAge(ms) {
	const minutes = Math.floor(ms / 60_000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

/** @param {string} body */
function extractOriginalNote(body) {
	const start = body.indexOf('> Original note:');
	if (start === -1) return '';
	const after = body.slice(start + '> Original note:'.length);
	const lines = [];
	for (const raw of after.split('\n')) {
		if (raw.startsWith('> ')) lines.push(raw.slice(2));
		else if (raw === '>') lines.push('');
		else if (raw.trim() === '') {
			if (lines.length > 0) break;
		} else {
			break;
		}
	}
	return lines.join('\n').trim();
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max) {
	if (text.length <= max) return text;
	return text.slice(0, max).trimEnd() + '…';
}

/**
 * @template {{ area: string[] }} T
 * @param {T[]} items
 * @returns {Array<{ area: string, items: T[] }>}
 */
function clusterByArea(items) {
	/** @type {Map<string, T[]>} */
	const map = new Map();
	for (const item of items) {
		const keys = item.area.length ? item.area : [UNKNOWN_AREA];
		for (const key of keys) {
			let list = map.get(key);
			if (!list) {
				list = [];
				map.set(key, list);
			}
			list.push(item);
		}
	}
	return [...map.entries()]
		.sort((a, b) => {
			if (a[0] === UNKNOWN_AREA) return 1;
			if (b[0] === UNKNOWN_AREA) return -1;
			return a[0].localeCompare(b[0]);
		})
		.map(([area, list]) => ({ area, items: list }));
}
