<script>
	import { onMount } from 'svelte';

	let fontReady = false;
	let runAnimation = false;

	onMount(async () => {
		if (typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		if (!document.fonts?.check('1em "Erica One"')) {
			try {
				await document.fonts?.load('1em "Erica One"');
			} catch {
				// Strict mode: keep hidden when required font is unavailable.
				return;
			}
		}

		fontReady = true;

		requestAnimationFrame(() => {
			runAnimation = true;
		});
	});
</script>

<div class="home-title-shell">
	{#if fontReady}
		<h1
			class="home-title"
			class:home-title--animate={runAnimation}
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

		position: relative;
		display: inline-block;
		margin: 0;
		font-family: 'Erica One', sans-serif;
		font-size: clamp(3rem, 10vw, 6rem);
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--palette-white);

		/* Force stacking context for the whole title */
		isolation: isolate;
	}

	.home-title__clever,
	.home-title__blob,
	.home-title__eleven {
		opacity: 0;
	}

	.home-title__clever {
		position: relative;
		z-index: 1;
		clip-path: inset(0 100% 0 0);
	}

	.home-title__blob {
		position: absolute;
		inset-block-start: 54%;
		inset-inline-start: 0;
		z-index: 2;
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
		pointer-events: none;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			z-index: -1;
			border-radius: inherit;
		}
	}

	.home-title__eleven {
		position: relative;
		z-index: 3;
		display: inline-block;
	}

	.home-title--animate .home-title__blob {
		animation: blob-full-intro 1260ms cubic-bezier(0.2, 0.65, 0.15, 1)
			forwards;

		&::before {
			/* Unified shadow animation for the blob (duration 2.6s covering intro + handover) */
			animation: blob-shadow-full-sequence 2600ms ease-out forwards;
		}
	}

	.home-title--animate .home-title__clever {
		animation:
			clever-reveal 660ms 410ms cubic-bezier(0.16, 0.8, 0.2, 1) forwards,
			dynamic-text-shadow-full-sequence 2600ms ease-in-out forwards;
	}

	.home-title--animate .home-title__eleven {
		animation: eleven-reveal 420ms 1350ms
			linear(
				0,
				0.009,
				0.035 2.1%,
				0.141,
				0.281 6.7%,
				0.723 12.9%,
				0.938 16.7%,
				1.017,
				1.077,
				1.121,
				1.149 24.3%,
				1.159,
				1.163,
				1.161,
				1.154 29.9%,
				1.129 32.8%,
				1.051 39.6%,
				1.017 43.1%,
				0.991,
				0.977 51%,
				0.974 53.8%,
				0.975 57.1%,
				0.997 69.8%,
				1.003 76.9%,
				1.004 83.8%,
				1
			)
			forwards;
	}

	@keyframes blob-full-intro {
		0% {
			opacity: 0;
			translate: var(--blob-start-x) calc(0.45em - 50%);
			scale: 0.12;
		}
		30% {
			opacity: 1;
			translate: var(--blob-start-x) -50%;
			scale: 1.1;
		}
		100% {
			opacity: 1;
			translate: var(--blob-end-x) -50%;
			scale: 1;
		}
	}

	@keyframes blob-shadow-full-sequence {
		/* 0ms to 380ms (approx 15%) */
		0% {
			box-shadow: 0 0 0 0 lch(0 0 0 / 0.4);
		}
		15% {
			box-shadow: -20px 30px 10px 10px lch(0 0 0 / 0.4);
		}
		/* 1260ms (approx 48%) - Blob has landed */
		48% {
			box-shadow: 0 0 0 0 lch(0 0 0 / 0.4);
		}
		/* 1800ms (approx 69%) - Start handover */
		69% {
			box-shadow: 0 0 0 0 lch(0 0 0 / 0.4);
		}
		/* 2600ms (100%) - Dynamic spotlight shadow active */
		100% {
			box-shadow: var(--dynamic-shadow);
		}
	}

	@keyframes dynamic-text-shadow-full-sequence {
		/* 0ms to 1800ms (0 to 69%) - Standard static intro shadow */
		0%,
		69% {
			text-shadow: 0 2px 8px hsl(0 0% 0% / 0.2);
		}
		/* 2600ms (100%) - Dynamic spotlight shadow active */
		100% {
			text-shadow: var(--dynamic-text-shadow);
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
</style>
