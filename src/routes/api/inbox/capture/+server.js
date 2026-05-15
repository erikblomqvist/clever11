import { json, error } from '@sveltejs/kit';
import { createIssue, updateIssue } from '$lib/server/inbox/github.js';
import { generateMetadata } from '$lib/server/inbox/gemini.js';
import { embed } from '$lib/server/inbox/embed.js';
import { findDuplicates } from '$lib/server/inbox/dedup.js';
import { getSupabaseAdmin } from '$lib/server/adminSupabase.js';

const MAX_BODY = 8000;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals, platform }) {
	const {
		data: { user },
	} = await locals.supabase.auth.getUser();
	if (!user) throw error(401, 'unauthenticated');

	let payload;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'invalid json');
	}

	const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
	if (!body) throw error(400, 'body required');
	if (body.length > MAX_BODY) throw error(400, 'body too long');

	const title = 'Untriaged: ' + body.slice(0, 60).replace(/\s+/g, ' ').trim();

	const issue = await createIssue({
		title,
		body,
		labels: ['needs-triage'],
	});

	const enrichment = enrichIssue({
		number: issue.number,
		noteBody: body,
		userId: user.id,
	}).catch((err) => {
		console.error(
			JSON.stringify({
				event: 'inbox_enrichment_failed',
				issue_number: issue.number,
				error: err instanceof Error ? err.message : String(err),
			}),
		);
	});

	const waitUntil = platform?.context?.waitUntil;
	if (typeof waitUntil === 'function') {
		waitUntil.call(platform.context, enrichment);
	}

	return json({ number: issue.number });
}

/**
 * @param {{ number: number, noteBody: string, userId: string }} params
 */
async function enrichIssue({ number, noteBody, userId }) {
	const metadata = await generateMetadata(noteBody);

	const embedding = await embed(
		`${noteBody} ${metadata.follow_up_question}`.trim(),
	);
	const duplicates = await findDuplicates(embedding);
	// Exclude the just-created issue from its own matches in case it slipped in.
	const relatedMatches = duplicates.filter((d) => d.issue_number !== number);

	const updatedTitle = metadata.title || `Inbox note ${number}`;
	const updatedBody = renderIssueBody({
		note: noteBody,
		area: metadata.area,
		followUpQuestion: metadata.follow_up_question,
		capturedAt: new Date(),
		relatedMatches,
	});

	await updateIssue(number, { title: updatedTitle, body: updatedBody });

	const supabase = getSupabaseAdmin();
	if (!supabase) {
		throw new Error('Supabase admin client not configured.');
	}
	const { error: insertError } = await supabase.from('inbox_items').insert({
		issue_number: number,
		user_id: userId,
		area: metadata.area,
		follow_up_question: metadata.follow_up_question,
		embedding,
	});
	if (insertError) {
		throw new Error(`inbox_items insert failed: ${insertError.message}`);
	}
}

/**
 * @param {{ note: string, area: string[], followUpQuestion: string, capturedAt: Date, relatedMatches: Array<{ issue_number: number, similarity: number }> }} params
 */
function renderIssueBody({
	note,
	area,
	followUpQuestion,
	capturedAt,
	relatedMatches,
}) {
	const verbatim = note
		.split('\n')
		.map((line) => `> ${line}`.trimEnd())
		.join('\n');
	const areaLine = area.length ? area.join(', ') : 'unknown';
	const followUp = followUpQuestion.replace(/"/g, '\\"');
	const lines = [
		'> Original note:',
		verbatim,
		'',
		`**Area:** ${areaLine}`,
		`**Captured:** ${capturedAt.toISOString()}`,
	];
	if (relatedMatches.length > 0) {
		lines.push('', '**Possibly relates to:**');
		for (const match of relatedMatches) {
			lines.push(
				`- #${match.issue_number} (similarity ${match.similarity.toFixed(2)})`,
			);
		}
	}
	lines.push(
		'',
		'<!-- inbox-meta: do not edit below -->',
		`<!-- follow_up_question: "${followUp}" -->`,
	);
	return lines.join('\n');
}
