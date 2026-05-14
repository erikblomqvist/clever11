/**
 * Svelte action: detect a Konami-style tap sequence on the children of an
 * element. Each child must have a `data-secret-id` attribute that identifies
 * the "input" of that tap (e.g., an icon id).
 *
 * A rolling buffer records the last N taps (N = code length). The buffer
 * matches the `code` array → fires `onmatch`. Taps further apart than
 * `tapWindow` ms start a fresh buffer. Any 2+ pointer gesture during the
 * sequence clears the buffer (pinch takes priority).
 *
 * @param {HTMLElement} node
 * @param {{
 *   code: string[],
 *   tapWindow?: number,
 *   onmatch: () => void,
 *   ontap?: (id: string) => void,
 * }} params
 */
export function secretCode(node, params) {
	let opts = withDefaults(params);

	/** @type {string[]} */
	let buffer = [];
	let lastTapTime = 0;
	let pointerCount = 0;
	let multiTouchSeen = false;

	/** @param {PointerEvent} e */
	function onPointerDown(e) {
		// A fresh gesture starting (pointerCount transitioning 0 → 1) is
		// our cue to clear the lingering multiTouchSeen flag from the
		// previous gesture. We hold the flag through pointerup so the
		// synthesized click that follows a pinch still gets gated.
		if (pointerCount === 0) multiTouchSeen = false;
		pointerCount++;
		if (pointerCount >= 2) {
			multiTouchSeen = true;
			buffer = [];
			lastTapTime = 0;
		}
		void e;
	}

	/** @param {PointerEvent} e */
	function onPointerUp(e) {
		pointerCount = Math.max(0, pointerCount - 1);
		void e;
	}

	/** @param {MouseEvent} e */
	function onClick(e) {
		if (multiTouchSeen) return;
		const target = /** @type {HTMLElement | null} */ (e.target);
		const hit = target?.closest('[data-secret-id]');
		if (!hit) return;
		const id = hit.getAttribute('data-secret-id');
		if (!id) return;

		const now = performance.now();
		const elapsed = now - lastTapTime;
		if (lastTapTime === 0 || elapsed > opts.tapWindow) {
			buffer = [id];
		} else {
			buffer.push(id);
			if (buffer.length > opts.code.length) {
				buffer = buffer.slice(-opts.code.length);
			}
		}
		lastTapTime = now;

		opts.ontap?.(id);

		if (
			buffer.length === opts.code.length &&
			buffer.every((b, i) => b === opts.code[i])
		) {
			buffer = [];
			lastTapTime = 0;
			opts.onmatch();
		}
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerUp);
	node.addEventListener('click', onClick);

	return {
		/** @param {{ code: string[], tapWindow?: number, onmatch: () => void, ontap?: (id: string) => void }} newParams */
		update(newParams) {
			opts = withDefaults(newParams);
		},
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerUp);
			node.removeEventListener('click', onClick);
		},
	};
}

/** @param {{ code: string[], tapWindow?: number, onmatch: () => void, ontap?: (id: string) => void }} p */
function withDefaults(p) {
	return {
		code: p.code,
		tapWindow: p.tapWindow ?? 700,
		onmatch: p.onmatch,
		ontap: p.ontap,
	};
}
