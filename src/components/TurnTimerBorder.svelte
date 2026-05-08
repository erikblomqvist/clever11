<script>
	let { durationSeconds, playerColor, paused, running, timeRemaining } = $props();

	const BORDER_WIDTH = 10;
	const HALF = BORDER_WIDTH / 2;

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

	const perimeter = $derived(2 * (width + height) - 4 * BORDER_WIDTH);
	const progress = $derived(durationSeconds > 0 ? timeRemaining / durationSeconds : 0);
	const dashOffset = $derived(perimeter * (1 - progress));
</script>

{#if running}
	<svg
		class="turn-timer-border"
		class:paused
		viewBox="0 0 {width} {height}"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect
			x={HALF}
			y={HALF}
			width={width - BORDER_WIDTH}
			height={height - BORDER_WIDTH}
			rx="0"
			ry="0"
			fill="none"
			stroke={playerColor}
			stroke-width={BORDER_WIDTH}
			stroke-dasharray={perimeter}
			stroke-dashoffset={dashOffset}
			stroke-linecap="butt"
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
	}

	.turn-timer-border rect {
		transition: stroke-dashoffset 1s linear;
	}

	.turn-timer-border.paused rect {
		transition: none;
	}
</style>
