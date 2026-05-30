/**
 * Toggle for the streak lightning animation and the celebration timing window
 * that defers turn-advance after a player crosses the streak threshold.
 *
 * Enabled by default. The animation is canvas-based (see streakLightning.js)
 * and stays smooth on WebKit/iPad, so the earlier lag kill-switch is no longer
 * needed — set CLEVER11_ENABLE_STREAK_ANIMATIONS=false (or 0) at build time to
 * turn it back off.
 */
function parseFlag(
	/** @type {unknown} */ raw,
	/** @type {boolean} */ fallback,
) {
	if (typeof raw !== 'string') return fallback;
	const normalized = raw.trim().toLowerCase();
	if (normalized === 'false' || normalized === '0') return false;
	if (normalized === 'true' || normalized === '1') return true;
	return fallback;
}

export const ENABLE_STREAK_ANIMATIONS = parseFlag(
	import.meta.env.CLEVER11_ENABLE_STREAK_ANIMATIONS,
	true,
);
