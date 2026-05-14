<script>
	import { _ } from 'svelte-i18n';
	import { Check, X } from 'lucide-svelte';

	/**
	 * @type {{
	 *   answered: boolean|null,
	 *   correctAnswer: import('$lib/data/game.js').CorrectAnswer,
	 *   questionType?: import('$lib/data/questionTypes.js').QuestionType,
	 *   index: number,
	 *   total: number,
	 *   isLastUnrevealed?: boolean,
	 *   onreveal?: () => void,
	 *   onansweredclick?: () => void,
	 * }}
	 */
	let {
		answered = null,
		correctAnswer,
		questionType,
		index,
		total,
		isLastUnrevealed = false,
		onreveal,
		onansweredclick,
	} = $props();

	const isAnswered = $derived(answered !== null);
	const isBooleanAnswer = $derived(typeof correctAnswer === 'boolean');
	const isColorAnswer = $derived(
		typeof correctAnswer === 'object' &&
			correctAnswer !== null &&
			'backgroundColor' in correctAnswer,
	);
	const isCorrect = $derived(answered === true);
	const displayAnswer = $derived(
		questionType === 'centuryDecade'
			? String(correctAnswer).includes('-talet')
				? correctAnswer
				: `${correctAnswer}-talet`
			: correctAnswer,
	);
	const answerLabel = $derived(
		isColorAnswer
			? /** @type {any} */ (correctAnswer).text
			: String(displayAnswer),
	);
	const answerBackgroundColor = $derived(
		isColorAnswer
			? /** @type {any} */ (correctAnswer).backgroundColor
			: undefined,
	);
</script>

<button
	class="blob"
	type="button"
	data-answered={isAnswered}
	data-correct={isAnswered
		? isBooleanAnswer
			? !!correctAnswer
			: isCorrect
		: undefined}
	data-answer-kind={isBooleanAnswer
		? 'boolean'
		: isColorAnswer
			? 'color'
			: 'text'}
	data-question-type={questionType}
	data-last-unrevealed={isLastUnrevealed}
	style="--index:{index};--total:{total}{answerBackgroundColor
		? `;--answer-background-color:${answerBackgroundColor}`
		: ''}"
	aria-label={isAnswered
		? onansweredclick
			? $_('blob.undo_aria', { values: { answer: answerLabel } })
			: $_('blob.answer_aria', { values: { answer: answerLabel } })
		: $_('blob.reveal_aria', { values: { n: index } })}
	onclick={() => {
		if (answered === null) onreveal?.();
		else onansweredclick?.();
	}}
>
	{#if isAnswered}
		{#if isBooleanAnswer}
			<div class="blob-icon">
				{#if correctAnswer}
					<Check />
				{:else}
					<X />
				{/if}
			</div>
		{:else}
			<span class="blob-answer">{answerLabel}</span>
		{/if}
	{/if}
</button>

<style>
	.blob {
		--angle-fraction: calc(((var(--index) - 1) / var(--total)) - 0.25);
		--angle-in-turns: calc(var(--angle-fraction) * 1turn);
		--hue: 233;

		pointer-events: auto;
		appearance: none;
		position: absolute;
		top: calc(50% + sin(var(--angle-in-turns)) * var(--blob-radius));
		left: calc(50% + cos(var(--angle-in-turns)) * var(--blob-radius));
		display: grid;
		place-items: center;
		box-sizing: content-box;
		border: 0;
		border-radius: 50%;
		margin: 0;
		padding: 0;
		background: none;
		color: inherit;
		font: inherit;
		line-height: 1;
		width: calc(var(--container-size) / 6);
		height: calc(var(--container-size) / 6);
		transform: translate(-50%, -50%);
		cursor: pointer;
	}

	.blob[data-answered='false'] {
		background-color: hsl(var(--hue) 10% 15%);
		background-image:
			radial-gradient(
				91% 90% at 50% 50%,
				hsl(var(--hue) 10% 20%) 48%,
				hsl(var(--hue) 10% 20% / 0) 50%
			),
			radial-gradient(
				88% 88% at 47% 47%,
				hsl(var(--hue) 10% 85%) 43%,
				hsl(var(--hue) 10% 85% / 0) 50%
			),
			radial-gradient(
				65% 70% at 40% 60%,
				hsl(var(--hue) 10% 20%) 46%,
				hsl(var(--hue) 10% 20% / 0) 50%
			);
	}

	.blob[data-last-unrevealed='true']:not([data-answered='true']) {
		z-index: 10;

		scale: 1.15;
		animation: volcano-rumble 1.5s ease-in-out infinite;
		transform-origin: top left;

		&::before {
			content: '';
			position: absolute;
			inset: -2cqi;
			z-index: -1;

			border-radius: inherit;
			border: 1px dashed color-mix(in oklab, var(--color-amber) 70%, transparent);
		}
	}

	@keyframes volcano-rumble {
		0%, 100% {
			scale: 1;
		}
		50% {
			scale: 1.10;
		}
	}

	.blob[data-answered='true'] {
		background-color: hsl(0 0% 100%);
		box-shadow: inset 2px -2px hsl(0 0% 0% / 0.15);
	}

	.blob[data-answer-kind='color'][data-answered='true'] {
		background-color: var(--answer-background-color);
		color: contrast-color(var(--answer-background-color));
	}

	.blob:focus-visible {
		outline: 3px solid var(--orange-800);
		outline-offset: 3px;
	}

	.blob-icon {
		display: grid;
		place-items: center;
		border-radius: 50%;
		width: calc(100% / 3 * 2);
		height: calc(100% / 3 * 2);
	}

	.blob-icon :global(svg) {
		width: 70%;
		height: 70%;
		color: hsl(0 0% 100%);
	}

	.blob[data-correct='true'] .blob-icon {
		background-color: hsl(114 62% 53%);
	}

	.blob[data-correct='false'] .blob-icon {
		background-color: hsl(0 86% 58%);
	}

	.blob-answer {
		display: -webkit-box;
		overflow: hidden;
		padding: 0.25em;
		color: var(--grayscale-900);
		font-family: var(--font-family-primary);
		font-size: clamp(0.55rem, 1.75cqmin, 0.875rem);
		font-weight: 700;
		line-height: 1;
		text-align: center;
		text-wrap: balance;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.blob[data-answer-kind='color'] .blob-answer {
		color: inherit;
	}

	.blob[data-question-type='rank'] .blob-answer {
		font-size: calc(1.25 * clamp(0.55rem, 1.75cqmin, 0.875rem));
	}
</style>
