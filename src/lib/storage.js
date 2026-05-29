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

const OPTION_IMAGE_BUCKET = 'question-option-images';
const OPTION_IMAGE_MAX_SIZE = 512;
const OPTION_IMAGE_QUALITY = 0.78;

/**
 * @param {File|Blob} file
 * @param {{ basePath: string, index: number }} opts
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function resizeAndUploadOptionImage(file, { basePath, index }) {
	if (!supabase) throw new Error('Supabase not configured.');
	const blob = await resizeToWebP(file);
	const path = `${basePath}/${index + 1}-${Date.now()}.webp`;
	const { error } = await supabase.storage
		.from(OPTION_IMAGE_BUCKET)
		.upload(path, blob, {
			cacheControl: '31536000',
			contentType: 'image/webp',
			upsert: true,
		});
	if (error) throw new Error(`Upload failed: ${error.message}`);
	const { data } = supabase.storage
		.from(OPTION_IMAGE_BUCKET)
		.getPublicUrl(path);
	if (!data?.publicUrl) throw new Error('Could not get public URL.');
	return { url: data.publicUrl, path };
}

/** @param {File|Blob} file */
function resizeToWebP(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			const scale = Math.min(
				1,
				OPTION_IMAGE_MAX_SIZE / Math.max(image.width, image.height),
			);
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(image.width * scale));
			canvas.height = Math.max(1, Math.round(image.height * scale));
			const context = canvas.getContext('2d');
			if (!context) {
				URL.revokeObjectURL(url);
				reject(new Error('Could not prepare image.'));
				return;
			}
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			canvas.toBlob(
				(blob) => {
					URL.revokeObjectURL(url);
					if (blob) resolve(blob);
					else reject(new Error('Could not compress image.'));
				},
				'image/webp',
				OPTION_IMAGE_QUALITY,
			);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Could not read image.'));
		};
		image.src = url;
	});
}
