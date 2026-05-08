import { onMount } from 'svelte';

const GAME_LOCK_CLASS = 'game-interaction-lock';
const GAME_LOCK_SCROLL_ALLOW_SELECTOR = '[data-game-scroll-lock-allow]';
const DOUBLE_TAP_DELAY = 300;

/**
 * @param {{ getSurfaceElement: () => HTMLElement|null }} options
 */
export function useGameInteractionLock({ getSurfaceElement }) {
	let lastTouchEnd = 0;
	let lastTouchY = 0;
	let viewportResetFrame = /** @type {number | null} */ (null);

	function setGameInteractionLock(/** @type {boolean} */ locked) {
		[document.documentElement, document.body].forEach((element) =>
			element.classList.toggle(GAME_LOCK_CLASS, locked),
		);
	}

	function resetGameViewport() {
		const wasLocked = document.body.classList.contains(GAME_LOCK_CLASS);

		if (wasLocked) {
			setGameInteractionLock(false);
		}

		window.scrollTo(0, 0);
		document.scrollingElement?.scrollTo(0, 0);
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;

		const surfaceElement = getSurfaceElement();
		if (surfaceElement) {
			surfaceElement.scrollTop = 0;
			surfaceElement.scrollLeft = 0;
		}

		if (wasLocked) {
			setGameInteractionLock(true);
		}
	}

	function scheduleViewportReset() {
		if (viewportResetFrame !== null) {
			cancelAnimationFrame(viewportResetFrame);
		}

		resetGameViewport();
		viewportResetFrame = requestAnimationFrame(() => {
			resetGameViewport();
			viewportResetFrame = requestAnimationFrame(() => {
				resetGameViewport();
				viewportResetFrame = null;
			});
		});
	}

	function preventDefault(/** @type {Event} */ event) {
		event.preventDefault();
	}

	function getAllowedGameScroller(/** @type {EventTarget | null} */ target) {
		return target instanceof Element
			? target.closest(GAME_LOCK_SCROLL_ALLOW_SELECTOR)
			: null;
	}

	function canScrollAllowedElement(
		/** @type {Element} */ element,
		/** @type {number} */ deltaY,
	) {
		const scrollableElement = /** @type {HTMLElement} */ (element);
		const canScroll =
			scrollableElement.scrollHeight > scrollableElement.clientHeight;
		const isAtTop = scrollableElement.scrollTop <= 0;
		const isAtBottom =
			scrollableElement.scrollTop + scrollableElement.clientHeight >=
			scrollableElement.scrollHeight - 1;

		return (
			canScroll &&
			!((deltaY > 0 && isAtTop) || (deltaY < 0 && isAtBottom))
		);
	}

	function handleLockedTouchStart(/** @type {TouchEvent} */ event) {
		lastTouchY = event.touches[0]?.clientY ?? 0;
	}

	function handleLockedTouchMove(/** @type {TouchEvent} */ event) {
		const allowedScroller = getAllowedGameScroller(event.target);
		const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
		const deltaY = currentTouchY - lastTouchY;

		if (
			event.touches.length > 1 ||
			!allowedScroller ||
			!canScrollAllowedElement(allowedScroller, deltaY)
		) {
			event.preventDefault();
		}

		lastTouchY = currentTouchY;
	}

	function handleLockedTouchEnd(/** @type {TouchEvent} */ event) {
		const now = Date.now();

		if (now - lastTouchEnd <= DOUBLE_TAP_DELAY) {
			event.preventDefault();
		}

		lastTouchEnd = now;
	}

	onMount(() => {
		const touchOptions = { passive: false };

		resetGameViewport();
		setGameInteractionLock(true);
		document.addEventListener('touchstart', handleLockedTouchStart, {
			passive: true,
		});
		document.addEventListener(
			'touchmove',
			handleLockedTouchMove,
			touchOptions,
		);
		document.addEventListener(
			'touchend',
			handleLockedTouchEnd,
			touchOptions,
		);
		document.addEventListener('gesturestart', preventDefault);
		document.addEventListener('gesturechange', preventDefault);
		document.addEventListener('gestureend', preventDefault);

		return () => {
			if (viewportResetFrame !== null) {
				cancelAnimationFrame(viewportResetFrame);
			}

			setGameInteractionLock(false);
			document.removeEventListener('touchstart', handleLockedTouchStart);
			document.removeEventListener('touchmove', handleLockedTouchMove);
			document.removeEventListener('touchend', handleLockedTouchEnd);
			document.removeEventListener('gesturestart', preventDefault);
			document.removeEventListener('gesturechange', preventDefault);
			document.removeEventListener('gestureend', preventDefault);
		};
	});

	return { scheduleViewportReset };
}
