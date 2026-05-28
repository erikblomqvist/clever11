<script>
	let { icon, label = '', onclick, danger = false, size = 30 } = $props();
</script>

<button
	class="icon-button"
	class:icon-button--danger={danger}
	title={label}
	aria-label={label}
	style:width="{size}px"
	style:height="{size}px"
	{onclick}
>
	{@render icon()}
</button>

<style>
	.icon-button {
		display: grid;

		place-items: center;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.icon-button:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.icon-button--danger {
		color: var(--danger);
	}

	.icon-button--danger:hover {
		color: var(--danger);
		background: var(--danger-soft);
	}
</style>
