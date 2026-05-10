<script>
	import { onMount } from 'svelte';

	let fontReady = false;
	let runAnimation = false;
	let reducedMotion = false;

	onMount(async () => {
		if (typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		reducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;

		if (!document.fonts?.check('1em "Erica One"')) {
			try {
				await document.fonts?.load('1em "Erica One"');
			} catch {
				// Strict mode: keep hidden when required font is unavailable.
				return;
			}
		}

		fontReady = true;

		if (!reducedMotion) {
			requestAnimationFrame(() => {
				runAnimation = true;
			});
		}
	});
</script>

<div class="home-title-shell">
	{#if fontReady}
		<h1
			class="home-title"
			class:home-title--animate={runAnimation}
			class:home-title--reduced={reducedMotion}
			aria-label="Clever 11"
		>
			<span class="home-title__clever">Clever</span>
			<span class="home-title__blob" aria-hidden="true"></span>
			<span class="home-title__eleven">11</span>
		</h1>
	{/if}
</div>

<style>
	.home-title-shell {
		display: grid;
		place-items: center;
		block-size: clamp(3.4rem, 10.8vw, 6.7rem);
	}

	.home-title {
		--hue: 233;
		--blob-start-x: 0.12em;
		--blob-end-x: 5.82ch;
		--animation-step-1: 380ms;
		--animation-step-2: calc(var(--animation-step-1) + 440ms);

		position: relative;
		display: inline-block;
		margin: 0;
		font-family: 'Erica One', sans-serif;
		font-size: clamp(3rem, 10vw, 6rem);
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-shadow: 0 2px 8px hsl(0 0% 0% / 0.2);
		color: var(--palette-white);
	}

	.home-title__clever,
	.home-title__blob,
	.home-title__eleven {
		opacity: 0;
	}

	.home-title__clever {
		z-index: 0;
		clip-path: inset(0 100% 0 0);
	}

	@property --shadow-x {
		syntax: '<length>';
		inherits: false;
		initial-value: -20px;
	}

	@property --shadow-y {
		syntax: '<length>';
		inherits: false;
		initial-value: 30px;
	}

	@property --shadow-blur {
		syntax: '<length>';
		inherits: false;
		initial-value: 10px;
	}

	@property --shadow-spread {
		syntax: '<length>';
		inherits: false;
		initial-value: 10px;
	}
	
	.home-title__blob {
		position: absolute;
		inset-block-start: 54%;
		inset-inline-start: 0;
		z-index: 1;
		box-sizing: border-box;
		width: 1.5em;
		height: 1.5em;
		border-radius: 50%;
		padding-inline: 0.3ch;
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
		translate: var(--blob-start-x) -50%;
		scale: 0.8;

		&::before {
			content: "";
			position: absolute;
			inset: 0;
			z-index: 0;

			border-radius: inherit;
			box-shadow:
				var(--shadow-x)
				var(--shadow-y)
				var(--shadow-blur)
				var(--shadow-spread)
				lch(0 0 0 / 0.4);
		}
	}

	.home-title__eleven {
		position: relative;
		z-index: 2;
		display: inline-block;
	}

	.home-title--animate .home-title__blob {
		animation:
			blob-enter
			var(--animation-step-1) /* Duration */
			ease
			forwards,

			blob-sweep
			var(--animation-step-2) /* Duration */
			calc(var(--animation-step-1) + 10ms) /* Delay */
			cubic-bezier(0.2, 0.65, 0.15, 1)
			forwards;

		&::before {
			animation:
				shadow-movement
				var(--animation-step-2) /* Duration */
				var(--animation-step-1) /* Delay */
				ease
				forwards;
		}
	}

	.home-title--animate .home-title__clever {
		animation:
			clever-reveal
			calc(var(--animation-step-2) - 200ms) /* Duration */
			calc(var(--animation-step-1) + 30ms) /* Delay */
			cubic-bezier(0.16, 0.8, 0.2, 1)
			forwards;
	}

	.home-title--animate .home-title__eleven {
		animation:
			eleven-reveal
			420ms
			1350ms
			linear(
				0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017,
				1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%,
				1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%,
				0.997 69.8%, 1.003 76.9%, 1.004 83.8%, 1
			)
			forwards;
	}

	.home-title--reduced .home-title__clever,
	.home-title--reduced .home-title__blob,
	.home-title--reduced .home-title__eleven {
		opacity: 1;
	}

	.home-title--reduced .home-title__clever {
		clip-path: inset(0 0 0 0);
	}

	.home-title--reduced .home-title__blob {
		translate: var(--blob-end-x) -50%;
	}

	@keyframes blob-enter {
		from {
			opacity: 0;
			translate: var(--blob-start-x) calc(0.45em - 50%);
			scale: 0.12;
		}
		to {
			opacity: 1;
			translate: var(--blob-start-x) -50%;
			scale: 1.1;
		}
	}

	@keyframes blob-sweep {
		from {
			translate: var(--blob-start-x) -50%;
			scale: 1.1;
		}
		to {
			opacity: 1;
			translate: var(--blob-end-x) -50%;
			scale: 1;
		}
	}

	@keyframes shadow-movement {
		from {
			--shadow-x: -20px;
			--shadow-y: 30px;
			--shadow-blur: 10px;
			--shadow-spread: 10px;
		}
		to {
			--shadow-x: 0;
			--shadow-y: 0;
			--shadow-blur: 0;
			--shadow-spread: 0;
		}
	}

	@keyframes clever-reveal {
		from {
			opacity: 0;
			clip-path: inset(0 100% 0 0);
		}
		to {
			opacity: 1;
			clip-path: inset(0 0 0 0);
		}
	}

	@keyframes eleven-reveal {
		from {
			opacity: 0.2;
			scale: 0.5;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.home-title--animate .home-title__blob,
		.home-title--animate .home-title__clever,
		.home-title--animate .home-title__eleven {
			animation: none;
		}
	}
</style>
