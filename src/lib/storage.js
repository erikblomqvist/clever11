import { supabase } from './supabase.js';

const BUCKET = 'deck-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** @param {File} file */
export function validateImageFile(file) {
	if (!ALLOWED.includes(file.type)) {
		return {
			valid: false,
			error: 'Only JPEG, PNG, or WebP images are allowed.',
		};
	}
	if (file.size > MAX_SIZE) {
		return { valid: false, error: 'Image must be under 5 MB.' };
	}
	return { valid: true };
}

/** @param {string} url */
export function extractPathFromUrl(url) {
	try {
		const parts = new URL(url).pathname.split('/');
		const idx = parts.indexOf(BUCKET);
		return idx !== -1 ? parts.slice(idx + 1).join('/') : null;
	} catch {
		return null;
	}
}

/**
 * @param {string} deckId
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadDeckImage(deckId, file) {
	if (!supabase) throw new Error('Supabase not configured.');
	const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
	const path = `${deckId}.${ext}`;
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
		cacheControl: '3600',
		upsert: true,
	});
	if (error) throw new Error(`Upload failed: ${error.message}`);
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	if (!data?.publicUrl) throw new Error('Could not get public URL.');
	return data.publicUrl;
}

/** @param {string} imageUrl */
export async function deleteDeckImage(imageUrl) {
	if (!supabase) return;
	const path = extractPathFromUrl(imageUrl);
	if (!path) return;
	await supabase.storage.from(BUCKET).remove([path]).catch(console.warn);
}
