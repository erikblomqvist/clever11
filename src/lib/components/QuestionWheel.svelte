<script>
	import AnswerBlob from './AnswerBlob.svelte';
	import AnswerTextPopover from './AnswerTextPopover.svelte';
	import { QUESTION_TYPES } from '$lib/data/questionTypes.js';
	import { ENABLE_STREAK_ANIMATIONS } from '$lib/streak-config.js';

	/**
	 * @type {{
	 *   questionType: import('$lib/data/questionTypes.js').QuestionType,
	 *   questionText: string,
	 *   answers: string[],
	 *   correctAnswers: (boolean|string|number|{ text: string, backgroundColor: string })[],
	 *   answerMedia?: Record<string, any>[],
	 *   blobs?: (boolean|null)[],
	 *   seatRotation?: number, // turns
	 *   rotationDurationMs?: number,
	 *   rotationEasing?: string,
	 *   streakLevel?: number,
	 *   streakColor?: string,
	 *   streakBurstKey?: number,
	 *   undoableBlobIndex?: number|null,
	 *   volcanoRumbleEnabled?: boolean,
	 *   reviewToggleMode?: boolean,
	 *   onblobclick?: (index: number) => void,
	 *   onundoblobclick?: (index: number) => void,
	 * }}
	 */
	let {
		questionType,
		questionText,
		answers,
		correctAnswers,
		answerMedia = [],
		blobs,
		seatRotation = 0,
		rotationDurationMs = 500,
		rotationEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		streakLevel = 0,
		streakColor = 'var(--orange-700)',
		streakBurstKey = 0,
		undoableBlobIndex = null,
		volcanoRumbleEnabled = false,
		reviewToggleMode = false,
		onblobclick,
		onundoblobclick,
	} = $props();

	const answerBlobs = $derived(blobs ?? answers.map(() => null));
	const unrevealedIndices = $derived(
		answerBlobs
			.map((blob, i) => (blob === null ? i : null))
			.filter((i) => i !== null),
	);
	const lastUnrevealedIndex = $derived(
		unrevealedIndices.length === 1 ? unrevealedIndices[0] : null,
	);
	const questionTypeToken = $derived(
		QUESTION_TYPES[questionType]?.cssToken ?? 'standard',
	);
	const optionImageUrls = $derived(
		answers.map((_, index) => getOptionImageUrl(answerMedia[index])),
	);
	const usesImageOptions = $derived(
		optionImageUrls.length === answers.length &&
			optionImageUrls.length > 0 &&
			optionImageUrls.every(Boolean),
	);
	const popoverIdPrefix = Math.random().toString(36).slice(2);
	const electricFilterId = `question-wheel-electric-${popoverIdPrefix}`;

	const streakIsActive = $derived(
		ENABLE_STREAK_ANIMATIONS && streakLevel >= 3,
	);
	const streakIntensity = $derived(Math.min(Math.max(streakLevel - 2, 0), 6));
	const streakDisplacementScale = $derived(10 + streakIntensity * 4);
	const streakRingWidth = $derived(`${2 + streakIntensity * 0.55}px`);
	const streakSparkWidth = $derived(`${7 + streakIntensity * 1.4}px`);
	const streakGlowOpacity = $derived(
		Math.min(0.32 + streakIntensity * 0.08, 0.82),
	);
	const streakSparkOpacity = $derived(
		Math.min(0.45 + streakIntensity * 0.08, 0.9),
	);
	const streakInnerGlowOpacity = $derived(
		Math.min(streakGlowOpacity * 0.75, 0.62),
	);
	const streakOuterBlur = $derived(`${0.6 + streakIntensity * 0.08}rem`);
	const streakGlowBlur = $derived(`${0.55 + streakIntensity * 0.16}rem`);
	const streakInsetGlowBlur = $derived(`${0.5 + streakIntensity * 0.12}rem`);

	/** @param {Record<string, any>|undefined} media */
	function getOptionImageUrl(media) {
		return typeof media?.option_image_url === 'string'
			? media.option_image_url.trim()
			: '';
	}

	/** @param {number} index */
	function getAnswerPopoverId(index) {
		return `answer-popover-${popoverIdPrefix}-${index}`;
	}
</script>

<div
	class="container"
	class:container--streak={streakIsActive}
	class:container--spotlight={lastUnrevealedIndex !== null &&
		volcanoRumbleEnabled}
	style="--seat-rotation:{seatRotation}turn;--rotation-duration-ms:{rotationDurationMs};--rotation-easing:{rotationEasing};--streak-color:{streakColor};--streak-intensity:{streakIntensity};--streak-ring-width:{streakRingWidth};--streak-spark-width:{streakSparkWidth};--streak-glow-opacity:{streakGlowOpacity};--streak-inner-glow-opacity:{streakInnerGlowOpacity};--streak-spark-opacity:{streakSparkOpacity};--streak-outer-blur:{streakOuterBlur};--streak-glow-blur:{streakGlowBlur};--streak-inset-glow-blur:{streakInsetGlowBlur}"
>
	{#if streakIsActive}
		<svg class="electric-filter-svg" aria-hidden="true" focusable="false">
			<defs>
				<filter
					id={electricFilterId}
					color-interpolation-filters="sRGB"
					x="-30%"
					y="-30%"
					width="160%"
					height="160%"
				>
					<feTurbulence
						type="turbulence"
						baseFrequency="0.018"
						numOctaves="8"
						result="noise1"
						seed="2"
					/>
					<feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
						<animate
							attributeName="dy"
							values="480;0"
							dur="5s"
							repeatCount="indefinite"
							calcMode="linear"
						/>
					</feOffset>

					<feTurbulence
						type="turbulence"
						baseFrequency="0.028"
						numOctaves="6"
						result="noise2"
						seed="7"
					/>
					<feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
						<animate
							attributeName="dx"
							values="-260;260"
							dur="4s"
							repeatCount="indefinite"
							calcMode="linear"
						/>
					</feOffset>

					<feBlend
						in="offsetNoise1"
						in2="offsetNoise2"
						mode="color-dodge"
						result="combinedNoise"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="combinedNoise"
						scale={streakDisplacementScale}
						xChannelSelector="R"
						yChannelSelector="B"
					/>
				</filter>
			</defs>
		</svg>

		<div class="electric-field" aria-hidden="true">
			<span class="electric-glow electric-glow--outer"></span>
			<span class="electric-glow electric-glow--inner"></span>
			<span
				class="electric-ring"
				style:filter={`url(#${electricFilterId})`}
			></span>
			<!-- <span class="electric-sparks"></span> -->
			{#key streakBurstKey}
				{#if streakBurstKey > 0}
					<span class="electric-burst"></span>
				{/if}
			{/key}
		</div>
	{/if}

	<div class={`question question--${questionTypeToken}`}>
		<p>{questionText}</p>
	</div>

	<div class="blobs">
		{#each answerBlobs as blob, i (i)}
			<AnswerBlob
				answered={blob}
				correctAnswer={correctAnswers[i]}
				{questionType}
				index={i + 1}
				total={answerBlobs.length}
				isLastUnrevealed={lastUnrevealedIndex === i &&
					volcanoRumbleEnabled}
				onreveal={blob === null ? () => onblobclick?.(i) : undefined}
				onansweredclick={blob !== null
					? undoableBlobIndex === i
						? () => onundoblobclick?.(i)
						: reviewToggleMode
							? () => onblobclick?.(i)
							: undefined
					: undefined}
				answeredClickKind={reviewToggleMode && undoableBlobIndex !== i
					? 'hide'
					: 'undo'}
			/>
		{/each}
	</div>

	<div class="answers">
		{#each answers as answer, i (i)}
			<button
				class="answer"
				class:answer--image={usesImageOptions}
				type="button"
				popovertarget={getAnswerPopoverId(i)}
				aria-label={`Show full answer: ${answer}`}
				data-is-spotlight={lastUnrevealedIndex === i}
				style="--index:{i + 1};--total:{answers.length}"
			>
				{#if usesImageOptions}
					<img
						class="answer-image"
						src={optionImageUrls[i]}
						alt={answer}
						loading="eager"
					/>
				{:else}
					<span class="answer-text">{answer}</span>
				{/if}
			</button>
		{/each}
	</div>

	{#each answers as answer, i (i)}
		<AnswerTextPopover
			id={getAnswerPopoverId(i)}
			text={answer}
			{seatRotation}
		/>
	{/each}
</div>

<style>
	.container {
		--container-size: min(70cqmin, 32em);
		--container-radius: calc(var(--container-size) / 2);
		--question-scale: 0.55;
		--question-size: calc(var(--container-size) * var(--question-scale));
		--question-radius: calc(var(--question-size) / 2);
		--question-padding: calc(var(--question-size) * 0.12);
		--answer-radius: calc(var(--container-size) / 2.6);
		--blob-radius: calc(var(--container-size) / 1.6);

		position: relative;
		display: grid;
		place-items: center;
		border-radius: 50%;
		width: var(--container-size);
		height: var(--container-size);
		background-color: hsl(0, 0%, 100%);
		transform: rotate(var(--seat-rotation, 0turn));
		transition: transform calc(var(--rotation-duration-ms, 500) * 1ms)
			var(--rotation-easing, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.container::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		border-radius: inherit;
		box-shadow:
			inset -1px 2px 4px hsl(0 0% 0% / 0.25),
			inset 3px -4px 10px 2px hsl(0 0% 0% / 0.25);
	}

	.container--spotlight {
		background-color: hsl(0 0% 90%);
	}

	.container--spotlight :global(.blob:not([data-last-unrevealed='true'])) {
		opacity: 0.4;
		filter: grayscale(0.8) blur(0.5px);
		transition:
			opacity 0.5s ease,
			filter 0.5s ease;
	}

	.container--spotlight .answer:not([data-is-spotlight='true']) {
		opacity: 0.25;
		filter: grayscale(1) blur(1px);
		transition:
			opacity 0.5s ease,
			filter 0.5s ease;
	}

	.container--spotlight .answer[data-is-spotlight='true'] {
		scale: 1.1;
		transition: scale 0.5s ease;
	}

	.electric-filter-svg {
		position: absolute;
		overflow: hidden;
		width: 0;
		height: 0;
	}

	.electric-field {
		position: absolute;
		inset: -3.5%;
		z-index: 3;
		border-radius: inherit;
		pointer-events: none;
	}

	.electric-field > span {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
	}

	.electric-glow--outer {
		opacity: var(--streak-glow-opacity);
		background: radial-gradient(
			circle,
			transparent 58%,
			color-mix(in srgb, var(--streak-color), white 40%) 66%,
			transparent 73%
		);
		filter: blur(var(--streak-outer-blur));
		mix-blend-mode: screen;
	}

	.electric-glow--inner {
		inset: 4%;
		border: 1px solid color-mix(in srgb, var(--streak-color), white 42%);
		opacity: var(--streak-inner-glow-opacity);
		box-shadow:
			0 0 var(--streak-glow-blur) var(--streak-color),
			inset 0 0 var(--streak-inset-glow-blur)
				color-mix(in srgb, var(--streak-color), white 24%);
	}

	.electric-ring {
		border: var(--streak-ring-width) solid
			color-mix(in srgb, var(--streak-color), white 36%);
		opacity: 0.94;
		box-shadow:
			0 0 0.3rem color-mix(in srgb, var(--streak-color), white 55%),
			0 0 var(--streak-glow-blur) var(--streak-color);
		mix-blend-mode: screen;
	}

	.electric-sparks {
		opacity: var(--streak-spark-opacity);
		background:
			repeating-conic-gradient(
				from 8deg,
				transparent 0deg 7deg,
				color-mix(in srgb, var(--streak-color), white 74%) 8deg 9deg,
				transparent 10deg 17deg,
				var(--streak-color) 18deg 19deg,
				transparent 20deg 31deg
			),
			repeating-conic-gradient(
				from -16deg,
				transparent 0deg 15deg,
				color-mix(in srgb, var(--streak-color), white 48%) 16deg 18deg,
				transparent 19deg 36deg
			);
		filter: blur(0.45px);
		mask: radial-gradient(
			farthest-side,
			transparent calc(100% - var(--streak-spark-width) - 2px),
			hsl(0 0% 0%) calc(100% - var(--streak-spark-width)),
			hsl(0 0% 0%) calc(100% - 1px),
			transparent 100%
		);
		-webkit-mask: radial-gradient(
			farthest-side,
			transparent calc(100% - var(--streak-spark-width) - 2px),
			hsl(0 0% 0%) calc(100% - var(--streak-spark-width)),
			hsl(0 0% 0%) calc(100% - 1px),
			transparent 100%
		);
		animation: electric-spark-spin 1.2s linear infinite;
	}

	.electric-burst {
		inset: -5%;
		border: max(3px, var(--streak-ring-width)) solid
			color-mix(in srgb, var(--streak-color), white 66%);
		box-shadow:
			0 0 0.5rem color-mix(in srgb, var(--streak-color), white 70%),
			0 0 1.6rem var(--streak-color),
			inset 0 0 1rem color-mix(in srgb, var(--streak-color), white 45%);
		animation: electric-burst 1s ease-out both;
	}

	@keyframes electric-spark-spin {
		to {
			rotate: 1turn;
		}
	}

	@keyframes electric-burst {
		0% {
			opacity: 0;
			scale: 0.94;
		}

		18% {
			opacity: 1;
			scale: 1.01;
		}

		100% {
			opacity: 0;
			scale: 1.12;
		}
	}

	@container body (width <= 36rem) {
		.container {
			--question-scale: 0.5;
			--question-padding: 1.5em;
		}
	}

	@container body (height <= 36rem) {
		.container {
			--question-scale: 0.5;
			--question-padding: 1.5em;
		}
	}

	@container body (width <= 27rem) {
		.container {
			--question-scale: 0.45;
			--question-padding: 1em;
		}
	}

	@container body (height <= 27rem) {
		.container {
			--question-scale: 0.45;
			--question-padding: 1em;
		}
	}

	.question {
		--question-pattern-width: clamp(
			0.45rem,
			calc(var(--question-size) * 0.035),
			0.8rem
		);
		--question-pattern-color: var(--question-color);
		--question-pattern: var(--question-color);

		box-sizing: border-box;
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		border-radius: 50%;
		overflow: hidden;
		width: var(--question-size);
		height: var(--question-size);
		padding: var(--question-padding);
		background: var(--white);
		box-shadow: 0 0 0 1px hsl(0 0% 0%);
		text-align: center;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			z-index: 0;
			border-radius: inherit;
			background: var(--question-pattern);
			pointer-events: none;
			-webkit-mask: radial-gradient(
				farthest-side,
				transparent calc(100% - var(--question-pattern-width)),
				hsl(0 0% 0%) calc(100% - var(--question-pattern-width) + 1px)
			);
			mask: radial-gradient(
				farthest-side,
				transparent calc(100% - var(--question-pattern-width)),
				hsl(0 0% 0%) calc(100% - var(--question-pattern-width) + 1px)
			);
		}
	}

	.question--standard {
		--question-pattern:
			radial-gradient(
					circle at 50% 20%,
					var(--question-pattern-color) 0 0.22rem,
					transparent 0.24rem
				)
				0 0 / 1rem 0.65rem,
			radial-gradient(
					circle at 50% 80%,
					var(--question-pattern-color) 0 0.22rem,
					transparent 0.24rem
				)
				0.5rem 0 / 1rem 0.65rem;
	}

	.question--boolean {
		--question-pattern: repeating-conic-gradient(
			from 9deg,
			var(--question-pattern-color) 0deg 13deg,
			transparent 13deg 26deg
		);
	}

	.question--rank {
		--question-pattern:
			repeating-conic-gradient(
				from 2deg,
				hsl(0 0% 0% / 0.25) 0deg 2deg,
				transparent 2deg 10deg
			),
			repeating-linear-gradient(
				90deg,
				var(--question-pattern-color) 0 0.18rem,
				transparent 0.18rem 0.36rem,
				var(--question-pattern-color) 0.36rem 0.62rem,
				transparent 0.62rem 0.95rem
			);
	}

	.question--choose-between {
		--question-pattern: conic-gradient(
				from 45deg,
				var(--question-pattern-color) 0 25%,
				transparent 0 50%,
				var(--question-pattern-color) 0 75%,
				transparent 0
			)
			0 0 / 0.9rem 0.9rem;
	}

	.question--colors {
		--question-pattern:
			radial-gradient(
					circle,
					hsl(330 100% 71%) 0 0.16rem,
					transparent 0.18rem
				)
				0 0 / 0.62rem 0.62rem,
			radial-gradient(
					circle,
					hsl(46 100% 62%) 0 0.18rem,
					transparent 0.2rem
				)
				0.3rem 0.1rem / 0.72rem 0.72rem,
			radial-gradient(
					circle,
					hsl(206 100% 42%) 0 0.14rem,
					transparent 0.16rem
				)
				0.1rem 0.36rem / 0.68rem 0.68rem;
	}

	.question--numbers {
		--question-pattern:
			linear-gradient(
					90deg,
					transparent 0 30%,
					var(--question-pattern-color) 30% 45%,
					transparent 45% 55%,
					var(--question-pattern-color) 55% 70%,
					transparent 70%
				)
				0 0 / 0.9rem 0.9rem,
			linear-gradient(
					0deg,
					var(--question-pattern-color) 0 18%,
					transparent 18% 82%,
					var(--question-pattern-color) 82% 100%
				)
				0.45rem 0.45rem / 0.9rem 0.9rem;
	}

	.question--century-decade {
		--question-pattern:
			repeating-conic-gradient(
				from -1deg,
				var(--question-pattern-color) 0deg 3deg,
				transparent 3deg 10deg
			),
			repeating-conic-gradient(
				from 0deg,
				hsl(0 0% 0% / 0.3) 0deg 1deg,
				transparent 1deg 30deg
			);
	}

	.question p {
		position: relative;
		z-index: 1;
		margin: 0;
		font-size: clamp(0.875rem, calc(var(--question-size) * 0.13), 1.5rem);
		line-height: 1.1;
		/* text-wrap: balance; */
		overflow-wrap: break-word;
		hyphens: auto;
	}

	.blobs,
	.answers {
		pointer-events: none;
		position: absolute;
		inset: 0;
	}

	.answers {
		clip-path: circle(50% at 50% 50%);
	}

	.answer {
		--angle-fraction: calc(((var(--index) - 1) / var(--total)) - 0.25);
		--angle-in-turns: calc(var(--angle-fraction) * 1turn);
		--answer-slot-width: calc(
			2 * var(--answer-radius) * sin(calc(0.5turn / var(--total))) * 0.85
		);
		--connector-outer-length: calc(
			var(--container-radius) - var(--answer-radius)
		);
		--connector-length: calc(
			var(--container-radius) - var(--question-radius)
		);

		pointer-events: auto;
		appearance: none;
		position: absolute;
		top: calc(50% + sin(var(--angle-in-turns)) * var(--answer-radius));
		left: calc(50% + cos(var(--angle-in-turns)) * var(--answer-radius));
		display: grid;
		place-items: center;
		z-index: 0;
		border: 0;
		margin: 0;
		padding: 0;
		width: var(--answer-slot-width);
		background: none;
		color: inherit;
		font: inherit;
		transform: translate(-50%, -50%);
		text-align: center;
		cursor: pointer;
	}

	.answer:focus-visible {
		outline: 3px solid var(--orange-800);
		outline-offset: 3px;
	}

	.answer::before {
		content: '';
		position: absolute;
		top: calc(50% - var(--connector-outer-length));
		left: 50%;
		z-index: 0;
		width: 1px;
		height: var(--connector-length);
		margin-inline-start: -0.5px;
		background-color: hsl(0 0% 0% / 0.2);
		mask: linear-gradient(
			to bottom,
			hsl(0 0% 0%) 0 20%,
			transparent 20% 80%,
			hsl(0 0% 0%) 80%
		);
		rotate: calc(var(--angle-in-turns) + 0.25turn);
		transform-origin: 50% var(--connector-outer-length);
	}

	.answer-text {
		position: relative;
		z-index: 1;
		display: -webkit-box;
		box-sizing: border-box;
		overflow: hidden;

		max-width: 100%;
		padding-inline: 0.35em;

		font-size: clamp(
			0.75rem,
			calc(var(--container-size) * 0.035),
			0.875rem
		);
		line-height: 1.1;
		hyphens: manual;
		text-wrap: balance;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.answer--image {
		width: calc(var(--answer-slot-width) * 1.18);
	}

	.answer-image {
		position: relative;
		z-index: 1;
		display: block;
		box-sizing: border-box;
		width: min(100%, calc(var(--container-size) * 0.16));
		aspect-ratio: 1;
		border-radius: 0.5rem;
		object-fit: contain;
		background: hsl(0 0% 100% / 0.72);
	}

	@container body (width >= 40rem) {
		.answer-text {
			-webkit-line-clamp: 3;
			line-clamp: 3;
		}
	}
</style>
