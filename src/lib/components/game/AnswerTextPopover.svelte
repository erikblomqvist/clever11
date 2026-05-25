<script>
	/**
	 * @type {{ id: string, text: string, seatRotation?: number }}
	 */
	let { id, text, seatRotation = 0 } = $props();

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function closePopover(event) {
		event.currentTarget.hidePopover();
	}
</script>

<button
	{id}
	class="answer-text-popover"
	type="button"
	popover="auto"
	style="--seat-rotation:{seatRotation}turn"
	onclick={closePopover}
>
	{text}
</button>

<style>
	.answer-text-popover {
		border: 3px solid var(--orange-700);
		border-radius: 1rem;
		width: max(18ch, 80vw);
		padding: 1.25rem 1.75rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		font-family: var(--font-family-primary);
		font-size: clamp(2rem, 8vw, 4rem);
		font-weight: 700;
		line-height: 1.05;
		text-align: center;
		box-shadow: 0 1rem 2rem hsl(0 0% 0% / 0.25);
		cursor: pointer;
		word-break: auto-phrase;
		transform: rotate(var(--seat-rotation, 0turn));
	}

	.answer-text-popover::backdrop {
		background-color: hsl(0 0% 0% / 0.25);
	}
</style>
