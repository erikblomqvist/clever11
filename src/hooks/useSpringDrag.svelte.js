const SPRING_DRAG_MAX_ROTATION = 1;
const SPRING_DRAG_ROTATION_PER_PX = 0.24 / 360;
export const SPRING_DRAG_RETURN_DURATION_MS = 620;

function clamp(
	/** @type {number} */ value,
	/** @type {number} */ min,
	/** @type {number} */ max,
) {
	return Math.min(Math.max(value, min), max);
}

/**
 * @param {{ canStart: (event: PointerEvent) => boolean }} options
 */
export function useSpringDrag({ canStart }) {
	let pointerId = $state(/** @type {number|null} */ (null));
	let startY = 0;
	let rotationOffset = $state(0);
	let isActive = $state(false);

	function reset() {
		pointerId = null;
		isActive = false;
		rotationOffset = 0;
	}

	function handlePointerDown(
		/** @type {PointerEvent & { currentTarget: HTMLElement }} */ event,
	) {
		if (!canStart(event)) return;

		pointerId = event.pointerId;
		startY = event.clientY;
		rotationOffset = 0;
		isActive = true;
		event.currentTarget.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function handlePointerMove(/** @type {PointerEvent} */ event) {
		if (pointerId !== event.pointerId) return;

		const deltaY = event.clientY - startY;
		rotationOffset = clamp(
			deltaY * SPRING_DRAG_ROTATION_PER_PX,
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
