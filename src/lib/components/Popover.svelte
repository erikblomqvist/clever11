<script>
	/**
	 * @type {{ id: string, answer: string|number|{ text: string, backgroundColor: string } }}
	 */
	let { id, answer } = $props();

	const isColorAnswer = $derived(
		typeof answer === 'object' && answer !== null,
	);
	const answerLabel = $derived(isColorAnswer ? answer.text : String(answer));
	const answerBackgroundColor = $derived(
		isColorAnswer ? answer.backgroundColor : undefined,
	);

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function closePopover(event) {
		event.currentTarget.hidePopover();
	}
</script>

<button
	{id}
	class="answer-popover"
	type="button"
	popover="auto"
	data-answer-kind={isColorAnswer ? 'color' : 'text'}
	style={answerBackgroundColor
		? `--answer-background-color:${answerBackgroundColor}`
		: undefined}
	onclick={closePopover}
>
	{answerLabel}
</button>

<style>
	.answer-popover {
		border: 3px solid var(--orange-700);
		border-radius: 1rem;
		max-width: min(26rem, calc(100vw - 6rem));
		padding: 1.25rem 1.75rem;
		background-color: hsl(0 0% 100%);
		color: var(--grayscale-900);
		font-family: var(--font-family-primary);
		font-size: clamp(2rem, 8vw, 4rem);
		font-weight: 700;
		line-height: 1.05;
		text-align: center;
		box-shadow: 0 1rem 2rem hsl(0 0% 0% / 0.25);
		cursor: pointer;
	}

	.answer-popover[data-answer-kind='color'] {
		background-color: var(--answer-background-color);
		color: contrast-color(var(--answer-background-color));
	}

	.answer-popover::backdrop {
		background-color: hsl(0 0% 0% / 0.25);
	}
</style>
