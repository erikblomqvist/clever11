import iconNodes from 'lucide-static/icon-nodes.json';
import iconTags from 'lucide-static/tags.json';

const FALLBACK_ICON_KEY = 'layers';

/** @param {string} value */
function titleCase(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/** @param {string} key */
function kebabToPascal(key) {
	return key.split('-').map(titleCase).join('');
}

/** @param {string} id */
function pascalToKebab(id) {
	return id
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase();
}

/** @param {string|null|undefined} id */
function toIconKey(id) {
	if (!id) return FALLBACK_ICON_KEY;
	return id.includes('-') ? id.toLowerCase() : pascalToKebab(id);
}

/** @param {string} key */
function getLabel(key) {
	return key.split('-').map(titleCase).join(' ');
}

export const DECK_ICONS = Object.entries(iconNodes)
	.map(([key, iconNode]) => {
		const id = kebabToPascal(key);
		const label = getLabel(key);
		const tags = iconTags[key] ?? [];

		return {
			id,
			label,
			iconNode,
			searchText: [id, label, key, ...tags].join(' ').toLowerCase(),
		};
	})
	.sort((a, b) => a.label.localeCompare(b.label));

/** @param {string|null|undefined} id */
export function getDeckIconNode(id) {
	return iconNodes[toIconKey(id)] ?? iconNodes[FALLBACK_ICON_KEY];
}

/**
 * Map AI-suggested icon names to real DECK_ICONS entries.
 *
 * The model can return names in any casing/spacing (e.g. "alarm clock",
 * "AlarmClock", "alarm-clock") and may hallucinate icons that don't exist.
 * We normalize each name to a kebab key, keep only keys present in the Lucide
 * set, dedupe, and trim to `limit` — so every returned id is guaranteed to
 * render. Over-requesting upstream absorbs the dropped hallucinations.
 *
 * @param {unknown} names
 * @param {number} [limit]
 * @returns {{ id: string, label: string }[]}
 */
export function resolveSuggestedIcons(names, limit = 6) {
	if (!Array.isArray(names)) return [];
	const seen = new Set();
	const result = [];
	for (const name of names) {
		if (typeof name !== 'string') continue;
		const cleaned = name.trim().replace(/[\s_]+/g, '-');
		if (!cleaned) continue;
		const key = toIconKey(cleaned);
		if (!iconNodes[key] || seen.has(key)) continue;
		seen.add(key);
		result.push({ id: kebabToPascal(key), label: getLabel(key) });
		if (result.length >= limit) break;
	}
	return result;
}
