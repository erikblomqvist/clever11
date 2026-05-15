import { env } from '$env/dynamic/private';

const API = 'https://api.github.com';

function repo() {
	const r = env.GITHUB_REPO;
	if (!r) throw new Error('GITHUB_REPO not set');
	return r;
}

async function gh(path, init = {}) {
	const token = env.GITHUB_TOKEN;
	if (!token) throw new Error('GITHUB_TOKEN not set');
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			Authorization: `Bearer ${token}`,
			...(init.body ? { 'Content-Type': 'application/json' } : {}),
			...init.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(
			`GitHub ${init.method ?? 'GET'} ${path} ${res.status}: ${text}`,
		);
	}
	return res.status === 204 ? null : res.json();
}

/** @param {{ title: string, body: string, labels?: string[] }} input */
export async function createIssue({ title, body, labels = [] }) {
	return gh(`/repos/${repo()}/issues`, {
		method: 'POST',
		body: JSON.stringify({ title, body, labels }),
	});
}

/**
 * @param {number} number
 * @param {{ title?: string, body?: string }} patch
 */
export async function updateIssue(number, patch) {
	return gh(`/repos/${repo()}/issues/${number}`, {
		method: 'PATCH',
		body: JSON.stringify(patch),
	});
}

export async function addLabel(number, label) {
	return gh(`/repos/${repo()}/issues/${number}/labels`, {
		method: 'POST',
		body: JSON.stringify({ labels: [label] }),
	});
}

export async function removeLabel(number, label) {
	return gh(
		`/repos/${repo()}/issues/${number}/labels/${encodeURIComponent(label)}`,
		{ method: 'DELETE' },
	);
}

export async function commentIssue(number, body) {
	return gh(`/repos/${repo()}/issues/${number}/comments`, {
		method: 'POST',
		body: JSON.stringify({ body }),
	});
}

export async function closeIssue(number, comment) {
	if (comment) await commentIssue(number, comment);
	return gh(`/repos/${repo()}/issues/${number}`, {
		method: 'PATCH',
		body: JSON.stringify({ state: 'closed' }),
	});
}

/** @param {{ label?: string }} [opts] */
export async function getOpenIssues({ label } = {}) {
	const params = new URLSearchParams({ state: 'open', per_page: '100' });
	if (label) params.set('labels', label);
	return gh(`/repos/${repo()}/issues?${params}`);
}
