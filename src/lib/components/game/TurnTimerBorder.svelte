<script>
	let { durationSeconds, playerColor, running, timeRemaining } = $props();

	const BORDER_WIDTH = 10;

	let width = $state(0);
	let height = $state(0);

	$effect(() => {
		function update() {
			width = window.innerWidth;
			height = window.innerHeight;
		}
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	});

	const MASK_STROKE = BORDER_WIDTH * 2;
	const perimeter = $derived(2 * (width + height));
	const progress = $derived(
		durationSeconds > 0 ? timeRemaining / durationSeconds : 0,
	);
	const dashOffset = $derived(perimeter * (1 - progress));

	const borderPath = $derived.by(() => {
		const B = BORDER_WIDTH;
		const w = width;
		const h = height;
		const outer = `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
		const inner = `M ${B} ${B} L ${w - B} ${B} L ${w - B} ${h - B} L ${B} ${h - B} Z`;
		return `${outer} ${inner}`;
	});
</script>

{#if running}
	<svg
		class="turn-timer-border"
		viewBox="0 0 {width} {height}"
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<mask id="timer-mask">
				<rect
					x="0"
					y="0"
					{width}
					{height}
					fill="none"
					stroke="white"
					stroke-width={MASK_STROKE}
					stroke-dasharray={perimeter}
					stroke-dashoffset={dashOffset}
				/>
			</mask>
		</defs>
		<path
			d={borderPath}
			fill-rule="evenodd"
			style="--fill-color: {playerColor};"
			mask="url(#timer-mask)"
		/>
	</svg>
{/if}

<style>
	.turn-timer-border {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 90;
		pointer-events: none;
		overflow: hidden;
	}

	.turn-timer-border path {
		fill: hsl(from var(--fill-color) h s calc(l - 12));
	}
</style>
