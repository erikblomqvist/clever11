<script>
	import { _ } from 'svelte-i18n';
	import { syncDialogOpen } from '$lib/utilities/dialog.js';
	import Button from './Button.svelte';

	/**
	 * @type {{
	 *   open: boolean,
	 *   blobLabel: string,
	 *   correctAnswer: import('$lib/data/game.js').CorrectAnswer | null,
	 *   questionType: import('$lib/data/questionTypes.js').QuestionType,
	 *   seatRotation?: number, // turns
	 *   rotationDurationMs?: number,
	 *   rotationEasing?: string,
	 *   onresult: (isCorrect: boolean) => void,
	 * }}
	 */
	let {
		open,
		blobLabel,
		correctAnswer,
		questionType,
		seatRotation = 0,
		rotationDurationMs = 500,
		rotationEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		onresult,
	} = $props();

	/** @type {HTMLDialogElement | null} */
	let dialogEl = $state(null);
	let revealed = $state(false);

	$effect(() => {
		syncDialogOpen(dialogEl, open);
	});

	$effect(() => {
		if (!open) revealed = false;
	});

	const isBoolean = $derived(typeof correctAnswer === 'boolean');
	const isColor = $derived(
		typeof correctAnswer === 'object' &&
			correctAnswer !== null &&
			'backgroundColor' in correctAnswer,
	);

	const colorStyle = $derived(
		isColor
			? `--answer-bg: ${/** @type {any} */ (correctAnswer).backgroundColor}`
			: '',
	);
</script>

<dialog
	bind:this={dialogEl}
	class="answer-dialog"
	class:answer-dialog--boolean={isBoolean && revealed}
	class:answer-dialog--color={isColor && revealed}
	style={`${colorStyle};--seat-rotation:${seatRotation}turn;--rotation-duration-ms:${rotationDurationMs};--rotation-easing:${rotationEasing}`}
	onkeydown={(e) => e.key === 'Escape' && e.preventDefault()}
	onclick={(e) => e.stopPropagation()}
>
	<p class="answer-dialog__label">{blobLabel}</p>

	{#if revealed}
		{#if isColor}
			<div class="answer-dialog__color-swatch"></div>
		{/if}

		<p
			class="answer-dialog__answer"
			class:answer-dialog__answer--yes={isBoolean && correctAnswer === true}
			class:answer-dialog__answer--no={isBoolean && correctAnswer === false}
		>
			{#if correctAnswer !== null}
				{#if isBoolean}
					{correctAnswer
						? $_('answer_dialog.yes')
						: $_('answer_dialog.no')}
				{:else if questionType === 'centuryDecade'}
					{correctAnswer}-talet
				{:else if isColor}
					{/** @type {any} */ (correctAnswer).text}
				{:else}
					{correctAnswer}
				{/if}
			{/if}
		</p>
	{:else}
		<Button
			class="answer-dialog__reveal-btn"
			text={$_('answer_dialog.reveal')}
			onclick={() => (revealed = true)}
		/>
	{/if}

	<div class="answer-dialog__actions" class:answer-dialog__actions--visible={revealed}>
		<button
			class="answer-dialog__btn answer-dialog__btn--correct"
			type="button"
			onclick={() => onresult(true)}
		>
			{$_('answer_dialog.correct')}
		</button>
		<button
			class="answer-dialog__btn answer-dialog__btn--wrong"
			type="button"
			onclick={() => onresult(false)}
		>
			{$_('answer_dialog.wrong')}
		</button>
	</div>
</dialog>

<style>
	.answer-dialog {
		border: 3px solid var(--orange-700);
		border-radius: 1rem;
		max-width: min(26rem, calc(100vw - 6rem));
		width: 100%;
		padding: 1.5rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		box-shadow: 0 1rem 3rem hsl(0 0% 0% / 0.35);
		text-align: center;
		transform: rotate(var(--seat-rotation, 0turn));
		transition: transform calc(var(--rotation-duration-ms, 500) * 1ms)
			var(--rotation-easing, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.answer-dialog--color {
		background-color: var(--answer-bg, var(--white));
		color: contrast-color(var(--answer-bg, var(--white)));
		border-color: transparent;
	}

	.answer-dialog::backdrop {
		background-color: hsl(0 0% 0% / 0.4);
		backdrop-filter: blur(2px);
	}

	.answer-dialog__label {
		margin: 0 0 0.75rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--grayscale-600);
		border-bottom: 1px solid var(--grayscale-200);
		padding-bottom: 0.75rem;
	}

	.answer-dialog--color .answer-dialog__label {
		color: inherit;
		opacity: 0.7;
		border-color: currentColor;
	}

	.answer-dialog__color-swatch {
		width: 5rem;
		height: 5rem;
		border-radius: 50%;
		background-color: var(--answer-bg);
		border: 3px solid hsl(0 0% 0% / 0.15);
		margin: 0 auto 0.75rem;
	}

	.answer-dialog__answer {
		margin: 0 0 1.5rem;
		font-family: var(--font-family-primary);
		font-size: clamp(2rem, 10vw, 3.5rem);
		font-weight: 700;
		line-height: 1.05;
	}

	.answer-dialog__answer--yes {
		color: hsl(114 62% 38%);
	}

	.answer-dialog__answer--no {
		color: hsl(0 86% 48%);
	}

	.answer-dialog :global(.answer-dialog__reveal-btn) {
		width: 100%;
	}

	.answer-dialog__actions {
		display: none;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		opacity: 0;
		transition:
			opacity 300ms ease,
			display 300ms ease;
		transition-behavior: allow-discrete;
	}

	.answer-dialog__actions--visible {
		display: grid;
		opacity: 1;
	}

	@starting-style {
		.answer-dialog__actions--visible {
			opacity: 0;
		}
	}

	.answer-dialog__btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.answer-dialog__btn--correct {
		background-color: hsl(114 62% 43%);
		color: var(--white);
	}

	.answer-dialog__btn--correct:hover {
		background-color: hsl(114 62% 36%);
	}

	.answer-dialog__btn--wrong {
		background-color: hsl(0 86% 53%);
		color: var(--white);
	}

	.answer-dialog__btn--wrong:hover {
		background-color: hsl(0 86% 44%);
	}
</style>
