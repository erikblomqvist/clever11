<script>
	let { size = 14 } = $props();
</script>

<span
	class="spinner"
	style:width="{size}px"
	style:height="{size}px"
	aria-hidden="true"
></span>

<style>
	.spinner {
		display: inline-block;

		border: 2px solid lch(100% 0 0 / 0.1);
		border-top-color: var(--fg-mute);
		border-radius: 50%;

		animation: spin var(--dur-spin) linear infinite;
	}
</style>
