/**
 * Toggle for streak SVG animations and the celebration timing window
 * that defers turn-advance after a player crosses the streak threshold.
 *
 * Disabled by default to prevent lag on some devices (e.g. iPad). Set
 * CLEVER11_ENABLE_STREAK_ANIMATIONS=true (or 1) at build time to enable.
 */
function parseFlag(/** @type {unknown} */ raw) {
	if (typeof raw !== 'string') return false;
	const normalized = raw.trim().toLowerCase();
	return normalized === 'true' || normalized === '1';
}

export const ENABLE_STREAK_ANIMATIONS = parseFlag(
	import.meta.env.CLEVER11_ENABLE_STREAK_ANIMATIONS,
);
