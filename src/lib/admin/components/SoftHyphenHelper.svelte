<script>
	import AdminIcon from './AdminIcon.svelte';
	import BreakHintLoupe from './BreakHintLoupe.svelte';
	import {
		SOFT_HYPHEN,
		parseWordBreaks,
		maxBreakCharIndex,
	} from '$lib/softHyphens.js';

	let { words = [], disabled = false, ontoggle } = $props();

	const LONG_PRESS_MS = 450;
	const LONG_PRESS_MOVE_PX = 12;
	/** Releasing this far below the press point dismisses without toggling. */
	const CANCEL_DROP_PX = 72;

	let finePointer = $state(true);

	/** @type {{ word: { text: string, offset: number }, pointerId: number } | null} */
	let loupeWord = $state(null);
	/** Fixed above the initial long-press point. */
	let loupeAnchorX = $state(0);
	let loupeAnchorY = $state(0);
	/** Follows the finger while dragging to pick a gap. */
	let fingerX = $state(0);
	/** Vertical drag distance below the press point feeds the cancel zone. */
	let fingerY = $state(0);
	let loupeCanceling = $derived(
		!!loupeWord && fingerY - loupeAnchorY > CANCEL_DROP_PX,
	);
	/** @type {number | null} */
	let loupePreview = $state(null);
	/** Updated with preview; read on pointerup (avoids stale effect closure). */
	const loupePreviewSnap = { index: /** @type {number | null} */ (null) };

	/** @type {ReturnType<typeof setTimeout> | null} */
	let longPressTimer = null;
	/** @type {{ word: { text: string, offset: number }, startX: number, startY: number, pointerId: number } | null} */
	let longPressPending = null;

	$effect(() => {
		const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
		finePointer = mq.matches;
		const onChange = () => {
			finePointer = mq.matches;
			cancelLongPress();
			closeLoupe();
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	$effect(() => {
		if (!loupeWord) return;
		const { word, pointerId } = loupeWord;
		/** @param {PointerEvent} e */
		const onMove = (e) => {
			if (e.pointerId !== pointerId) return;
			fingerX = e.clientX;
			fingerY = e.clientY;
		};
		/** @param {PointerEvent} e */
		const onEnd = (e) => {
			if (e.pointerId !== pointerId) return;
			const index = loupePreviewSnap.index;
			const canceled = e.clientY - loupeAnchorY > CANCEL_DROP_PX;
			closeLoupe();
			if (!canceled && index !== null) {
				ontoggle?.(word.offset, word.text, index);
			}
		};
		/** @param {TouchEvent} e */
		const blockScroll = (e) => e.preventDefault();
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onEnd);
		document.addEventListener('pointercancel', onEnd);
		document.addEventListener('touchmove', blockScroll, { passive: false });
		return () => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onEnd);
			document.removeEventListener('pointercancel', onEnd);
			document.removeEventListener('touchmove', blockScroll);
		};
	});

	function cancelLongPress() {
		if (longPressTimer) clearTimeout(longPressTimer);
		longPressTimer = null;
		longPressPending = null;
	}

	function closeLoupe() {
		loupeWord = null;
		loupePreview = null;
		loupePreviewSnap.index = null;
	}

	/** @param {{ text: string, offset: number }} word @param {PointerEvent} e */
	function onWordPointerDown(word, e) {
		if (finePointer || disabled || e.button !== 0) return;
		const { chars } = parseWordBreaks(word.text);
		if (maxBreakCharIndex(chars) < 0) return;

		cancelLongPress();
		longPressPending = {
			word,
			startX: e.clientX,
			startY: e.clientY,
			pointerId: e.pointerId,
		};
		longPressTimer = setTimeout(() => {
			longPressTimer = null;
			if (!longPressPending) return;
			const pending = longPressPending;
			longPressPending = null;
			loupeWord = {
				word: pending.word,
				pointerId: pending.pointerId,
			};
			loupeAnchorX = pending.startX;
			loupeAnchorY = pending.startY;
			fingerX = pending.startX;
			fingerY = pending.startY;
			loupePreview = null;
			loupePreviewSnap.index = null;
			navigator.vibrate?.(12);
		}, LONG_PRESS_MS);
	}

	/** @param {PointerEvent} e */
	function onWordPointerMove(e) {
		if (loupeWord) return;
		if (!longPressPending || longPressPending.pointerId !== e.pointerId)
			return;
		const dx = e.clientX - longPressPending.startX;
		const dy = e.clientY - longPressPending.startY;
		if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) cancelLongPress();
	}

	function onWordPointerUp(/** @type {PointerEvent} */ _e) {
		if (loupeWord) return;
		cancelLongPress();
	}

	/** @param {PointerEvent} e */
	function onWordPointerCancel(/** @type {PointerEvent} */ _e) {
		if (loupeWord) return;
		cancelLongPress();
	}

	let loupeParsed = $derived(
		loupeWord ? parseWordBreaks(loupeWord.word.text) : null,
	);
</script>

{#if words.length > 0}
	<div class="shy">
		<div class="shy__header">
			<AdminIcon name="bolt" size={12} />
			<span>
				<span class="shy__hint-fine">
					{words.some((w) => !w.text.includes(SOFT_HYPHEN))
						? 'Long word detected — tap between letters to add break hints'
						: 'Break points set'}
				</span>
				<span class="shy__hint-touch">
					{words.some((w) => !w.text.includes(SOFT_HYPHEN))
						? 'Long word — long-press a word, drag to a gap, release to set (drag down to cancel)'
						: 'Break points set — long-press to edit (drag down to cancel)'}
				</span>
			</span>
		</div>
		<div class="shy__words">
			{#each words as word (word.offset)}
				{@const parsed = parseWordBreaks(word.text)}
				{#if finePointer}
					<div
						class="shy__word"
						class:shy__word--done={word.text.includes(SOFT_HYPHEN)}
					>
						{#each parsed.chars as char, i (i)}
							<button
								class="shy__letter"
								class:shy__letter--break={parsed.shyAfter[i]}
								type="button"
								onclick={() =>
									ontoggle?.(word.offset, word.text, i)}
								{disabled}>{char}</button
							>
						{/each}
					</div>
				{:else}
					<button
						type="button"
						class="shy__word shy__word--touch"
						class:shy__word--done={word.text.includes(SOFT_HYPHEN)}
						{disabled}
						onpointerdown={(e) => onWordPointerDown(word, e)}
						onpointermove={onWordPointerMove}
						onpointerup={onWordPointerUp}
						onpointercancel={onWordPointerCancel}
					>
						{#each parsed.chars as char, i (i)}
							<span class="shy__letter-static">{char}</span>
							{#if parsed.shyAfter[i]}
								<span class="shy__break-mark" aria-hidden="true"
								></span>
							{/if}
						{/each}
					</button>
				{/if}
			{/each}
		</div>
	</div>
{/if}

{#if loupeWord && loupeParsed}
	<BreakHintLoupe
		chars={loupeParsed.chars}
		shyAfter={loupeParsed.shyAfter}
		anchorX={loupeAnchorX}
		anchorY={loupeAnchorY}
		{fingerX}
		canceling={loupeCanceling}
		previewIndex={loupeCanceling ? null : loupePreview}
		onPreview={(index) => {
			loupePreview = index;
			loupePreviewSnap.index = index;
		}}
	/>
{/if}

<style>
	.shy {
		padding: 10px 12px;

		font-size: 0.75rem;

		background: var(--warn-soft);
		border: 1px solid var(--warn-soft-2);
		border-radius: var(--r-2);
	}

	.shy__header {
		display: flex;
		margin-bottom: 8px;
		align-items: center;

		color: var(--warn);

		gap: 8px;
	}

	.shy__hint-fine {
		display: none;
	}

	.shy__hint-touch {
		display: inline;
	}

	@media (hover: hover) and (pointer: fine) {
		.shy__hint-fine {
			display: inline;
		}

		.shy__hint-touch {
			display: none;
		}
	}

	.shy__words {
		display: flex;

		flex-wrap: wrap;
		gap: 8px;
	}

	.shy__word {
		display: inline-flex;
		padding: 2px 4px;
		align-items: center;

		background: var(--surface);
		border: 1px solid var(--warn-soft-2);
		border-radius: var(--r-2);
	}

	.shy__word--done {
		border-color: var(--border);
	}

	.shy__word--touch {
		padding: 6px 8px;
		min-height: 2.25rem;
		margin: 0;

		font: inherit;
		color: inherit;
		text-align: inherit;

		appearance: none;
		touch-action: none;
		cursor: default;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.shy__word--touch:disabled {
		cursor: default;
		pointer-events: none;
	}

	.shy__letter-static {
		font-family: var(--font-mono);
		font-size: 1rem;
		line-height: 1;

		color: var(--fg-mute);
	}

	.shy__break-mark {
		display: inline-block;
		width: 2px;
		height: 1em;
		margin: 0 1px;

		background: var(--accent);
		border-radius: 1px;
	}

	.shy__letter {
		position: relative;
		padding: 6px 2px;

		font-family: var(--font-mono);
		font-size: 1rem;
		line-height: 1;

		color: var(--fg-mute);

		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.shy__letter::after {
		position: absolute;
		right: -1px;
		top: 4px;
		bottom: 4px;
		width: 2px;

		background: transparent;
		border-radius: 1px;

		transition: background-color 150ms;

		content: '';
	}

	.shy__letter:hover::after {
		background: lch(100% 0 0 / 0.13);
	}

	.shy__letter--break::after {
		background: var(--accent);
	}

	.shy__letter--break:hover::after {
		background: var(--accent-hover);
	}

	.shy__letter:last-child::after {
		display: none;
	}

	.shy__letter:disabled {
		cursor: default;
		pointer-events: none;
	}
</style>
