const SPRING_DRAG_MAX_ROTATION = 1;
export const SPRING_DRAG_RETURN_DURATION_MS = 620;

function clamp(
	/** @type {number} */ value,
	/** @type {number} */ min,
	/** @type {number} */ max,
) {
	return Math.min(Math.max(value, min), max);
}

/**
 * @param {{
 *   canStart: (event: PointerEvent) => boolean,
 *   getCenter: () => { x: number, y: number } | null,
 * }} options
 */
export function useSpringDrag({ canStart, getCenter }) {
	let pointerId = $state(/** @type {number|null} */ (null));
	let startAngle = 0;
	let rotationOffset = $state(0);
	let isActive = $state(false);
	let center = /** @type {{ x: number, y: number } | null} */ (null);

	function reset() {
		pointerId = null;
		isActive = false;
		rotationOffset = 0;
		center = null;
	}

	function handlePointerDown(
		/** @type {PointerEvent & { currentTarget: HTMLElement }} */ event,
	) {
		if (!canStart(event)) return;

		center = getCenter();
		if (!center) return;

		pointerId = event.pointerId;
		startAngle = Math.atan2(
			event.clientY - center.y,
			event.clientX - center.x,
		);
		rotationOffset = 0;
		isActive = true;
		event.currentTarget.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function handlePointerMove(/** @type {PointerEvent} */ event) {
		if (pointerId !== event.pointerId || !center) return;

		const currentAngle = Math.atan2(
			event.clientY - center.y,
			event.clientX - center.x,
		);
		let angleDelta = currentAngle - startAngle;

		if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
		if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

		rotationOffset = clamp(
			angleDelta / (2 * Math.PI),
			-SPRING_DRAG_MAX_ROTATION,
			SPRING_DRAG_MAX_ROTATION,
		);
		event.preventDefault();
	}

	function handlePointerEnd(
		/** @type {PointerEvent & { currentTarget: HTMLElement }} */ event,
	) {
		if (pointerId !== event.pointerId) return;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		reset();
		event.preventDefault();
	}

	return {
		get rotationOffset() {
			return rotationOffset;
		},
		get isActive() {
			return isActive;
		},
		reset,
		handlePointerDown,
		handlePointerMove,
		handlePointerEnd,
	};
}
