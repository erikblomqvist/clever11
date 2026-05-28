<script>
	let { label = '', hint = '', optional = false, children } = $props();
</script>

<div class="field">
	<div class="field__header">
		<label class="field__label">{label}</label>
		{#if optional}
			<span class="field__optional">optional</span>
		{/if}
		<span class="field__spacer"></span>
		{#if hint}
			<span class="field__hint">{hint}</span>
		{/if}
	</div>
	{@render children()}
</div>

<style>
	.field {
		display: flex;

		flex-direction: column;
		gap: 6px;
	}

	.field__header {
		display: flex;
		align-items: baseline;

		gap: 8px;
	}

	.field__label {
		font-size: 12.5px;
		font-weight: 500;

		color: var(--fg-mute);
	}

	.field__optional {
		font-size: 11px;

		color: var(--fg-faint);
	}

	.field__spacer {
		flex: 1;
	}

	.field__hint {
		font-size: 11px;

		color: var(--fg-faint);
	}
</style>
