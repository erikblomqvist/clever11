/**
 * Svelte action: detect a two-finger pinch-OUT gesture on an element.
 *
 * Fires `onunlock` exactly once per gesture when the distance between two
 * simultaneous pointers grows by `threshold` (default 2.0×) within `window`
 * milliseconds (default 1500ms) of touchdown.
 *
 * @param {HTMLElement} node
 * @param {{ threshold?: number, window?: number, onunlock: () => void }} params
 */
export function pinchUnlock(node, params) {
	let opts = withDefaults(params);

	/** @type {Map<number, { x: number, y: number }>} */
	const pointers = new Map();
	let startDistance = 0;
	let startTime = 0;
	let fired = false;

	/** @param {PointerEvent} e */
	function onPointerDown(e) {
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) {
			startDistance = currentDistance();
			startTime = performance.now();
			fired = false;
		}
		if (pointers.size > 2) {
			reset();
		}
	}

	/** @param {PointerEvent} e */
	function onPointerMove(e) {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (fired || pointers.size !== 2 || startDistance === 0) return;
		if (performance.now() - startTime > opts.window) return;
		const ratio = currentDistance() / startDistance;
		if (ratio >= opts.threshold) {
			fired = true;
			opts.onunlock();
		}
	}

	/** @param {PointerEvent} e */
	function onPointerUp(e) {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) {
			startDistance = 0;
			startTime = 0;
		}
	}

	function reset() {
		pointers.clear();
		startDistance = 0;
		startTime = 0;
		fired = false;
	}

	function currentDistance() {
		const pts = [...pointers.values()];
		if (pts.length !== 2) return 0;
		const dx = pts[0].x - pts[1].x;
		const dy = pts[0].y - pts[1].y;
		return Math.hypot(dx, dy);
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerUp);

	return {
		/** @param {{ threshold?: number, window?: number, onunlock: () => void }} newParams */
		update(newParams) {
			opts = withDefaults(newParams);
		},
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerUp);
		},
	};
}

/** @param {{ threshold?: number, window?: number, onunlock: () => void }} p */
function withDefaults(p) {
	return {
		threshold: p.threshold ?? 3.0,
		window: p.window ?? 1500,
		onunlock: p.onunlock,
	};
}
